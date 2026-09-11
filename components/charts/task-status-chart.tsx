"use client";

import { PieChart, Pie, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { STATUS_COLUMNS } from "@/components/kanban/types";
import { EmptyState } from "@/components/ui/empty-state";

const COLORS: Record<string, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  completed: "#22c55e",
};

export function TaskStatusChart({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const data = STATUS_COLUMNS.map((col) => ({
    name: col.label,
    value: counts[col.id] ?? 0,
    fill: COLORS[col.id],
  })).filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title="No tasks yet"
        description="Once tasks are created, their status breakdown will show up here."
        className="py-8"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        />
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
