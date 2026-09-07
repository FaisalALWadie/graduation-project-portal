"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireProfile } from "@/lib/auth/require-role";
import { advisorNoteSchema, type AdvisorNoteInput } from "@/lib/validations/advisor";

export async function addAdvisorNote(input: AdvisorNoteInput) {
  const profile = await requireRole("advisor");
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");
  const parsed = advisorNoteSchema.parse(input);

  const supabase = await createClient();
  const { error } = await supabase.from("advisor_notes").insert({
    team_id: profile.team_id,
    advisor_id: profile.id,
    week_number: parsed.weekNumber,
    note: parsed.note,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/advisor/notes");
}

// Admin can also approve/reject (the RPC itself checks this - see
// approve_milestone in the Phase 2 migration); requireProfile() here
// just ensures the caller is authenticated, the RPC enforces the real
// authorization (advisor assigned to that team, or admin).
export async function approveMilestone(milestoneId: string, newStatus: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_milestone", {
    milestone_id: milestoneId,
    new_status: newStatus,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/advisor/sign-off");
  revalidatePath("/admin");
}
