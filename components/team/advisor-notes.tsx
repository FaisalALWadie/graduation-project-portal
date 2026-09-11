"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { addAdvisorNote } from "@/lib/actions/advisor";
import { advisorNoteSchema, type AdvisorNoteInput } from "@/lib/validations/advisor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { NotebookText } from "lucide-react";
import type { Database } from "@/types/database";

type Note = Database["public"]["Tables"]["advisor_notes"]["Row"];

export function AdvisorNotes({
  notes,
  canPost,
}: {
  notes: Note[];
  canPost: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [localNotes, setLocalNotes] = useState(notes);
  const [notifyTeam, setNotifyTeam] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdvisorNoteInput>({ resolver: zodResolver(advisorNoteSchema) });

  function onSubmit(values: AdvisorNoteInput) {
    startTransition(async () => {
      try {
        const result = await addAdvisorNote(values, notifyTeam);
        setLocalNotes((prev) => [
          {
            id: crypto.randomUUID(),
            team_id: "",
            advisor_id: "",
            week_number: values.weekNumber,
            note: values.note,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        reset();

        switch (result.status) {
          case "sent":
            toast.success(
              `Note posted. Email sent to ${result.recipientCount} team member${result.recipientCount === 1 ? "" : "s"}.`,
            );
            break;
          case "failed":
            toast.warning(
              `Note posted, but the email didn't go out: ${result.error}`,
            );
            break;
          case "no_recipients":
            toast.success("Note posted. No other team members to notify yet.");
            break;
          case "skipped":
            toast.success("Note posted. Team was not emailed.");
            break;
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't post note.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {canPost && (
        <Card>
          <CardHeader>
            <CardTitle>Post a weekly note</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              ref={formRef}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-[100px_1fr] gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weekNumber">Week #</Label>
                  <Input
                    id="weekNumber"
                    type="number"
                    min={1}
                    max={52}
                    {...register("weekNumber", { valueAsNumber: true })}
                  />
                  {errors.weekNumber && (
                    <p className="text-sm text-destructive">
                      {errors.weekNumber.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea id="note" rows={3} {...register("note")} />
                  {errors.note && (
                    <p className="text-sm text-destructive">{errors.note.message}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notifyTeam"
                  checked={notifyTeam}
                  onCheckedChange={(checked) => setNotifyTeam(checked === true)}
                />
                <Label htmlFor="notifyTeam" className="font-normal text-muted-foreground">
                  Email the team when this note is posted
                </Label>
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? notifyTeam
                    ? "Posting & sending email..."
                    : "Posting..."
                  : notifyTeam
                    ? "Post & notify team"
                    : "Post note"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {localNotes.length === 0 ? (
            <EmptyState icon={NotebookText} title="No notes yet" />
          ) : (
            <div className="space-y-4">
              {localNotes
                .sort((a, b) => b.week_number - a.week_number)
                .map((n) => (
                  <div key={n.id} className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Week {n.week_number}
                    </p>
                    <p className="mt-1 text-sm">{n.note}</p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
