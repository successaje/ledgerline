import "server-only";

/**
 * In-memory rate limits for the public write endpoints. Per serverless instance, which is enough to stop
 * casual abuse of the gas-paying relayer; a shared store (Upstash/Redis) is the upgrade path for multi-instance.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function hit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  if (b.count >= limit) return { ok: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  b.count++;
  return { ok: true, remaining: limit - b.count, retryAfterSec: 0 };
}

// Opportunistic cleanup so the map cannot grow without bound on a long-lived instance.
setInterval(() => { const now = Date.now(); for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k); }, 60_000).unref?.();

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
