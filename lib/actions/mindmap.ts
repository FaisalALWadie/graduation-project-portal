"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { mindmapDataSchema } from "@/lib/validations/mindmap";
import type { Json } from "@/types/database";

// The RPC (not a raw table UPDATE) enforces role=student and
// team_id match server-side - see the update_mindmap migration. This
// requireRole() call is just for a clear client-facing error message;
// the RPC is the real authorization boundary. `data` itself gets no
// such check from the RPC (it's stored as free-form jsonb), so it's
// validated here against the actual node/edge shape the canvas
// produces before it's ever sent - a Server Action is a public
// endpoint regardless of the `Json` TS type, which is erased at
// runtime and enforces nothing against a direct, crafted call.
export async function updateMindmap(teamId: string, data: Json) {
  const profile = await requireRole("student");
  if (profile.team_id !== teamId) throw new Error("That's not your team.");
  const parsed = mindmapDataSchema.parse(data);

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_mindmap", {
    p_team_id: teamId,
    p_data: parsed as Json,
  });
  if (error) throw new Error(error.message);
}
