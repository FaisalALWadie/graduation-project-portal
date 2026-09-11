import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { STATUS_COLUMNS, type Task, type TeamMember } from "@/components/kanban/types";

const STATUS_BAR_COLOR: Record<string, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-primary",
  review: "bg-amber-500",
  completed: "bg-emerald-500",
};

export function WorkloadBalance({
  tasks,
  members,
}: {
  tasks: Task[];
  members: TeamMember[];
}) {
  const assignees = members.filter((m) =>
    tasks.some((t) => t.assigned_to === m.id),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workload Balance</CardTitle>
      </CardHeader>
      <CardContent>
        {assignees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No assigned tasks yet"
            description="Once tasks are assigned, each member's workload shows up here."
          />
        ) : (
          <div className="space-y-4">
            {assignees.map((member) => {
              const memberTasks = tasks.filter((t) => t.assigned_to === member.id);
              const openCount = memberTasks.filter((t) => t.status !== "completed").length;
              const total = memberTasks.length;
              return (
                <div key={member.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{member.full_name}</span>
                    <span className="text-muted-foreground">
                      {openCount} open · {total} total
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                    {STATUS_COLUMNS.map((col) => {
                      const count = memberTasks.filter((t) => t.status === col.id).length;
                      if (count === 0 || total === 0) return null;
                      return (
                        <div
                          key={col.id}
                          title={`${col.label}: ${count}`}
                          className={STATUS_BAR_COLOR[col.id]}
                          style={{ width: `${(count / total) * 100}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {STATUS_COLUMNS.map((col) => {
                      const count = memberTasks.filter((t) => t.status === col.id).length;
                      if (count === 0) return null;
                      return (
                        <span key={col.id} className="flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_BAR_COLOR[col.id]}`} />
                          {col.label}: {count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
