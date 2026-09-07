import { z } from "zod";

export const createTeamSchema = z.object({
  projectTitle: z.string().trim().min(3, "Project title is too short"),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
