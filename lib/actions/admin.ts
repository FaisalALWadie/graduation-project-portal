"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";

export async function assignStudentToTeam(profileId: string, teamId: string) {
  await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ team_id: teamId })
    .eq("id", profileId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}
