import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 40;

function prune(now: number): void {
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

/**
 * Simple fixed-window limiter (per-process). For multi-instance production,
 * replace with Redis/Upstash.
 */
export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  prune(now);

  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, b);
    return true;
  }

  if (b.count >= MAX_REQUESTS) return false;
  b.count += 1;
  return true;
}
