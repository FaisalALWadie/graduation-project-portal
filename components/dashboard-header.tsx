import { GraduationCap } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/search/global-search";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  advisor: "Advisor",
  student: "Student",
};

export function DashboardHeader({
  fullName,
  role,
  teamId,
}: {
  fullName: string;
  role: string;
  teamId?: string | null;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-4 sm:px-6 dark:bg-black">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-4.5 w-4.5" />
        </div>
        <span className="hidden truncate font-heading font-semibold sm:inline">
          Graduation Project Portal
        </span>
        <span className="font-heading font-semibold sm:hidden">GPP</span>
        <Badge variant="secondary">{ROLE_LABEL[role] ?? role}</Badge>
      </div>
      {teamId && (
        <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:px-4">
          <GlobalSearch teamId={teamId} />
        </div>
      )}
      <div className="flex shrink-0 items-center gap-4">
        <span className="hidden truncate text-sm text-muted-foreground sm:inline">
          {fullName}
        </span>
        <ThemeToggle />
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
