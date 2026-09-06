import { requireRole } from "@/lib/auth/require-role";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdvisorDashboardPage() {
  const profile = await requireRole("advisor");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardHeader fullName={profile.full_name} role={profile.role} />
      <main className="flex-1 p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Welcome, {profile.full_name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Your read-only team overview, Advisor Notes, and milestone
              sign-off arrive in Phase 5.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
