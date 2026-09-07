"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { removeFromTeam } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function RemoveFromTeamButton({
  profileId,
  teamId,
}: {
  profileId: string;
  teamId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      try {
        await removeFromTeam(profileId, teamId);
        toast.success("Removed from team.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove.");
      }
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={handleRemove}
    >
      Remove
    </Button>
  );
}
