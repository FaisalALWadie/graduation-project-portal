import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard-header";
import { CreateTeamDialog } from "@/components/team/create-team-dialog";
import { AssignToTeamForm } from "@/components/team/assign-to-team-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const profile = await requireRole("admin");
  const supabase = await createClient();

  const [{ data: teams }, { data: pendingProfiles }, { data: memberCounts }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, project_title, advisor_id")
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, role, created_at")
        .is("team_id", null)
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, team_id").not("team_id", "is", null),
    ]);

  const countByTeam = (memberCounts ?? []).reduce<Record<string, number>>(
    (acc, p) => {
      acc[p.team_id!] = (acc[p.team_id!] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardHeader fullName={profile.full_name} role={profile.role} />
      <main className="flex-1 space-y-6 p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Teams</CardTitle>
              <CardDescription>All capstone teams in the portal</CardDescription>
            </div>
            <CreateTeamDialog />
          </CardHeader>
          <CardContent>
            {!teams || teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No teams yet. Create one to get started.
              </p>
            ) : (
              <ul className="divide-y">
                {teams.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium">{t.project_title}</p>
                      <p className="text-sm text-muted-foreground">
                        {countByTeam[t.id] ?? 0} member(s)
                        {!t.advisor_id && " · no advisor assigned"}
                      </p>
                    </div>
                    <Link
                      href={`/admin/teams/${t.id}`}
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accounts awaiting team assignment</CardTitle>
            <CardDescription>
              New self-registered accounts (students and advisors) land
              here with no team until you assign them — that&apos;s the
              approval step. The badge shows what they picked when they
              signed up.
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
                      <AssignToTeamForm profileId={p.id} teams={teams ?? []} />
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
