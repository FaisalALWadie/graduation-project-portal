"use client";

import { useState } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { toast } from "sonner";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { KanbanColumn } from "./kanban-column";
import { TaskDialog } from "./task-dialog";
import { Button } from "@/components/ui/button";
import { STATUS_COLUMNS, type Task, type TeamMember, type TaskStatus } from "./types";

type TaskFilter = "mine" | "all";

export function KanbanBoard({
  initialTasks,
  members,
  currentUserId,
}: {
  initialTasks: Task[];
  members: TeamMember[];
  currentUserId: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>("mine");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const visibleTasks =
    filter === "mine" ? tasks.filter((t) => t.assigned_to === currentUserId) : tasks;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previousTasks = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );

    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (err) {
      setTasks(previousTasks);
      toast.error(
        err instanceof Error ? err.message : "Couldn't move the task. Try again.",
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold">Task Board</h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => setFilter("mine")}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                filter === "mine"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              My Tasks
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Team Tasks
            </button>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            New task
          </Button>
        </div>
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              tasks={visibleTasks.filter((t) => t.status === col.id)}
              members={members}
              onOpenTask={setActiveTask}
            />
          ))}
        </div>
      </DndContext>

      {creating && (
        <TaskDialog
          mode="create"
          members={members}
          onClose={() => setCreating(false)}
          onSaved={(task) => {
            setTasks((prev) => [task, ...prev]);
            setCreating(false);
          }}
        />
      )}

      {activeTask && (
        <TaskDialog
          mode="edit"
          task={activeTask}
          members={members}
          onClose={() => setActiveTask(null)}
          onSaved={(task) => {
            setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
            setActiveTask(null);
          }}
          onDeleted={(taskId) => {
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            setActiveTask(null);
          }}
        />
      )}
    </div>
  );
}
