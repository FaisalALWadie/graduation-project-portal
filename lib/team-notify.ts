import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function getTeamProjectTitle(supabase: Client, teamId: string) {
  const { data } = await supabase
    .from("teams")
    .select("project_title")
    .eq("id", teamId)
    .maybeSingle();
  return data?.project_title ?? "Your team";
}

export async function getTeamAdvisorEmail(supabase: Client, teamId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("team_id", teamId)
    .eq("role", "advisor")
    .maybeSingle();
  return data?.email ?? null;
}

export async function getTeamMemberEmails(supabase: Client, teamId: string, excludeId?: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("team_id", teamId);
  return (data ?? [])
    .filter((p) => p.id !== excludeId)
    .map((p) => p.email);
}
