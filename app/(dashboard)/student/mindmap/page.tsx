import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { MindMapCanvas } from "@/components/mindmap/mind-map-canvas";

export default async function StudentMindMapPage() {
  const profile = await requireRole("student");
  if (!profile.team_id) {
    return (
      <p className="text-sm text-muted-foreground">
        You&apos;re not assigned to a team yet.
      </p>
    );
  }

  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("mindmap_data")
    .eq("id", profile.team_id)
    .single();

  return (
    <MindMapCanvas
      teamId={profile.team_id}
      data={team?.mindmap_data}
      canEdit
    />
  );
}
