import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Request throttling, keyed per user (per IP for unauthenticated callers).
 *
 * Backed by Upstash Redis so the state is shared across instances. The previous
 * implementation kept buckets in a module-level Map, which on a serverless or
 * multi-instance deployment means every instance starts with an empty bucket
 * and the limit effectively never applies.
 *
 * Limits are cost-weighted rather than per-request: a pipeline run can fan out
 * into a dozen paid Sarvam calls, while a profile read hits our own database.
 * Charging both "one request" would under-protect the expensive one.
 */

const WINDOW = '60 s';
const TOKENS_PER_WINDOW = Number(process.env.RATE_LIMIT_TOKENS_PER_MIN || 120);

function buildLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(TOKENS_PER_WINDOW, WINDOW),
    prefix: 'pravah:rl',
    analytics: false,
  });
}

const globalForRateLimit = globalThis as unknown as {
  pravahRateLimiter?: Ratelimit | null;
  pravahLocalBuckets?: Map<string, { tokens: number; lastRefill: number }>;
};

const limiter =
  globalForRateLimit.pravahRateLimiter !== undefined
    ? globalForRateLimit.pravahRateLimiter
    : (globalForRateLimit.pravahRateLimiter = buildLimiter());

if (!limiter && process.env.NODE_ENV === 'production') {
  console.error(
    '[rateLimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. ' +
      'Rate limiting is running in per-instance memory mode and will NOT hold across instances.'
  );
}

/**
 * Local fallback used only when Upstash is not configured (typically local dev).
 * Same token-bucket shape as the limiter it replaces — good enough to exercise
 * the code path, explicitly not a production control.
 */
function localConsume(key: string, cost: number): { success: boolean; remaining: number } {
  const buckets =
    globalForRateLimit.pravahLocalBuckets ??
    (globalForRateLimit.pravahLocalBuckets = new Map());

  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: TOKENS_PER_WINDOW, lastRefill: now };

  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    bucket.tokens = Math.min(
      bucket.tokens + (elapsed / 60_000) * TOKENS_PER_WINDOW,
      TOKENS_PER_WINDOW
    );
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= cost) {
    bucket.tokens -= cost;
    buckets.set(key, bucket);
    return { success: true, remaining: Math.floor(bucket.tokens) };
  }

  buckets.set(key, bucket);
  return { success: false, remaining: Math.floor(bucket.tokens) };
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset?: number;
}

/**
 * Consume `cost` tokens for `identifier`. Returns success=false when the caller
 * has exhausted their allowance for the current window.
 */
export async function consumeRateLimit(
  identifier: string,
  cost = 1
): Promise<RateLimitResult> {
  if (!limiter) {
    return localConsume(identifier, cost);
  }

  try {
    const res = await limiter.limit(identifier, { rate: cost });
    return { success: res.success, remaining: res.remaining, reset: res.reset };
  } catch (error) {
    // Never let a Redis outage take the whole API down; fall back to the local
    // bucket so there is still some backpressure, and make the failure visible.
    console.error('[rateLimit] Upstash unavailable, falling back to local bucket:', error);
    return localConsume(identifier, cost);
  }
}

/**
 * Best-effort client IP. Only used for unauthenticated callers — for logged-in
 * requests we key on the user id, which a client cannot forge, because
 * X-Forwarded-For is attacker-controlled unless a trusted proxy overwrites it.
 */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
