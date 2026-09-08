"use client";

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";

export function EditableNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const label = typeof data.label === "string" ? data.label : "";
  const readOnly = data.readOnly === true;

  return (
    <div
      className={`rounded-lg border bg-white px-3 py-2 shadow-sm dark:bg-zinc-900 ${
        selected ? "border-primary ring-2 ring-primary/30" : ""
      }`}
      style={{ minWidth: 160 }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-1">
        <input
          value={label}
          readOnly={readOnly}
          onChange={(e) => updateNodeData(id, { ...data, label: e.target.value })}
          className="w-full bg-transparent text-sm font-medium outline-none"
          placeholder="Label"
        />
        {!readOnly && (
          <button
            type="button"
            aria-label="Delete node"
            onClick={() => deleteElements({ nodes: [{ id }] })}
            className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
          >
            ✕
          </button>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
