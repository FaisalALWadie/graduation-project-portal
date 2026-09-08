import { getAppUrl } from "@/lib/email";

function wrapper(title: string, bodyHtml: string, ctaHref: string, ctaLabel = "Open the portal") {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #18181b;">
      <h2 style="font-size: 18px; margin-bottom: 12px;">${title}</h2>
      ${bodyHtml}
      <a href="${getAppUrl()}${ctaHref}" style="display: inline-block; margin-top: 16px; padding: 10px 16px; background: #18181b; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">
        ${ctaLabel}
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
      `<p><strong>${assignerName}</strong> assigned you <strong>${taskTitle}</strong> on the <strong>${teamName}</strong> board.</p>`,
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
      `<p><strong>${taskTitle}</strong> on <strong>${teamName}</strong> was just ${label.toLowerCase()}.</p>`,
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
      `<p><strong>${uploaderName}</strong> uploaded <strong>${documentTitle}</strong> to the ${teamName} documentation vault.</p>`,
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
      `<p>Your advisor marked <strong>${milestoneTitle}</strong> as <strong>${status}</strong>.</p>`,
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
      `<p>${notePreview}</p>`,
      "/student/notes",
    ),
  };
}
