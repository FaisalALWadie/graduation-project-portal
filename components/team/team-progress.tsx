import { ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskStatusChart } from "@/components/charts/task-status-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { getDueUrgency, DUE_TEXT_CLASS } from "@/lib/due-date";
import { STATUS_COLUMNS, PRIORITY_LABEL, type Task, type TeamMember } from "@/components/kanban/types";

export function TeamProgress({
  projectTitle,
  tasks,
  members,
}: {
  projectTitle: string;
  tasks: Task[];
  members: TeamMember[];
}) {
  const counts = STATUS_COLUMNS.reduce<Record<string, number>>((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.status === col.id).length;
    return acc;
  }, {});
  const completionPct =
    tasks.length === 0
      ? 0
      : Math.round(((counts.completed ?? 0) / tasks.length) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{projectTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col items-center justify-center">
            <p className="text-4xl font-bold">{completionPct}%</p>
            <p className="text-sm text-muted-foreground">tasks completed</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {counts.completed ?? 0} of {tasks.length} tasks
            </p>
          </div>
          <TaskStatusChart counts={counts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <EmptyState icon={ListTodo} title="No tasks yet" />
          ) : (
            <div className="divide-y">
              {tasks.map((task) => {
                const assignee = members.find((m) => m.id === task.assigned_to);
                const statusLabel = STATUS_COLUMNS.find(
                  (c) => c.id === task.status,
                )?.label;
                const urgency = getDueUrgency(task.due_date, task.status);
                const borderAccent =
                  urgency === "overdue"
                    ? "border-l-4 border-l-destructive"
                    : urgency === "soon"
                      ? "border-l-4 border-l-amber-500"
                      : "";
                return (
                  <div
                    key={task.id}
                    className={`flex flex-wrap items-center justify-between gap-2 py-3 pl-3 ${borderAccent}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignee?.full_name ?? "Unassigned"}
                        {task.due_date && (
                          <span className={DUE_TEXT_CLASS[urgency]}>
                            {" "}
                            · Due {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{statusLabel}</Badge>
                      <Badge variant="secondary">
                        {PRIORITY_LABEL[task.priority]}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
