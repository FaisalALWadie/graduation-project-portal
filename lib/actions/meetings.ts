"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-role";
import { meetingLogSchema, type MeetingLogInput } from "@/lib/validations/meeting";

// Either role on a team can log a meeting (RLS: meetings_insert_team
// checks team_id = get_my_team_id(), no role restriction) - matches
// real usage where either the students or the advisor might be the one
// writing up the notes afterward.
export async function addMeetingLog(input: MeetingLogInput) {
  const profile = await requireProfile();
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");
  const parsed = meetingLogSchema.parse(input);

  const supabase = await createClient();
  const { error } = await supabase.from("meeting_logs").insert({
    team_id: profile.team_id,
    meeting_date: parsed.meetingDate,
    summary: parsed.summary,
    decisions: parsed.decisions || null,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/student/meetings");
  revalidatePath("/advisor/meetings");
}
