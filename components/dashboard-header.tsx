import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  advisor: "Advisor",
  student: "Student",
};

export function DashboardHeader({
  fullName,
  role,
}: {
  fullName: string;
  role: string;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b bg-white px-4 py-4 sm:px-6 dark:bg-black">
      <div className="flex min-w-0 items-center gap-3">
        <span className="hidden truncate font-semibold sm:inline">
          Graduation Project Portal
        </span>
        <span className="font-semibold sm:hidden">GPP</span>
        <Badge variant="secondary">{ROLE_LABEL[role] ?? role}</Badge>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="hidden truncate text-sm text-muted-foreground sm:inline">
          {fullName}
        </span>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
