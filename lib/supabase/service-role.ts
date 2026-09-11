import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

// Service-role key bypasses RLS entirely - only for trusted server-only
// code with no user session to scope to (e.g. the deadline-reminder
// cron job, which needs to see every team's tasks, not just one
// caller's). Never expose this client or the key to the browser.
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    env.supabaseUrl,
    env.supabaseServiceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
