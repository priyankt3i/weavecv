import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type RateLimitOptions = {
  prefix: string;
  limit: number;
  window: string;
};

const limiterCache = new Map<string, Ratelimit>();
let warnedMissingEnv = false;

const getLimiter = (options: RateLimitOptions): Ratelimit | null => {
  const { prefix, limit, window } = options;
  const cacheKey = `${prefix}:${limit}:${window}`;

  if (limiterCache.has(cacheKey)) {
    return limiterCache.get(cacheKey)!;
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!warnedMissingEnv) {
      warnedMissingEnv = true;
      console.warn("Upstash env vars are missing; rate limiting is disabled.");
    }
    return null;
  }

  const redis = Redis.fromEnv();
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix,
  });

  limiterCache.set(cacheKey, ratelimit);
  return ratelimit;
};

const getClientId = (req: VercelRequest): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0]?.trim();
  return ip || req.socket.remoteAddress || "unknown";
};

export const enforceRateLimit = async (
  req: VercelRequest,
  res: VercelResponse,
  options: RateLimitOptions
): Promise<boolean> => {
  const limiter = getLimiter(options);
  if (!limiter) {
    return true;
  }

  const identifier = getClientId(req);
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", reset);

  if (!success) {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return false;
  }

  return true;
};
