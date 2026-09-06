import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { assignToTeam } from "@/lib/actions/admin";
import { DashboardHeader } from "@/components/dashboard-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const profile = await requireRole("admin");
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, project_title")
    .limit(1)
    .maybeSingle();

  const { data: pendingProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .is("team_id", null)
    .order("created_at", { ascending: true });

  const { data: teamMembers } = team
    ? await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("team_id", team.id)
        .order("role")
    : { data: [] };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardHeader fullName={profile.full_name} role={profile.role} />
      <main className="flex-1 space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Accounts awaiting team assignment</CardTitle>
            <CardDescription>
              New self-registered accounts (students and advisors) land here
              with no team until you assign them — that&apos;s the approval
              step. The badge shows what they picked when they signed up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingProfiles || pendingProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending sign-ups right now.
              </p>
            ) : (
              <ul className="divide-y">
                {pendingProfiles
                  .filter((p) => p.id !== profile.id)
                  .map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{p.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Signed up{" "}
                            {new Date(p.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary">{p.role}</Badge>
                      </div>
                      {team ? (
                        <form action={assignToTeam.bind(null, p.id, team.id)}>
                          <Button type="submit" size="sm">
                            Assign to {team.project_title}
                          </Button>
                        </form>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No team exists yet
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{team?.project_title ?? "No team yet"}</CardTitle>
            <CardDescription>Current team roster</CardDescription>
          </CardHeader>
          <CardContent>
            {!teamMembers || teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <ul className="divide-y">
                {teamMembers.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between py-3"
                  >
                    <span>{m.full_name}</span>
                    <Badge variant="secondary">{m.role}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
