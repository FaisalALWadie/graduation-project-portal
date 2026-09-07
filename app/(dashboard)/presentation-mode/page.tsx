import Link from "next/link";
import { requireProfile, roleHome } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { PresentationView } from "@/components/presentation/presentation-view";

export default async function PresentationModePage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const profile = await requireProfile();
  const { team: teamParam } = await searchParams;
  const supabase = await createClient();

  let teamId = profile.team_id;
  if (profile.role === "admin") {
    teamId =
      teamParam ??
      (
        await supabase
          .from("teams")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      ).data?.id ??
      null;
  }

  if (!teamId) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
        <p className="text-sm text-muted-foreground">
          No team to present yet.
        </p>
        <Link href={roleHome(profile.role)} className="text-sm underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const [{ data: team }, { data: tasks }, { data: milestones }, { data: members }] =
    await Promise.all([
      supabase.from("teams").select("project_title").eq("id", teamId).single(),
      supabase.from("tasks").select("*").eq("team_id", teamId),
      supabase
        .from("milestones")
        .select("title, status, due_date")
        .eq("team_id", teamId)
        .order("due_date"),
      supabase
        .from("profiles")
        .select("full_name, role")
        .eq("team_id", teamId),
    ]);

  return (
    <PresentationView
      projectTitle={team?.project_title ?? "Untitled Project"}
      tasks={tasks ?? []}
      milestones={milestones ?? []}
      members={members ?? []}
      exitHref={roleHome(profile.role)}
    />
  );
}
