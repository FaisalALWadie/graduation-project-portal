"use client";

import { useRouter } from "next/navigation";
import { UploadDocumentDialog } from "./upload-dialog";
import { DocumentList } from "./document-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/types/database";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"] & {
  uploader_name: string;
};

export function DocumentsClient({
  documents,
  canUpload,
}: {
  documents: DocumentRow[];
  canUpload: boolean;
}) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Documentation Vault</CardTitle>
        {canUpload && (
          <UploadDocumentDialog onUploaded={() => router.refresh()} />
        )}
      </CardHeader>
      <CardContent>
        <DocumentList documents={documents} />
      </CardContent>
    </Card>
  );
}
