"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { updateMindmap } from "@/lib/actions/mindmap";
import { EditableNode } from "./editable-node";
import { Button } from "@/components/ui/button";

const NODE_TYPES = { editable: EditableNode };
const SAVE_DEBOUNCE_MS = 1000;

type MindmapData = { nodes: Node[]; edges: Edge[] };

function withReadOnly(nodes: Node[], readOnly: boolean) {
  return nodes.map((n) => ({ ...n, data: { ...n.data, readOnly } }));
}

function CanvasInner({
  teamId,
  initialData,
  canEdit,
}: {
  teamId: string;
  initialData: MindmapData;
  canEdit: boolean;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    withReadOnly(initialData.nodes, !canEdit),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      if (!canEdit) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          // Round-trip through JSON: strips anything non-serializable
          // and narrows node.data down to just the label we actually
          // want to persist (not transient UI state like `selected`).
          const payload = JSON.parse(
            JSON.stringify({
              nodes: nextNodes.map((n) => ({ ...n, data: { label: n.data.label } })),
              edges: nextEdges,
            }),
          );
          await updateMindmap(teamId, payload);
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Couldn't save mind map.",
          );
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [teamId, canEdit],
  );

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      setNodes((current) => {
        scheduleSave(current, edges);
        return current;
      });
    },
    [onNodesChange, setNodes, scheduleSave, edges],
  );

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setEdges((current) => {
        scheduleSave(nodes, current);
        return current;
      });
    },
    [onEdgesChange, setEdges, scheduleSave, nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => {
        const next = addEdge(connection, current);
        scheduleSave(nodes, next);
        return next;
      });
    },
    [setEdges, scheduleSave, nodes],
  );

  function handleAddNode() {
    const id = `node-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "editable",
      position: { x: 400 + Math.random() * 100, y: 250 + Math.random() * 100 },
      data: { label: "New idea", readOnly: false },
    };
    setNodes((current) => {
      const next = [...current, newNode];
      scheduleSave(next, edges);
      return next;
    });
  }

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-2xl border">
      {canEdit && (
        <div className="absolute top-3 left-3 z-10">
          <Button size="sm" onClick={handleAddNode}>
            Add node
          </Button>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={NODE_TYPES}
        nodesDraggable={canEdit}
        nodesConnectable={canEdit}
        elementsSelectable={canEdit}
        fitView
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}

export function MindMapCanvas({
  teamId,
  data,
  canEdit,
}: {
  teamId: string;
  data: unknown;
  canEdit: boolean;
}) {
  const initialData = useMemo<MindmapData>(() => {
    if (data && typeof data === "object" && "nodes" in data && "edges" in data) {
      return data as MindmapData;
    }
    return { nodes: [], edges: [] };
  }, [data]);

  return (
    <ReactFlowProvider>
      <CanvasInner teamId={teamId} initialData={initialData} canEdit={canEdit} />
    </ReactFlowProvider>
  );
}
