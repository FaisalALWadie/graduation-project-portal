import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

// Written from the same server action that performs each real change,
// not a separate trigger system - keeps this simple and reliable per
// the spec. Best-effort: a logging failure should never break the
// action that triggered it.
export async function logActivity(
  supabase: Client,
  params: {
    teamId: string;
    actorId: string;
    actionType: string;
    description: string;
  },
) {
  try {
    const { error } = await supabase.from("activity_log").insert({
      team_id: params.teamId,
      actor_id: params.actorId,
      action_type: params.actionType,
      description: params.description,
    });
    if (error) console.error("Failed to log activity:", error.message);
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
