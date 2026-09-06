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
    <header className="flex items-center justify-between border-b bg-white px-6 py-4 dark:bg-black">
      <div className="flex items-center gap-3">
        <span className="font-semibold">Graduation Project Portal</span>
        <Badge variant="secondary">{ROLE_LABEL[role] ?? role}</Badge>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{fullName}</span>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
