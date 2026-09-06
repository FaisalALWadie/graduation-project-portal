import type { Database } from "@/types/database";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type TeamMember = { id: string; full_name: string; role: string };
export type TaskComment = Database["public"]["Tables"]["task_comments"]["Row"] & {
  author_name: string;
};

export const STATUS_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "completed", label: "Completed" },
];

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
