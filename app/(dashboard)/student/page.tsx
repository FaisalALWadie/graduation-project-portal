import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StudentDashboardPage() {
  const profile = await requireRole("student");

  if (!profile.team_id) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Welcome, {profile.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Your account isn&apos;t assigned to a team yet. Once your admin
            assigns you, your tasks and project workspace will show up here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const supabase = await createClient();
  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("team_id", profile.team_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("team_id", profile.team_id),
  ]);

  return <KanbanBoard initialTasks={tasks ?? []} members={members ?? []} />;
}
