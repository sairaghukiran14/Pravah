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
function isPrivateIp(ip: string): boolean {
  if (ip === 'localhost' || ip === '::1' || ip === 'unknown') return true;

  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true; // Link-local
  }

  if (ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) return true;

  return false;
}

export function clientIpFrom(headers: Headers): string {
  // x-real-ip is set by the edge proxy (Vercel, Cloudflare, etc.) and is not
  // spoofable because the edge proxy overwrites it. X-Forwarded-For can be
  // pre-pended with arbitrary IP values by the client.
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map((ip) => ip.trim()).filter(Boolean);
    // Traverse from right to left, skipping trusted private IP ranges to find the
    // actual client IP, preventing client-injected spoofed IPs.
    for (let i = ips.length - 1; i >= 0; i--) {
      const ip = ips[i]!;
      if (!isPrivateIp(ip)) {
        return ip;
      }
    }
    // Fallback to the first address if all IPs are private.
    if (ips.length > 0) return ips[0]!;
  }
  return 'unknown';
}
