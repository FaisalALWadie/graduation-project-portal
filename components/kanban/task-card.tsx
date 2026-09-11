"use client";

import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { getDueUrgency, DUE_TEXT_CLASS } from "@/lib/due-date";
import { PRIORITY_LABEL, type Task, type TeamMember } from "./types";

const PRIORITY_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export function TaskCard({
  task,
  assignee,
  onOpen,
}: {
  task: Task;
  assignee: TeamMember | undefined;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  const urgency = getDueUrgency(task.due_date, task.status);
  const borderAccent =
    urgency === "overdue"
      ? "border-l-4 border-l-destructive"
      : urgency === "soon"
        ? "border-l-4 border-l-amber-500"
        : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`cursor-pointer touch-none rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-900 ${borderAccent} ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <p className="text-sm font-medium">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant={PRIORITY_VARIANT[task.priority]} className="text-xs">
          {PRIORITY_LABEL[task.priority]}
        </Badge>
        {task.due_date && (
          <span className={`text-xs ${DUE_TEXT_CLASS[urgency]}`}>
            Due {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
      {assignee && (
        <p className="mt-2 text-xs text-muted-foreground">{assignee.full_name}</p>
      )}
    </div>
  );
}
