import { requireRole } from "@/lib/auth/require-role";
import { DashboardHeader } from "@/components/dashboard-header";
import { NavTabs } from "@/components/nav-tabs";

export default async function AdvisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("advisor");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardHeader fullName={profile.full_name} role={profile.role} />
      {profile.team_id && (
        <NavTabs
          items={[
            { href: "/advisor", label: "Overview" },
            { href: "/advisor/documents", label: "Documents" },
            { href: "/advisor/meetings", label: "Meetings" },
            { href: "/advisor/notes", label: "Notes" },
            { href: "/advisor/sign-off", label: "Sign-off" },
          ]}
        />
      )}
      <main className="flex-1 space-y-6 p-6">{children}</main>
    </div>
  );
}
