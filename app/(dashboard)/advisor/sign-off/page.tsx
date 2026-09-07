import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { MilestoneSignOff } from "@/components/team/milestone-sign-off";

export default async function AdvisorSignOffPage() {
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
    .from("milestones")
    .select("*")
    .eq("team_id", profile.team_id)
    .order("due_date");

  return <MilestoneSignOff milestones={data ?? []} canApprove />;
}
