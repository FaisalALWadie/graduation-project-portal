"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { taskSchema, commentSchema, taskStatusSchema, type TaskInput } from "@/lib/validations/task";
import { sendNotificationEmail } from "@/lib/email";
import { taskAssignedEmail, taskCreatedEmail, taskStatusChangedEmail } from "@/lib/email-templates";
import {
  getTeamProjectTitle,
  getTeamAdvisorEmail,
  getTeammateEmailsExcludingAdvisor,
} from "@/lib/team-notify";
import { logActivity } from "@/lib/activity";
import type { Database } from "@/types/database";

type TaskStatus = Database["public"]["Enums"]["task_status"];

// RLS already scopes every one of these queries to the caller's own team
// (see supabase/migrations/20260906143303_rls_policies.sql) - a
// cross-team taskId simply matches zero rows at the database layer, it
// is not readable or writable regardless of what this file does. The
// explicit .eq("team_id", ...) filters and affected-row checks below are
// defense-in-depth: they make an unauthorized or mistaken id fail loudly
// with a clear error instead of silently updating zero rows and telling
// the caller it succeeded.

async function assertAssigneeOnTeam(assignedTo: string | null | undefined, teamId: string) {
  if (!assignedTo) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", assignedTo)
    .eq("team_id", teamId)
    .maybeSingle();
  if (!data) throw new Error("That person isn't on your team.");
}

export type AssigneeNotifyResult =
  | { status: "skipped" }
  | { status: "not_applicable" }
  | { status: "sent"; assigneeName: string }
  | { status: "failed"; assigneeName: string; error: string };

// Shared by createTask and updateTask (reassignment) - both fire the
// same "you've been assigned" email under the same explicit opt-in
// checkbox, so the send + result-reporting logic lives in one place.
async function notifyAssignee({
  supabase,
  notify,
  assignedTo,
  actorId,
  actorName,
  teamId,
  taskTitle,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  notify: boolean;
  assignedTo: string | null;
  actorId: string;
  actorName: string;
  teamId: string;
  taskTitle: string;
}): Promise<AssigneeNotifyResult> {
  if (!assignedTo || assignedTo === actorId) return { status: "not_applicable" };
  if (!notify) return { status: "skipped" };

  const { data: assignee } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", assignedTo)
    .maybeSingle();
  if (!assignee?.email) return { status: "not_applicable" };

  const teamName = await getTeamProjectTitle(supabase, teamId);
  const { subject, html } = taskAssignedEmail({
    taskTitle,
    teamName,
    assignerName: actorName,
  });
  const result = await sendNotificationEmail({
    to: assignee.email,
    subject,
    html,
    supabase,
    rateLimitKey: `email:${teamId}`,
  });
  if (!result.success) {
    return { status: "failed", assigneeName: assignee.full_name, error: result.error };
  }
  return { status: "sent", assigneeName: assignee.full_name };
}

export async function createTask(
  input: TaskInput,
  notifyAssigneeFlag: boolean = true,
): Promise<AssigneeNotifyResult> {
  const profile = await requireRole("student");
  const parsed = taskSchema.parse(input);
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");
  await assertAssigneeOnTeam(parsed.assignedTo, profile.team_id);

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    team_id: profile.team_id,
    title: parsed.title,
    description: parsed.description || null,
    priority: parsed.priority,
    assigned_to: parsed.assignedTo || null,
    due_date: parsed.dueDate || null,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/student");

  await logActivity(supabase, {
    teamId: profile.team_id,
    actorId: profile.id,
    actionType: "task_created",
    description: `${profile.full_name} created "${parsed.title}"`,
  });

  const assigneeResult = await notifyAssignee({
    supabase,
    notify: notifyAssigneeFlag,
    assignedTo: parsed.assignedTo ?? null,
    actorId: profile.id,
    actorName: profile.full_name,
    teamId: profile.team_id,
    taskTitle: parsed.title,
  });

  // Broadcast to the rest of the team: everyone except the creator, the
  // advisor (notified separately when a task reaches Review/Completed,
  // not on every creation), and the assignee (who already got the more
  // specific "assigned to you" email above, if that was sent).
  const teamName = await getTeamProjectTitle(supabase, profile.team_id);
  const teammateEmails = await getTeammateEmailsExcludingAdvisor(
    supabase,
    profile.team_id,
    profile.id,
  );
  const broadcastEmails = teammateEmails.filter(
    (email): email is string => !!email && email !== parsed.assignedTo,
  );
  if (broadcastEmails.length > 0) {
    const { subject, html } = taskCreatedEmail({
      taskTitle: parsed.title,
      teamName,
      creatorName: profile.full_name,
    });
    await sendNotificationEmail({
      to: broadcastEmails,
      subject,
      html,
      supabase,
      rateLimitKey: `email:${profile.team_id}`,
    });
  }

  return assigneeResult;
}

export async function updateTask(
  taskId: string,
  input: TaskInput,
  notifyAssigneeFlag: boolean = true,
): Promise<AssigneeNotifyResult> {
  const profile = await requireRole("student");
  const parsed = taskSchema.parse(input);
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");
  await assertAssigneeOnTeam(parsed.assignedTo, profile.team_id);

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("tasks")
    .select("assigned_to")
    .eq("id", taskId)
    .eq("team_id", profile.team_id)
    .maybeSingle();
  if (!before) throw new Error("Task not found.");
  const previousAssignee = before.assigned_to;

  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: parsed.title,
      description: parsed.description || null,
      priority: parsed.priority,
      assigned_to: parsed.assignedTo || null,
      due_date: parsed.dueDate || null,
    })
    .eq("id", taskId)
    .eq("team_id", profile.team_id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Task not found.");
  revalidatePath("/student");

  const newAssignee = parsed.assignedTo || null;
  const wasReassigned = newAssignee !== previousAssignee;
  if (!wasReassigned) return { status: "not_applicable" };

  return notifyAssignee({
    supabase,
    notify: notifyAssigneeFlag,
    assignedTo: newAssignee,
    actorId: profile.id,
    actorName: profile.full_name,
    teamId: profile.team_id,
    taskTitle: parsed.title,
  });
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const profile = await requireRole("student");
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");
  const parsedStatus = taskStatusSchema.parse(status);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: parsedStatus })
    .eq("id", taskId)
    .eq("team_id", profile.team_id)
    .select("id, title");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Task not found.");
  revalidatePath("/student");

  await logActivity(supabase, {
    teamId: profile.team_id,
    actorId: profile.id,
    actionType: "task_status_changed",
    description: `${profile.full_name} moved "${data[0].title}" to ${parsedStatus.replace("_", " ")}`,
  });

  if (parsedStatus === "review" || parsedStatus === "completed") {
    const advisorEmail = await getTeamAdvisorEmail(supabase, profile.team_id);
    if (advisorEmail) {
      const teamName = await getTeamProjectTitle(supabase, profile.team_id);
      const { subject, html } = taskStatusChangedEmail({
        taskTitle: data[0].title,
        newStatus: parsedStatus,
        teamName,
      });
      await sendNotificationEmail({
        to: advisorEmail,
        subject,
        html,
        supabase,
        rateLimitKey: `email:${profile.team_id}`,
      });
    }
  }
}

export async function deleteTask(taskId: string) {
  const profile = await requireRole("student");
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("team_id", profile.team_id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Task not found.");
  revalidatePath("/student");
}

export async function addComment(taskId: string, content: string) {
  const profile = await requireRole("student");
  const parsed = commentSchema.parse({ content });
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("team_id", profile.team_id)
    .maybeSingle();
  if (!task) throw new Error("Task not found.");

  const { error } = await supabase.from("task_comments").insert({
    task_id: taskId,
    author_id: profile.id,
    content: parsed.content,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/student");

  await logActivity(supabase, {
    teamId: profile.team_id,
    actorId: profile.id,
    actionType: "comment_added",
    description: `${profile.full_name} commented on a task`,
  });
}
