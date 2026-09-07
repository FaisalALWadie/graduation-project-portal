"use client";

import { useEffect, useRef } from "react";
import Gantt from "frappe-gantt";
import "@/styles/frappe-gantt.css";
import type { Task as KanbanTask, TaskStatus } from "@/components/kanban/types";

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  completed: "#22c55e",
};
const STATUS_COLOR_PROGRESS: Record<TaskStatus, string> = {
  todo: "#cbd5e1",
  in_progress: "#93c5fd",
  review: "#fcd34d",
  completed: "#4ade80",
};
const STATUS_PROGRESS: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 45,
  review: 80,
  completed: 100,
};
// tasks.created_at is when the DB row was inserted, not a meaningful
// "work started" date (bulk-seeded rows all share ~the same insert
// timestamp, which would collapse every bar to a single point far off
// the visible range). Anchor bars on due_date instead and derive a
// plausible duration per status - a display heuristic, not a claim
// about literal history.
const STATUS_DURATION_DAYS: Record<TaskStatus, number> = {
  todo: 6,
  in_progress: 8,
  review: 5,
  completed: 12,
};
const MILESTONE_COLOR = "#a855f7";
const MILESTONE_COLOR_PROGRESS = "#d8b4fe";

type Milestone = {
  title: string;
  due_date: string | null;
  status: string;
};

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ProjectGantt({
  tasks,
  milestones,
}: {
  tasks: KanbanTask[];
  milestones: Milestone[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const taskRows = tasks.map((t) => {
      const end = t.due_date ? new Date(t.due_date) : new Date();
      const start = new Date(
        end.getTime() - STATUS_DURATION_DAYS[t.status] * 86400000,
      );
      return {
        id: t.id,
        name: t.title,
        start: toDateStr(start),
        end: toDateStr(end),
        progress: STATUS_PROGRESS[t.status],
        color: STATUS_COLOR[t.status],
        color_progress: STATUS_COLOR_PROGRESS[t.status],
      };
    });

    const milestoneRows = milestones
      .filter((m) => m.due_date)
      .map((m, i) => {
        const start = new Date(m.due_date!);
        const end = new Date(start.getTime() + 86400000);
        return {
          id: `milestone-${i}`,
          name: `\u{1F3C1} ${m.title} (${m.status})`,
          start: toDateStr(start),
          end: toDateStr(end),
          progress: m.status === "approved" ? 100 : 0,
          color: MILESTONE_COLOR,
          color_progress: MILESTONE_COLOR_PROGRESS,
        };
      });

    const rows = [...taskRows, ...milestoneRows];
    if (rows.length === 0) return;

    containerRef.current.replaceChildren();
    new Gantt(containerRef.current, rows, {
      view_mode: "Month",
      readonly: true,
      infinite_padding: false,
      scroll_to: "start",
    });
  }, [tasks, milestones]);

  if (tasks.length === 0 && milestones.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No tasks or milestones yet.
      </p>
    );
  }

  return <div ref={containerRef} className="gantt-container overflow-x-auto" />;
}
