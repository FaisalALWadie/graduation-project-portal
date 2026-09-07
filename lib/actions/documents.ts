"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireProfile } from "@/lib/auth/require-role";
import { documentUploadSchema } from "@/lib/validations/document";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export async function uploadDocument(formData: FormData) {
  const profile = await requireRole("student");
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");

  const parsed = documentUploadSchema.parse({
    title: formData.get("title"),
    type: formData.get("type"),
  });

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is larger than 25 MB.");
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("documents")
    .select("version")
    .eq("team_id", profile.team_id)
    .eq("title", parsed.title)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (existing?.version ?? 0) + 1;

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${profile.team_id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type || undefined });
  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("documents").insert({
    team_id: profile.team_id,
    title: parsed.title,
    type: parsed.type,
    file_url: path,
    version: nextVersion,
    uploaded_by: profile.id,
  });
  if (insertError) {
    await supabase.storage.from("documents").remove([path]);
    throw new Error(insertError.message);
  }

  revalidatePath("/student/documents");
}

// Any authenticated role with a team may download a document from the
// vault (students, their advisor, and admin) - RLS on storage.objects
// still scopes this to the caller's own team regardless.
export async function getDocumentDownloadUrl(path: string) {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
