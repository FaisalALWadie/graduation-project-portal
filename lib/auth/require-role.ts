import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Role = Database["public"]["Enums"]["user_role"];

export function roleHome(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "advisor":
      return "/advisor";
    case "student":
      return "/student";
    default:
      return "/login";
  }
}

// Server Components render on the server but Next 16's Proxy is not a
// substitute for per-route authorization (see proxy.md: "verify
// authentication and authorization inside each Server Function rather
// than relying on Proxy alone"). This is the hard check; the middleware
// redirect is only a UX convenience layer on top of it.
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return profile;
}

export async function requireRole(role: Role) {
  const profile = await requireProfile();
  if (profile.role !== role) {
    redirect(roleHome(profile.role));
  }
  return profile;
}
