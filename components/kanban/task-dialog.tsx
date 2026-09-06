"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { taskSchema, type TaskInput } from "@/lib/validations/task";
import { createTask, updateTask, deleteTask, addComment } from "@/lib/actions/tasks";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Task, TeamMember, TaskComment } from "./types";

export function TaskDialog({
  mode,
  task,
  members,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: "create" | "edit";
  task?: Task;
  members: TeamMember[];
  onClose: () => void;
  onSaved: (task: Task) => void;
  onDeleted?: (taskId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(mode === "edit");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      priority: task?.priority ?? "medium",
      assignedTo: task?.assigned_to ?? null,
      dueDate: task?.due_date ?? "",
    },
  });

  useEffect(() => {
    if (mode !== "edit" || !task) return;
    let cancelled = false;
    async function loadComments() {
      const supabase = createClient();
      const { data } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", task!.id)
        .order("created_at", { ascending: true });
      if (cancelled || !data) return;
      setComments(
        data.map((c) => ({
          ...c,
          author_name:
            members.find((m) => m.id === c.author_id)?.full_name ?? "Unknown",
        })),
      );
      setLoadingComments(false);
    }
    loadComments();
    return () => {
      cancelled = true;
    };
  }, [mode, task, members]);

  function onSubmit(values: TaskInput) {
    startTransition(async () => {
      try {
        if (mode === "create") {
          await createTask(values);
          // The server action doesn't return the row; refetch the newest
          // one via a lightweight optimistic placeholder instead.
          const supabase = createClient();
          const { data } = await supabase
            .from("tasks")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          onSaved(data as Task);
        } else if (task) {
          await updateTask(task.id, values);
          onSaved({
            ...task,
            title: values.title,
            description: values.description || null,
            priority: values.priority,
            assigned_to: values.assignedTo || null,
            due_date: values.dueDate || null,
          });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleDelete() {
    if (!task) return;
    startTransition(async () => {
      try {
        await deleteTask(task.id);
        onDeleted?.(task.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete the task.");
      }
    });
  }

  function handleAddComment() {
    if (!task || !newComment.trim()) return;
    const content = newComment;
    setNewComment("");
    startTransition(async () => {
      try {
        await addComment(task.id, content);
        setComments((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            task_id: task.id,
            author_id: "me",
            author_name: "You",
            content,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        setNewComment(content);
        toast.error(err instanceof Error ? err.message : "Couldn't post comment.");
      }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New task" : "Edit task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned to</Label>
            <Controller
              name="assignedTo"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "unassigned"}
                  onValueChange={(v) =>
                    field.onChange(v === "unassigned" ? null : v)
                  }
                >
                  <SelectTrigger id="assignedTo" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {mode === "edit" ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>

        {mode === "edit" && task && (
          <div className="border-t pt-4">
            <h4 className="mb-2 text-sm font-semibold">Comments</h4>
            <ScrollArea className="max-h-48">
              {loadingComments ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="text-sm">
                      <p className="font-medium">{c.author_name}</p>
                      <p className="text-muted-foreground">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button type="button" onClick={handleAddComment} disabled={isPending}>
                Post
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
