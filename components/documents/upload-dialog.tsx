"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { uploadDocument } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UploadDocumentDialog({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await uploadDocument(formData);
        toast.success("Document uploaded.");
        setOpen(false);
        formRef.current?.reset();
        onUploaded();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Upload document</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Final Report"
              required
            />
            <p className="text-xs text-muted-foreground">
              Uploading with the same title as an existing document adds a
              new version.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue="report">
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="presentation">Presentation</SelectItem>
                <SelectItem value="code">Code archive</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input id="file" name="file" type="file" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
