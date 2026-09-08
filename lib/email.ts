import { Resend } from "resend";

// Sandbox sender - works without a verified custom domain (confirmed by
// an actual test send during development). Swap for a verified domain
// address before using this for anything beyond a demo.
const FROM = "Graduation Project Portal <onboarding@resend.dev>";

export function getAppUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// Best-effort: notification emails must never break the action that
// triggered them (a task create/status-change/upload/approval/note
// post should succeed even if Resend is down or rate-limited).
export async function sendNotificationEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set - skipping notification email");
    return;
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) console.error("Resend API error:", error);
  } catch (err) {
    console.error("Failed to send notification email:", err);
  }
}
