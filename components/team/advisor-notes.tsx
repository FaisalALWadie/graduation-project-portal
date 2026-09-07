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
        await addAdvisorNote(values);
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
        toast.success("Note posted.");
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
              <Button type="submit" disabled={isPending}>
                {isPending ? "Posting..." : "Post note"}
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
            <p className="text-sm text-muted-foreground">No notes yet.</p>
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
