import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard-header";
import { TeamProgress } from "@/components/team/team-progress";
import { MilestoneSignOff } from "@/components/team/milestone-sign-off";
import { AdvisorNotes } from "@/components/team/advisor-notes";
import { MeetingLogs } from "@/components/team/meeting-logs";
import { DocumentsClient } from "@/components/documents/documents-client";
import { WeeklySummary } from "@/components/team/weekly-summary";
import { MindMapCanvas } from "@/components/mindmap/mind-map-canvas";
import { RemoveFromTeamButton } from "@/components/team/remove-from-team-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminTeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const profile = await requireRole("admin");
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, project_title, mindmap_data")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) notFound();

  const [
    { data: members },
    { data: tasks },
    { data: milestones },
    { data: notes },
    { data: documents },
    { data: meetingLogs },
    { data: summaries },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("team_id", teamId),
    supabase.from("tasks").select("*").eq("team_id", teamId),
    supabase
      .from("milestones")
      .select("*")
      .eq("team_id", teamId)
      .order("due_date"),
    supabase
      .from("advisor_notes")
      .select("*")
      .eq("team_id", teamId)
      .order("week_number", { ascending: false }),
    supabase
      .from("documents")
      .select("*, uploader:profiles(full_name)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false }),
    supabase
      .from("meeting_logs")
      .select("*")
      .eq("team_id", teamId)
      .order("meeting_date", { ascending: false }),
    supabase
      .from("weekly_summaries")
      .select("*")
      .eq("team_id", teamId)
      .order("week_number", { ascending: false }),
  ]);

  const documentsWithUploader = (documents ?? []).map((d) => ({
    ...d,
    uploader_name: d.uploader?.full_name ?? "Unknown",
  }));

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardHeader fullName={profile.full_name} role={profile.role} />
      <main className="flex-1 space-y-6 p-6">
        <Link href="/admin" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to teams
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Team roster</CardTitle>
          </CardHeader>
          <CardContent>
            {!members || members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <ul className="divide-y">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span>{m.full_name}</span>
                      <Badge variant="secondary">{m.role}</Badge>
                    </div>
                    <RemoveFromTeamButton profileId={m.id} teamId={team.id} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <TeamProgress
          projectTitle={team.project_title}
          tasks={tasks ?? []}
          members={members ?? []}
        />

        <MilestoneSignOff milestones={milestones ?? []} canApprove />

        <AdvisorNotes notes={notes ?? []} canPost={false} />

        <MeetingLogs logs={meetingLogs ?? []} canPost={false} />

        <DocumentsClient documents={documentsWithUploader} canUpload={false} />

        <WeeklySummary teamId={team.id} summaries={summaries ?? []} canGenerate />

        <MindMapCanvas teamId={team.id} data={team.mindmap_data} canEdit={false} />
      </main>
    </div>
  );
}
