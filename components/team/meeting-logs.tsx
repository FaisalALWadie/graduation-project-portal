"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { addMeetingLog } from "@/lib/actions/meetings";
import { meetingLogSchema, type MeetingLogInput } from "@/lib/validations/meeting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database";

type MeetingLog = Database["public"]["Tables"]["meeting_logs"]["Row"];

export function MeetingLogs({
  logs,
  canPost,
}: {
  logs: MeetingLog[];
  canPost: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [localLogs, setLocalLogs] = useState(logs);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeetingLogInput>({ resolver: zodResolver(meetingLogSchema) });

  function onSubmit(values: MeetingLogInput) {
    startTransition(async () => {
      try {
        await addMeetingLog(values);
        setLocalLogs((prev) => [
          {
            id: crypto.randomUUID(),
            team_id: "",
            meeting_date: values.meetingDate,
            summary: values.summary,
            decisions: values.decisions ?? null,
            created_by: "",
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        reset();
        toast.success("Meeting logged.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save meeting log.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {canPost && (
        <Card>
          <CardHeader>
            <CardTitle>Log a meeting</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meetingDate">Date</Label>
                <Input id="meetingDate" type="date" {...register("meetingDate")} />
                {errors.meetingDate && (
                  <p className="text-sm text-destructive">
                    {errors.meetingDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea id="summary" rows={2} {...register("summary")} />
                {errors.summary && (
                  <p className="text-sm text-destructive">{errors.summary.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="decisions">Decisions made</Label>
                <Textarea id="decisions" rows={2} {...register("decisions")} />
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save meeting log"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meeting Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {localLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No meetings logged yet.
            </p>
          ) : (
            <div className="space-y-4">
              {localLogs
                .sort((a, b) => (a.meeting_date < b.meeting_date ? 1 : -1))
                .map((log) => (
                  <div key={log.id} className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {new Date(log.meeting_date).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-sm font-medium">{log.summary}</p>
                    {log.decisions && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Decisions: {log.decisions}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
