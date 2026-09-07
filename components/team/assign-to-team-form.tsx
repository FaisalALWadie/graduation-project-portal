"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { assignToTeam } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AssignToTeamForm({
  profileId,
  teams,
}: {
  profileId: string;
  teams: { id: string; project_title: string }[];
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  function handleAssign() {
    if (!teamId) return;
    startTransition(async () => {
      try {
        await assignToTeam(profileId, teamId);
        toast.success("Assigned.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't assign.");
      }
    });
  }

  if (teams.length === 0) {
    return <span className="text-sm text-muted-foreground">No team exists yet</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {teams.length > 1 && (
        <Select value={teamId} onValueChange={(v) => setTeamId(v ?? "")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.project_title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button size="sm" disabled={isPending} onClick={handleAssign}>
        Assign{teams.length === 1 ? ` to ${teams[0].project_title}` : ""}
      </Button>
    </div>
  );
}
