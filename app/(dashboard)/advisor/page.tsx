import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { TeamProgress } from "@/components/team/team-progress";
import { ExportPdfButton } from "@/components/team/export-pdf-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdvisorDashboardPage() {
  const profile = await requireRole("advisor");

  if (!profile.team_id) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Welcome, {profile.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            You&apos;re not assigned to a team yet. Once your admin assigns
            you, this team&apos;s progress will show up here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const supabase = await createClient();
  const [{ data: team }, { data: tasks }, { data: members }, { data: milestones }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("project_title")
        .eq("id", profile.team_id)
        .single(),
      supabase.from("tasks").select("*").eq("team_id", profile.team_id),
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("team_id", profile.team_id),
      supabase
        .from("milestones")
        .select("title, status, due_date")
        .eq("team_id", profile.team_id)
        .order("due_date"),
    ]);

  return (
    <>
      <div className="flex items-center justify-end">
        <ExportPdfButton
          projectTitle={team?.project_title ?? "Team Summary"}
          advisorName={profile.full_name}
          tasks={tasks ?? []}
          milestones={milestones ?? []}
        />
      </div>
      <TeamProgress
        projectTitle={team?.project_title ?? "Team"}
        tasks={tasks ?? []}
        members={members ?? []}
      />
    </>
  );
}
