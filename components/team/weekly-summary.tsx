"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateWeeklySummary } from "@/lib/actions/summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database";

type Summary = Database["public"]["Tables"]["weekly_summaries"]["Row"];

export function WeeklySummary({
  teamId,
  summaries,
  canGenerate,
}: {
  teamId: string;
  summaries: Summary[];
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      try {
        await generateWeeklySummary(teamId);
        toast.success("Summary generated.");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't generate summary.",
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI Weekly Progress Summary</CardTitle>
        {canGenerate && (
          <Button size="sm" onClick={handleGenerate} disabled={isPending}>
            {isPending ? "Generating..." : "Generate Summary"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {summaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No summaries generated yet.
          </p>
        ) : (
          <div className="space-y-4">
            {summaries
              .slice()
              .sort((a, b) => b.week_number - a.week_number)
              .map((s) => (
                <div key={s.id} className="rounded-lg border p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Week {s.week_number} ·{" "}
                    {new Date(s.generated_at).toLocaleDateString()}
                  </p>
                  <p className="whitespace-pre-line text-sm">{s.content}</p>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
