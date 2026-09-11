import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendNotificationEmail } from "@/lib/email";
import { taskDeadlineReminderEmail } from "@/lib/email-templates";
import { env } from "@/lib/env";

// Safety net: even if the query below somehow matched far more rows
// than expected (a bug, a bulk data import), a single cron run can
// never fire more emails than this.
const MAX_EMAILS_PER_RUN = 100;

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const windowStart = toDateString(addDays(today, 1));
  const windowEnd = toDateString(addDays(today, 2));

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(
      "id, title, due_date, team_id, assigned_to, teams(project_title), profiles!tasks_assigned_to_fkey(email, full_name)",
    )
    .gte("due_date", windowStart)
    .lte("due_date", windowEnd)
    .neq("status", "completed")
    .is("last_reminded_at", null)
    .not("assigned_to", "is", null)
    .limit(MAX_EMAILS_PER_RUN);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  let skippedNoEmail = 0;

  for (const task of tasks ?? []) {
    const assignee = task.profiles as { email: string | null; full_name: string } | null;
    const team = task.teams as { project_title: string } | null;
    if (!assignee?.email || !task.due_date) {
      skippedNoEmail++;
      continue;
    }

    const { subject, html } = taskDeadlineReminderEmail({
      taskTitle: task.title,
      teamName: team?.project_title ?? "Your team",
      dueDate: new Date(task.due_date).toLocaleDateString(),
    });

    const result = await sendNotificationEmail({
      to: assignee.email,
      subject,
      html,
      supabase,
      rateLimitKey: `email:${task.team_id}`,
    });

    if (result.success) {
      sent++;
      await supabase
        .from("tasks")
        .update({ last_reminded_at: new Date().toISOString() })
        .eq("id", task.id);
    } else {
      failed++;
    }
  }

  return NextResponse.json({
    checked: tasks?.length ?? 0,
    sent,
    failed,
    skippedNoEmail,
  });
}
