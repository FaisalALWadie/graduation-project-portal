import { getAppUrl } from "@/lib/email";

// Every value below (task titles, note text, full names, team titles)
// is user-controlled - a student names their own task, an advisor
// writes their own note text, anyone sets their own full_name at
// signup. Escape before interpolating into HTML to prevent HTML
// injection in the rendered email (phishing/spoofed content risk).
function esc(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapper(title: string, bodyHtml: string, ctaHref: string, ctaLabel = "Open the portal") {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #18181b;">
      <h2 style="font-size: 18px; margin-bottom: 12px;">${esc(title)}</h2>
      ${bodyHtml}
      <a href="${getAppUrl()}${ctaHref}" style="display: inline-block; margin-top: 16px; padding: 10px 16px; background: #18181b; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">
        ${esc(ctaLabel)}
      </a>
      <p style="margin-top: 24px; font-size: 12px; color: #71717a;">Graduation Project Management Portal</p>
    </div>
  `;
}

export function taskAssignedEmail({
  taskTitle,
  teamName,
  assignerName,
}: {
  taskTitle: string;
  teamName: string;
  assignerName: string;
}) {
  return {
    subject: `New task assigned: ${taskTitle}`,
    html: wrapper(
      "You've been assigned a new task",
      `<p><strong>${esc(assignerName)}</strong> assigned you <strong>${esc(taskTitle)}</strong> on the <strong>${esc(teamName)}</strong> board.</p>`,
      "/student",
    ),
  };
}

export function taskCreatedEmail({
  taskTitle,
  teamName,
  creatorName,
}: {
  taskTitle: string;
  teamName: string;
  creatorName: string;
}) {
  return {
    subject: `${teamName}: new task added - ${taskTitle}`,
    html: wrapper(
      "A new task was added to the board",
      `<p><strong>${esc(creatorName)}</strong> added <strong>${esc(taskTitle)}</strong> to the <strong>${esc(teamName)}</strong> task board.</p>`,
      "/student",
    ),
  };
}

export function taskDeadlineReminderEmail({
  taskTitle,
  teamName,
  dueDate,
}: {
  taskTitle: string;
  teamName: string;
  dueDate: string;
}) {
  return {
    subject: `Reminder: "${taskTitle}" is due soon`,
    html: wrapper(
      "A task you're assigned to is due soon",
      `<p><strong>${esc(taskTitle)}</strong> on <strong>${esc(teamName)}</strong> is due <strong>${esc(dueDate)}</strong> and isn't marked complete yet.</p>`,
      "/student",
    ),
  };
}

export function taskStatusChangedEmail({
  taskTitle,
  newStatus,
  teamName,
}: {
  taskTitle: string;
  newStatus: string;
  teamName: string;
}) {
  const label = newStatus === "review" ? "moved to Review" : "marked Completed";
  return {
    subject: `${teamName}: "${taskTitle}" ${label}`,
    html: wrapper(
      `A task was ${label}`,
      `<p><strong>${esc(taskTitle)}</strong> on <strong>${esc(teamName)}</strong> was just ${esc(label.toLowerCase())}.</p>`,
      "/advisor",
    ),
  };
}

export function documentUploadedEmail({
  documentTitle,
  teamName,
  uploaderName,
}: {
  documentTitle: string;
  teamName: string;
  uploaderName: string;
}) {
  return {
    subject: `${teamName}: new document uploaded`,
    html: wrapper(
      "A new document was uploaded",
      `<p><strong>${esc(uploaderName)}</strong> uploaded <strong>${esc(documentTitle)}</strong> to the ${esc(teamName)} documentation vault.</p>`,
      "/advisor/documents",
    ),
  };
}

export function milestoneDecisionEmail({
  milestoneTitle,
  status,
  teamName,
}: {
  milestoneTitle: string;
  status: string;
  teamName: string;
}) {
  return {
    subject: `${teamName}: ${milestoneTitle} ${status}`,
    html: wrapper(
      `Milestone ${status}`,
      `<p>Your advisor marked <strong>${esc(milestoneTitle)}</strong> as <strong>${esc(status)}</strong>.</p>`,
      "/student",
    ),
  };
}

export function advisorNoteEmail({
  weekNumber,
  teamName,
  notePreview,
}: {
  weekNumber: number;
  teamName: string;
  notePreview: string;
}) {
  return {
    subject: `${teamName}: new advisor note (Week ${weekNumber})`,
    html: wrapper(
      `New advisor note - Week ${weekNumber}`,
      `<p>${esc(notePreview).replace(/\n/g, "<br>")}</p>`,
      "/student/notes",
    ),
  };
}
