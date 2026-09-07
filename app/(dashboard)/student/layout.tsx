import { requireRole } from "@/lib/auth/require-role";
import { DashboardHeader } from "@/components/dashboard-header";
import { NavTabs } from "@/components/nav-tabs";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("student");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardHeader fullName={profile.full_name} role={profile.role} />
      {profile.team_id && (
        <NavTabs
          items={[
            { href: "/student", label: "Task Board" },
            { href: "/student/documents", label: "Documents" },
            { href: "/student/meetings", label: "Meetings" },
          ]}
        />
      )}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
