type RedisValue = string | number | boolean | null;

type RedisResponse<T> = {
  result?: T;
  error?: string;
};

type SharedRateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, "") || "";
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "";

const isConfigured = Boolean(redisUrl && redisToken);

const fetchRedis = async <T>(command: string, args: RedisValue[] = []): Promise<T | null> => {
  if (!isConfigured) return null;

  try {
    const response = await fetch(redisUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([command, ...args]),
    });

    const payload = (await response.json().catch(() => null)) as RedisResponse<T> | null;
    if (!response.ok || !payload || payload.error) {
      return null;
    }

    return (payload.result ?? null) as T | null;
  } catch {
    return null;
  }
};

export async function getSharedJson<T>(key: string) {
  const rawValue = await fetchRedis<string | null>("GET", [key]);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

export async function setSharedJson<T>(key: string, value: T, ttlMs: number) {
  if (!isConfigured) return false;

  const payload = JSON.stringify(value);
  const result = await fetchRedis<string>("SET", [key, payload, "PX", ttlMs]);
  return result === "OK";
}

export async function deleteSharedKeys(keys: string[]) {
  if (!keys.length) return true;
  const result = await fetchRedis<number>("DEL", keys);
  return typeof result === "number";
}

const fixedWindowScript = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
local ttl = redis.call("PTTL", KEYS[1])
if current > tonumber(ARGV[1]) then
  return {0, current, ttl}
end
return {1, current, ttl}
`;

export async function consumeSharedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<SharedRateLimitResult | null> {
  const result = await fetchRedis<[number, number, number]>("EVAL", [
    fixedWindowScript,
    1,
    key,
    limit,
    windowMs,
  ]);

  if (!Array.isArray(result) || result.length < 3) {
    return null;
  }

  const [allowedFlag, current, ttl] = result;
  const allowed = Number(allowedFlag) === 1;
  const count = Number(current) || 0;
  const ttlMs = Number(ttl);
  const resetAt = Number.isFinite(ttlMs) && ttlMs > 0 ? Date.now() + ttlMs : Date.now() + windowMs;

  return {
    allowed,
    remaining: Math.max(limit - count, 0),
    resetAt,
  };
}
