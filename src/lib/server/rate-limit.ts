import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const ACTION_LIMITS: Record<string, { max: number; windowMs: number }> = {
  tr:   { max: 10, windowMs: 60_000 },
  est:  { max: 10, windowMs: 60_000 },
  save: { max: 20, windowMs: 60_000 },
  del:  { max: 10, windowMs: 60_000 },
};

const DEFAULT_LIMIT = { max: 10, windowMs: 60_000 };

function prune(now: number): void {
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

/**
 * Simple fixed-window limiter (per-process). For multi-instance production,
 * replace with Redis/Upstash.
 *
 * @param key    Rate-limit key (format: "action:ip")
 * @param action Optional action name. If omitted, extracted from the key prefix.
 */
export function checkRateLimit(key: string, action?: string): boolean {
  const resolvedAction = action ?? key.split(":")[0] ?? "";
  const { max, windowMs } = ACTION_LIMITS[resolvedAction] ?? DEFAULT_LIMIT;

  const now = Date.now();
  prune(now);

  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 1, resetAt: now + windowMs };
    buckets.set(key, b);
    return true;
  }

  if (b.count >= max) return false;
  b.count += 1;
  return true;
}
