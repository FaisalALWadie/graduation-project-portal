"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-role";
import { generateWithGemini } from "@/lib/gemini";
import { STATUS_COLUMNS } from "@/components/kanban/types";

function weeksSince(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(1, Math.ceil(ms / (7 * 86400000)));
}

export async function generateWeeklySummary(teamId: string) {
  const profile = await requireProfile();
  if (profile.role !== "advisor" && profile.role !== "admin") {
    throw new Error("Only the advisor or admin can generate a summary.");
  }
  if (profile.role === "advisor" && profile.team_id !== teamId) {
    throw new Error("That's not your team.");
  }

  const supabase = await createClient();

  const [{ data: team }, { data: tasks }, { data: milestones }] = await Promise.all([
    supabase.from("teams").select("project_title, created_at").eq("id", teamId).single(),
    supabase.from("tasks").select("title, status, priority, due_date, updated_at").eq("team_id", teamId),
    supabase.from("milestones").select("title, status, due_date").eq("team_id", teamId),
  ]);

  if (!team) throw new Error("Team not found.");

  const allTasks = tasks ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const counts = STATUS_COLUMNS.reduce<Record<string, number>>((acc, col) => {
    acc[col.id] = allTasks.filter((t) => t.status === col.id).length;
    return acc;
  }, {});

  const overdue = allTasks.filter(
    (t) => t.due_date && t.due_date < today && t.status !== "completed",
  );
  const dueSoon = allTasks.filter(
    (t) => t.due_date && t.due_date >= today && t.due_date <= in7Days && t.status !== "completed",
  );
  const recentlyUpdated = [...allTasks]
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, 5);

  const prompt = `You are helping a university capstone project advisor understand their team's progress at a glance.

Project: ${team.project_title}

Task status counts: ${STATUS_COLUMNS.map((c) => `${c.label}: ${counts[c.id] ?? 0}`).join(", ")} (${allTasks.length} total)

Overdue tasks (past due date, not completed): ${
    overdue.length === 0 ? "none" : overdue.map((t) => `"${t.title}" (due ${t.due_date}, ${t.priority} priority)`).join("; ")
  }

Due within 7 days: ${
    dueSoon.length === 0 ? "none" : dueSoon.map((t) => `"${t.title}" (due ${t.due_date})`).join("; ")
  }

Milestones: ${milestones && milestones.length > 0 ? milestones.map((m) => `${m.title}: ${m.status}${m.due_date ? ` (due ${m.due_date})` : ""}`).join("; ") : "none"}

Most recently updated tasks: ${
    recentlyUpdated.length === 0 ? "none" : recentlyUpdated.map((t) => `"${t.title}" -> ${t.status}`).join("; ")
  }

Write a short weekly progress summary (plain text, no markdown headers, 4-6 sentences total) covering exactly:
1. What's on track.
2. What's at risk (call out overdue items and any milestone deadlines coming up).
3. One or two concrete, specific recommendations for the advisor or team to act on this week.

Be specific and reference actual task/milestone names above. Do not invent information not given here.`;

  let content: string;
  try {
    content = await generateWithGemini(prompt);
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `Couldn't generate summary: ${err.message}`
        : "Couldn't generate summary right now. Try again in a moment.",
    );
  }

  const weekNumber = weeksSince(team.created_at);
  const { error } = await supabase.from("weekly_summaries").insert({
    team_id: teamId,
    week_number: weekNumber,
    content,
    generated_by: profile.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/advisor");
  revalidatePath("/presentation-mode");
  revalidatePath(`/admin/teams/${teamId}`);
}
