// Per-process fixed-window rate limiter.
// Note: serverless instances each have their own bucket — this is a soft cap,
// not a hard one. Swap for Upstash / Vercel KV once abuse is observed.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { ok: true };
}

export const RATE_LIMITS = {
  createPost: { limit: 5, windowMs: 60 * 60 * 1000 },   // 5 posts/hour
  sendMessage: { limit: 60, windowMs: 60 * 60 * 1000 }, // 60 messages/hour
  startThread: { limit: 30, windowMs: 60 * 60 * 1000 }, // 30 new threads/hour
  deletePost: { limit: 30, windowMs: 60 * 60 * 1000 },
  report: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
} as const;
