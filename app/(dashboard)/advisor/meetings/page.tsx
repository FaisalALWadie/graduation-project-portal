import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { MeetingLogs } from "@/components/team/meeting-logs";

export default async function AdvisorMeetingsPage() {
  const profile = await requireRole("advisor");
  if (!profile.team_id) {
    return (
      <p className="text-sm text-muted-foreground">
        You&apos;re not assigned to a team yet.
      </p>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("meeting_logs")
    .select("*")
    .eq("team_id", profile.team_id)
    .order("meeting_date", { ascending: false });

  return <MeetingLogs logs={data ?? []} canPost />;
}
