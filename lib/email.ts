import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { checkRateLimit } from "@/lib/rate-limit";

// Sandbox sender - works without a verified custom domain (confirmed by
// an actual test send during development). Swap for a verified domain
// address before using this for anything beyond a demo.
const FROM = "Graduation Project Portal <onboarding@resend.dev>";

export function getAppUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export type EmailResult = { success: true } | { success: false; error: string };

// Best-effort in the sense that a failed send never throws and never
// breaks the action that triggered it (a task create/status-change/
// upload/approval/note post should succeed even if Resend is down or
// rate-limited) - but callers that surface delivery status to a user
// (e.g. an explicit "notify team" action) should inspect the returned
// result instead of assuming the email went out.
export async function sendNotificationEmail({
  to,
  subject,
  html,
  supabase,
  rateLimitKey,
  rateLimitMax = 30,
  rateLimitWindowSeconds = 3600,
}: {
  to: string | string[];
  subject: string;
  html: string;
  // Pass supabase + rateLimitKey (typically `email:${teamId}`) to cap
  // how many notification emails one team can trigger - every caller
  // here fires on a real user action (note posted, task created, etc)
  // rather than a fixed batch, so without a cap a team could be used
  // to spam Resend by repeating that action.
  supabase?: SupabaseClient<Database>;
  rateLimitKey?: string;
  rateLimitMax?: number;
  rateLimitWindowSeconds?: number;
}): Promise<EmailResult> {
  if (supabase && rateLimitKey) {
    const allowed = await checkRateLimit(supabase, rateLimitKey, rateLimitMax, rateLimitWindowSeconds);
    if (!allowed) {
      return {
        success: false,
        error: "This team has sent a lot of notification emails recently - try again later.",
      };
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set - skipping notification email");
    return { success: false, error: "Email is not configured on this server." };
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("Failed to send notification email:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown email error.",
    };
  }
}
