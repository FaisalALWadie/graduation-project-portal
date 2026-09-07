import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { AdvisorNotes } from "@/components/team/advisor-notes";

export default async function AdvisorNotesPage() {
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
    .from("advisor_notes")
    .select("*")
    .eq("team_id", profile.team_id)
    .order("week_number", { ascending: false });

  return <AdvisorNotes notes={data ?? []} canPost />;
}
