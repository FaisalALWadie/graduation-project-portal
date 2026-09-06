import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  description: z.string().trim().optional(),
  priority: z.enum(["low", "medium", "high"]),
  assignedTo: z.uuid().nullable().optional(),
  dueDate: z.string().optional(),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const commentSchema = z.object({
  content: z.string().trim().min(1, "Comment can't be empty"),
});
export type CommentInput = z.infer<typeof commentSchema>;
