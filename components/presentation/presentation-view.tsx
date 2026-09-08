"use client";

import { useState } from "react";
import Link from "next/link";
import { Maximize, Minimize, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { TaskStatusChart } from "@/components/charts/task-status-chart";
import { ProjectGantt } from "@/components/gantt/project-gantt";
import { STATUS_COLUMNS, type Task } from "@/components/kanban/types";

const MILESTONE_VARIANT: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "outline",
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
};

export function PresentationView({
  projectTitle,
  tasks,
  milestones,
  members,
  latestSummary,
  exitHref,
}: {
  projectTitle: string;
  tasks: Task[];
  milestones: { title: string; status: string; due_date: string | null }[];
  members: { full_name: string; role: string }[];
  latestSummary: { week_number: number; content: string } | null;
  exitHref: string;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const counts = STATUS_COLUMNS.reduce<Record<string, number>>((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.status === col.id).length;
    return acc;
  }, {});
  const completionPct =
    tasks.length === 0
      ? 0
      : Math.round(((counts.completed ?? 0) / tasks.length) * 100);
  const advisor = members.find((m) => m.role === "advisor");

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <div className="flex items-center justify-between border-b bg-white/80 px-6 py-3 backdrop-blur dark:bg-black/80 print:hidden">
        <span className="text-sm font-medium text-muted-foreground">
          Presentation Mode
        </span>
        <div className="flex gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <Minimize className="size-4" />
            ) : (
              <Maximize className="size-4" />
            )}
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </Button>
          <Link
            href={exitHref}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <X className="size-4" />
            Exit
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-10 px-6 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">{projectTitle}</h1>
          {advisor && (
            <p className="mt-2 text-muted-foreground">
              Supervised by {advisor.full_name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-zinc-900">
            <p className="text-6xl font-bold text-emerald-500">
              {completionPct}%
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tasks completed
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-zinc-900">
            <p className="text-6xl font-bold">{tasks.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">Total tasks</p>
          </div>
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-zinc-900">
            <p className="text-6xl font-bold text-violet-500">
              {milestones.filter((m) => m.status === "approved").length}/
              {milestones.length}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Milestones approved
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold">Task Distribution</h2>
          <TaskStatusChart counts={counts} />
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-zinc-900">
          <h2 className="mb-2 flex items-center justify-between text-lg font-semibold">
            Milestones
          </h2>
          <div className="flex flex-wrap gap-3">
            {milestones.map((m) => (
              <div
                key={m.title}
                className="flex items-center gap-2 rounded-full border px-4 py-2"
              >
                <span className="text-sm font-medium">{m.title}</span>
                <Badge variant={MILESTONE_VARIANT[m.status]}>{m.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold">Project Timeline</h2>
          <ProjectGantt tasks={tasks} milestones={milestones} />
        </div>

        {latestSummary && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold">
              AI Weekly Progress Summary — Week {latestSummary.week_number}
            </h2>
            <p className="whitespace-pre-line text-muted-foreground">
              {latestSummary.content}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
