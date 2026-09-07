import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DocumentsClient } from "@/components/documents/documents-client";

export default async function AdvisorDocumentsPage() {
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
    .from("documents")
    .select("*, uploader:profiles(full_name)")
    .eq("team_id", profile.team_id)
    .order("created_at", { ascending: false });

  const documents = (data ?? []).map((d) => ({
    ...d,
    uploader_name: d.uploader?.full_name ?? "Unknown",
  }));

  return <DocumentsClient documents={documents} canUpload={false} />;
}
