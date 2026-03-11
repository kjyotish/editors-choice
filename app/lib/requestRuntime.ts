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
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    if (firstIp) return firstIp.trim();
  }

  const realIp = req.headers.get("x-real-ip");
  return realIp?.trim() || "unknown";
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
