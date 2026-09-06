"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";

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
