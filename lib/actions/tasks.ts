"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { taskSchema, commentSchema, type TaskInput } from "@/lib/validations/task";
import type { Database } from "@/types/database";

type TaskStatus = Database["public"]["Enums"]["task_status"];

export async function createTask(input: TaskInput) {
  const profile = await requireRole("student");
  const parsed = taskSchema.parse(input);
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");

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
}

export async function updateTask(taskId: string, input: TaskInput) {
  await requireRole("student");
  const parsed = taskSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      title: parsed.title,
      description: parsed.description || null,
      priority: parsed.priority,
      assigned_to: parsed.assignedTo || null,
      due_date: parsed.dueDate || null,
    })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/student");
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  await requireRole("student");
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/student");
}

export async function deleteTask(taskId: string) {
  await requireRole("student");
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/student");
}

export async function addComment(taskId: string, content: string) {
  const profile = await requireRole("student");
  const parsed = commentSchema.parse({ content });
  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").insert({
    task_id: taskId,
    author_id: profile.id,
    content: parsed.content,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/student");
}
