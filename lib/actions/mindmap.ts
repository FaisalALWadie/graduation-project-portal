"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import type { Json } from "@/types/database";

// The RPC (not a raw table UPDATE) enforces role=student and
// team_id match server-side - see the update_mindmap migration. This
// requireRole() call is just for a clear client-facing error message;
// the RPC is the real authorization boundary.
export async function updateMindmap(teamId: string, data: Json) {
  const profile = await requireRole("student");
  if (profile.team_id !== teamId) throw new Error("That's not your team.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_mindmap", {
    p_team_id: teamId,
    p_data: data,
  });
  if (error) throw new Error(error.message);
}
