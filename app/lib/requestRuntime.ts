type MemoryEntry<T> = {
  value: T;
  expiresAt: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const memoryCacheStore = new Map<string, MemoryEntry<unknown>>();
const rateLimitStore = new Map<string, RateLimitEntry>();

export function getClientIp(req: Request) {
  // These headers are injected by managed edge proxies (Vercel/Cloudflare).
  // Never accept X-Forwarded-For or X-Real-IP: clients can supply both.
  const platformIp = req.headers.get("x-vercel-forwarded-for") || req.headers.get("cf-connecting-ip");
  return platformIp?.trim() || "unknown";
}

type SharedRateLimitOptions = {
  /**
   * Use the process-local limiter only after an endpoint has authenticated a
   * privileged caller. This keeps internal admin workflows available if Redis
   * is temporarily unavailable without weakening public endpoints.
   */
  fallbackToMemory?: boolean;
};

export async function enforceSharedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  options: SharedRateLimitOptions = {},
) {
  const { consumeSharedRateLimit } = await import("@/app/lib/upstashStore");
  const result = await consumeSharedRateLimit(key, limit, windowMs);
  // Sensitive endpoints fail closed when a shared limiter is unavailable. This
  // prevents per-instance in-memory fallbacks from being bypassed by scaling.
  if (!result && options.fallbackToMemory) {
    const fallback = consumeRateLimit(key, limit, windowMs);
    return { ...fallback, status: fallback.allowed ? 200 : 429 };
  }
  if (!result) return { allowed: false, status: 503, remaining: 0, resetAt: Date.now() + windowMs };
  return { ...result, status: result.allowed ? 200 : 429 };
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      resetAt,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(limit - current.count, 0),
    resetAt: current.resetAt,
  };
}

export function getCachedValue<T>(key: string) {
  const current = memoryCacheStore.get(key) as MemoryEntry<T> | undefined;
  if (!current) return null;

  if (current.expiresAt <= Date.now()) {
    memoryCacheStore.delete(key);
    return null;
  }

  return current.value;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number) {
  memoryCacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function buildJsonResponse<T>(
  data: T,
  init?: ResponseInit,
  cacheControl?: string,
) {
  const headers = new Headers(init?.headers);
  if (cacheControl) {
    headers.set("Cache-Control", cacheControl);
  }
  return Response.json(data, {
    ...init,
    headers,
  });
}
