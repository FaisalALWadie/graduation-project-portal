export type DueUrgency = "overdue" | "soon" | "none";

const DAY_MS = 86400000;

export function getDueUrgency(
  dueDate: string | null,
  status?: string,
): DueUrgency {
  if (!dueDate || status === "completed") return "none";
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / DAY_MS);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 2) return "soon";
  return "none";
}

export const DUE_TEXT_CLASS: Record<DueUrgency, string> = {
  overdue: "font-medium text-destructive",
  soon: "font-medium text-amber-600 dark:text-amber-500",
  none: "text-muted-foreground",
};

export const DUE_DOT_CLASS: Record<DueUrgency, string> = {
  overdue: "bg-destructive",
  soon: "bg-amber-500",
  none: "bg-transparent",
};
