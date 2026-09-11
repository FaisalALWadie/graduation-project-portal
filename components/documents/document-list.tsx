"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import {
  getDocumentDownloadUrl,
  getDocumentPreviewUrl,
} from "@/lib/actions/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];

function getPreviewKind(fileUrl: string): "pdf" | "image" | null {
  const ext = fileUrl.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  return null;
}

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    doc: DocumentRow;
    url: string;
    kind: "pdf" | "image";
  } | null>(null);
  const searchParams = useSearchParams();
  const highlightedId = searchParams.get("highlightDoc");
  const highlightedRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (highlightedId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedId]);

  async function handleDownload(doc: DocumentRow) {
    setDownloadingId(doc.id);
    try {
      const url = await getDocumentDownloadUrl(doc.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't get download link.",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  async function handlePreview(doc: DocumentRow) {
    const kind = getPreviewKind(doc.file_url);
    if (!kind) return;
    setPreviewingId(doc.id);
    try {
      const url = await getDocumentPreviewUrl(doc.id);
      setPreview({ doc, url, kind });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't load preview.",
      );
    } finally {
      setPreviewingId(null);
    }
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents uploaded yet"
        description="Reports, presentations, and code get versioned here once uploaded."
        className="py-8"
      />
    );
  }

  return (
    <>
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
            <TableRow
              key={doc.id}
              ref={doc.id === highlightedId ? highlightedRef : undefined}
              className={
                doc.id === highlightedId
                  ? "bg-accent ring-2 ring-inset ring-primary"
                  : ""
              }
            >
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
                <div className="flex justify-end gap-2">
                  {getPreviewKind(doc.file_url) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={previewingId === doc.id}
                      onClick={() => handlePreview(doc)}
                    >
                      {previewingId === doc.id ? "..." : "Preview"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={downloadingId === doc.id}
                    onClick={() => handleDownload(doc)}
                  >
                    {downloadingId === doc.id ? "..." : "Download"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className="max-h-[90vh] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.doc.title}</DialogTitle>
          </DialogHeader>
          {preview?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase Storage, not a static asset next/image can optimize
            <img
              src={preview.url}
              alt={preview.doc.title}
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
          ) : preview?.kind === "pdf" ? (
            <iframe
              src={preview.url}
              title={preview.doc.title}
              className="h-[75vh] w-full rounded-md border"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
