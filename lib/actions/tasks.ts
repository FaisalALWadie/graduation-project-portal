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

export async function createTask(input: TaskInput) {
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

  const teamName = await getTeamProjectTitle(supabase, profile.team_id);

  let assigneeEmail: string | null = null;
  if (parsed.assignedTo && parsed.assignedTo !== profile.id) {
    const { data: assignee } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", parsed.assignedTo)
      .maybeSingle();
    if (assignee?.email) {
      assigneeEmail = assignee.email;
      const { subject, html } = taskAssignedEmail({
        taskTitle: parsed.title,
        teamName,
        assignerName: profile.full_name,
      });
      await sendNotificationEmail({
        to: assignee.email,
        subject,
        html,
        supabase,
        rateLimitKey: `email:${profile.team_id}`,
      });
    }
  }

  // Broadcast to the rest of the team: everyone except the creator, the
  // advisor (notified separately when a task reaches Review/Completed,
  // not on every creation), and the assignee (who already got the more
  // specific "assigned to you" email above).
  const teammateEmails = await getTeammateEmailsExcludingAdvisor(
    supabase,
    profile.team_id,
    profile.id,
  );
  const broadcastEmails = teammateEmails.filter(
    (email): email is string => !!email && email !== assigneeEmail,
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
}

export async function updateTask(taskId: string, input: TaskInput) {
  const profile = await requireRole("student");
  const parsed = taskSchema.parse(input);
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");
  await assertAssigneeOnTeam(parsed.assignedTo, profile.team_id);

  const supabase = await createClient();
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
