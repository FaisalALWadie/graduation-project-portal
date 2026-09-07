import { z } from "zod";

export const advisorNoteSchema = z.object({
  weekNumber: z.number().int().min(1).max(52),
  note: z.string().trim().min(5, "Note is too short"),
});
export type AdvisorNoteInput = z.infer<typeof advisorNoteSchema>;
