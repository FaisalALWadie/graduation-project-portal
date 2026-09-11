"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireProfile } from "@/lib/auth/require-role";
import { documentUploadSchema } from "@/lib/validations/document";
import { sendNotificationEmail } from "@/lib/email";
import { documentUploadedEmail } from "@/lib/email-templates";
import { getTeamProjectTitle, getTeamAdvisorEmail } from "@/lib/team-notify";
import { logActivity } from "@/lib/activity";

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

  await logActivity(supabase, {
    teamId: profile.team_id,
    actorId: profile.id,
    actionType: "document_uploaded",
    description: `${profile.full_name} uploaded "${parsed.title}" (v${nextVersion})`,
  });

  const advisorEmail = await getTeamAdvisorEmail(supabase, profile.team_id);
  if (advisorEmail) {
    const teamName = await getTeamProjectTitle(supabase, profile.team_id);
    const { subject, html } = documentUploadedEmail({
      documentTitle: parsed.title,
      teamName,
      uploaderName: profile.full_name,
    });
    await sendNotificationEmail({
      to: advisorEmail,
      subject,
      html,
      supabase,
      rateLimitKey: `email:${profile.team_id}`,
    });
  }
}

// Any authenticated role with a team may download a document from the
// vault (students, their advisor, and admin). storage.objects RLS
// already scopes createSignedUrl to the caller's own team regardless
// (verified: a foreign-team path is rejected with "Object not found"),
// but this takes a documentId rather than a client-supplied storage
// path and re-checks team_id explicitly - defense-in-depth, and it
// means a signed URL is never even attempted for a document the caller
// has no business seeing.
export async function getDocumentDownloadUrl(documentId: string) {
  const profile = await requireProfile();
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("file_url, team_id")
    .eq("id", documentId)
    .eq("team_id", profile.team_id)
    .maybeSingle();
  if (!doc) throw new Error("Document not found.");

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.file_url, 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// Same access-control pattern as getDocumentDownloadUrl, but a longer
// expiry (previewing a PDF/image takes longer than a one-shot
// download that starts immediately).
export async function getDocumentPreviewUrl(documentId: string) {
  const profile = await requireProfile();
  if (!profile.team_id) throw new Error("You're not assigned to a team yet.");

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("file_url, team_id")
    .eq("id", documentId)
    .eq("team_id", profile.team_id)
    .maybeSingle();
  if (!doc) throw new Error("Document not found.");

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.file_url, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
