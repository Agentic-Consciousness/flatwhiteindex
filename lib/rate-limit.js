import { supabase } from "./supabase.js";

/**
 * Per-IP-and-key rate limiter backed by Supabase. Vercel Functions are
 * stateless across invocations, so an in-memory Map can't carry counts
 * between cold starts.
 *
 * Schema (migration 007_rate_limits.sql):
 *   CREATE TABLE rate_limit_hits (
 *     key TEXT NOT NULL,
 *     ip TEXT NOT NULL,
 *     hit_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     PRIMARY KEY (key, ip, hit_at)
 *   );
 *   CREATE INDEX rate_limit_hits_lookup ON rate_limit_hits (key, ip, hit_at DESC);
 *
 * @param {string} bucket — logical bucket name (e.g. "subscribe", "webhook")
 * @param {string} ip
 * @param {number} maxPerMinute
 * @returns {Promise<boolean>} true if allowed, false if over limit
 */
export async function rateLimit(bucket, ip, maxPerMinute = 10) {
  if (!ip) return true; // can't enforce without an IP — fail open
  // Callers invoke rateLimit() before their own try/catch, so any throw here
  // (e.g. supabase() when env vars are unset) escapes uncaught and crashes the
  // whole Function as FUNCTION_INVOCATION_FAILED — before the handler can return
  // a graceful error. Fail open on ANY failure so the handler stays in control.
  try {
    const sb = supabase();
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error } = await sb
      .from("rate_limit_hits")
      .select("*", { count: "exact", head: true })
      .eq("key", bucket)
      .eq("ip", ip)
      .gte("hit_at", since);
    if (error) {
      console.warn("rateLimit count error:", error.message);
      return true; // fail open on DB error
    }
    if ((count ?? 0) >= maxPerMinute) return false;
    await sb.from("rate_limit_hits").insert({ key: bucket, ip });
    return true;
  } catch (err) {
    console.warn("rateLimit unavailable, failing open:", err.message);
    return true;
  }
}

/** Read req.ip for Vercel — uses x-real-ip / x-forwarded-for. */
export function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "";
}
