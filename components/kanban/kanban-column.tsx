"use client";

import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./task-card";
import type { Task, TeamMember, TaskStatus } from "./types";

export function KanbanColumn({
  id,
  label,
  tasks,
  members,
  onOpenTask,
}: {
  id: TaskStatus;
  label: string;
  tasks: Task[];
  members: TeamMember[];
  onOpenTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border bg-zinc-50 p-3 dark:bg-zinc-950 ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 min-h-24">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            assignee={members.find((m) => m.id === task.assigned_to)}
            onOpen={() => onOpenTask(task)}
          />
        ))}
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No tasks
          </p>
        )}
      </div>
    </div>
  );
}
