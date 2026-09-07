"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getDocumentDownloadUrl } from "@/lib/actions/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/types/database";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"] & {
  uploader_name: string;
};

const TYPE_LABEL: Record<string, string> = {
  report: "Report",
  presentation: "Presentation",
  code: "Code",
  other: "Other",
};

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(doc: DocumentRow) {
    setDownloadingId(doc.id);
    try {
      const url = await getDocumentDownloadUrl(doc.file_url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't get download link.");
    } finally {
      setDownloadingId(null);
    }
  }

  if (documents.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No documents uploaded yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Uploaded by</TableHead>
          <TableHead>Date</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="font-medium">{doc.title}</TableCell>
            <TableCell>
              <Badge variant="secondary">{TYPE_LABEL[doc.type]}</Badge>
            </TableCell>
            <TableCell>v{doc.version}</TableCell>
            <TableCell>{doc.uploader_name}</TableCell>
            <TableCell>
              {new Date(doc.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="outline"
                disabled={downloadingId === doc.id}
                onClick={() => handleDownload(doc)}
              >
                {downloadingId === doc.id ? "..." : "Download"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
