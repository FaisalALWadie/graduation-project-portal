import { z } from "zod";

export const meetingLogSchema = z.object({
  meetingDate: z.string().min(1, "Pick a date"),
  summary: z.string().trim().min(5, "Summary is too short"),
  decisions: z.string().trim().optional(),
});
export type MeetingLogInput = z.infer<typeof meetingLogSchema>;
