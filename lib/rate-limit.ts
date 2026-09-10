import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Backed by the check_rate_limit() Postgres function (see
// supabase/migrations/20260910120000_rate_limits.sql) rather than an
// in-memory counter: Vercel serverless functions don't share memory
// across invocations/instances, so an in-process counter would reset
// on every cold start and never actually enforce a limit in
// production. The DB function does one atomic UPSERT per call, so
// concurrent requests can't race past the cap.
export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  key: string,
  maxCount: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_max_count: maxCount,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Fail open: a rate-limit outage should never take down the
    // feature it's guarding.
    console.error("Rate limit check failed:", error);
    return true;
  }
  return data;
}
