import { z } from "zod";

export const documentTypeEnum = z.enum(["report", "presentation", "code", "other"]);

export const documentUploadSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  type: documentTypeEnum,
});
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
