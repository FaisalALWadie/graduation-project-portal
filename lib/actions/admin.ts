"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { createTeamSchema, type CreateTeamInput } from "@/lib/validations/team";

export async function assignToTeam(profileId: string, teamId: string) {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: pendingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("profiles")
    .update({ team_id: teamId })
    .eq("id", profileId);
  if (error) throw new Error(error.message);

  if (pendingProfile.role === "advisor") {
    const { error: advisorError } = await supabase
      .from("teams")
      .update({ advisor_id: profileId })
      .eq("id", teamId);
    if (advisorError) throw new Error(advisorError.message);
  }

  revalidatePath("/admin");
}

export async function removeFromTeam(profileId: string, teamId: string) {
  await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ team_id: null })
    .eq("id", profileId)
    .eq("team_id", teamId);
  if (error) throw new Error(error.message);

  // If they were the team's advisor, clear that too so the team isn't
  // left pointing at someone no longer on it.
  await supabase
    .from("teams")
    .update({ advisor_id: null })
    .eq("id", teamId)
    .eq("advisor_id", profileId);

  revalidatePath("/admin");
  revalidatePath(`/admin/teams/${teamId}`);
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function createTeam(input: CreateTeamInput) {
  await requireRole("admin");
  const parsed = createTeamSchema.parse(input);
  const supabase = await createClient();

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ project_title: parsed.projectTitle })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Milestones are seeded once, never user-created (see the Phase 2
  // RLS design) - the demo team got its 3 fixed milestones from
  // scripts/seed.mjs, but a team created here through the admin UI
  // never went through that script, so it needs the same seeding done
  // here or it would have no milestones at all.
  const { error: milestoneError } = await supabase.from("milestones").insert([
    { team_id: team.id, title: "Project Proposal", due_date: daysFromNow(14) },
    { team_id: team.id, title: "Mid-Progress Review", due_date: daysFromNow(56) },
    { team_id: team.id, title: "Final Defense", due_date: daysFromNow(112) },
  ]);
  if (milestoneError) throw new Error(milestoneError.message);

  revalidatePath("/admin");
}
