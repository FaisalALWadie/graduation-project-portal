import { Resend } from "resend";

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
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<EmailResult> {
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
