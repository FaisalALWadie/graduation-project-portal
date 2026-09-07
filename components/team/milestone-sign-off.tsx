"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { approveMilestone } from "@/lib/actions/advisor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database";

type Milestone = Database["public"]["Tables"]["milestones"]["Row"];

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "outline",
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
};

export function MilestoneSignOff({
  milestones,
  canApprove,
}: {
  milestones: Milestone[];
  canApprove: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleAction(milestoneId: string, status: "approved" | "rejected") {
    startTransition(async () => {
      try {
        await approveMilestone(milestoneId, status);
        toast.success(`Milestone marked ${status}.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update milestone.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {milestones.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">{m.title}</p>
              {m.due_date && (
                <p className="text-xs text-muted-foreground">
                  Due {new Date(m.due_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge>
              {canApprove && m.status === "submitted" && (
                <>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleAction(m.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleAction(m.id, "rejected")}
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
