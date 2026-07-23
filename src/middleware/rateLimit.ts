import { NextRequest } from 'next/server';

/**
 * Simple in‑memory token‑bucket rate limiter.
 * Limits are driven by environment variables:
 *   SARVAM_MAX_REQ_PER_MIN – total allowed requests per minute (default 30)
 *   SARVAM_BURST_CAPACITY – extra burst tokens allowed (default 5)
 *
 * This implementation is per‑IP (or per‑user if you prefer auth ID).
 * For a production multi‑instance deployment you would replace this with a
 * distributed store (Redis, Memcached, etc.).
 */
type Bucket = {
  tokens: number;
  lastRefill: number; // timestamp in ms
};

// In‑memory map of identifier → bucket (IP address by default)
const buckets = new Map<string, Bucket>();

function getEnvInt(name: string, fallback: number): number {
  const val = process.env[name];
  const parsed = Number(val);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const MAX_REQ_PER_MIN = getEnvInt('SARVAM_MAX_REQ_PER_MIN', 30);
const BURST_CAPACITY = getEnvInt('SARVAM_BURST_CAPACITY', 5);
const REFILL_INTERVAL_MS = 60_000; // 1 minute

/**
 * Checks the request against the token bucket. Returns `true` if the request
 * should be rejected (i.e., rate limit exceeded).
 */
export async function rateLimit(req: NextRequest): Promise<boolean> {
  const ip =
    (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.ip) || 'unknown';

  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: MAX_REQ_PER_MIN + BURST_CAPACITY, lastRefill: now };
    buckets.set(ip, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    const refillTokens = (elapsed / REFILL_INTERVAL_MS) * MAX_REQ_PER_MIN;
    bucket.tokens = Math.min(
      bucket.tokens + refillTokens,
      MAX_REQ_PER_MIN + BURST_CAPACITY
    );
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return false; // request allowed
  }

  return true; // rate limit exceeded
}
