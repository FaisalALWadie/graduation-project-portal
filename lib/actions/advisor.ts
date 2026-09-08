"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireProfile } from "@/lib/auth/require-role";
import { advisorNoteSchema, type AdvisorNoteInput } from "@/lib/validations/advisor";
import { sendNotificationEmail } from "@/lib/email";
import { milestoneDecisionEmail, advisorNoteEmail } from "@/lib/email-templates";
import { getTeamProjectTitle, getTeamMemberEmails } from "@/lib/team-notify";
import { logActivity } from "@/lib/activity";

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
  revalidatePath("/student/notes");

  await logActivity(supabase, {
    teamId: profile.team_id,
    actorId: profile.id,
    actionType: "note_posted",
    description: `${profile.full_name} posted a Week ${parsed.weekNumber} advisor note`,
  });

  const teamName = await getTeamProjectTitle(supabase, profile.team_id);
  const memberEmails = await getTeamMemberEmails(supabase, profile.team_id, profile.id);
  if (memberEmails.length > 0) {
    const { subject, html } = advisorNoteEmail({
      weekNumber: parsed.weekNumber,
      teamName,
      notePreview: parsed.note,
    });
    await sendNotificationEmail({ to: memberEmails, subject, html });
  }
}

// Admin can also approve/reject (the RPC itself checks this - see
// approve_milestone in the Phase 2 migration); requireProfile() here
// just ensures the caller is authenticated, the RPC enforces the real
// authorization (advisor assigned to that team, or admin).
export async function approveMilestone(milestoneId: string, newStatus: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("approve_milestone", {
    milestone_id: milestoneId,
    new_status: newStatus,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/advisor/sign-off");
  revalidatePath("/admin");

  if (data?.team_id) {
    await logActivity(supabase, {
      teamId: data.team_id,
      actorId: profile.id,
      actionType: "milestone_approved",
      description: `${profile.full_name} marked "${data.title}" as ${newStatus}`,
    });

    const teamName = await getTeamProjectTitle(supabase, data.team_id);
    const memberEmails = await getTeamMemberEmails(supabase, data.team_id, profile.id);
    if (memberEmails.length > 0) {
      const { subject, html } = milestoneDecisionEmail({
        milestoneTitle: data.title,
        status: newStatus,
        teamName,
      });
      await sendNotificationEmail({ to: memberEmails, subject, html });
    }
  }
}
