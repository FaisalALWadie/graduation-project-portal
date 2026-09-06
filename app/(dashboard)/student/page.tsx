import { requireRole } from "@/lib/auth/require-role";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StudentDashboardPage() {
  const profile = await requireRole("student");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardHeader fullName={profile.full_name} role={profile.role} />
      <main className="flex-1 p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Welcome, {profile.full_name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {profile.team_id ? (
              <p>
                You&apos;re on your project team. The Kanban board, documents,
                and meeting logs arrive in Phase 4.
              </p>
            ) : (
              <p>
                Your account isn&apos;t assigned to a team yet. Once your
                admin assigns you, your tasks and project workspace will show
                up here.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
