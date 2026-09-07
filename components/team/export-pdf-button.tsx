"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TeamSummaryPdf } from "@/components/pdf/team-summary-pdf";
import { STATUS_COLUMNS, type Task } from "@/components/kanban/types";

export function ExportPdfButton({
  projectTitle,
  advisorName,
  tasks,
  milestones,
}: {
  projectTitle: string;
  advisorName: string;
  tasks: Task[];
  milestones: { title: string; status: string; due_date: string | null }[];
}) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const counts = STATUS_COLUMNS.reduce<Record<string, number>>((acc, col) => {
        acc[col.id] = tasks.filter((t) => t.status === col.id).length;
        return acc;
      }, {});
      const completionPct =
        tasks.length === 0
          ? 0
          : Math.round(((counts.completed ?? 0) / tasks.length) * 100);

      const blob = await pdf(
        <TeamSummaryPdf
          projectTitle={projectTitle}
          advisorName={advisorName}
          completionPct={completionPct}
          counts={counts}
          totalTasks={tasks.length}
          milestones={milestones}
          generatedAt={new Date().toLocaleDateString()}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle.replace(/[^a-zA-Z0-9]+/g, "-")}-summary.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't generate the PDF.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? "Generating..." : "Export PDF summary"}
    </Button>
  );
}
