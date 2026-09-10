import { z } from "zod";

// Matches the shape components/mindmap/mind-map-canvas.tsx actually
// produces (React Flow Node/Edge), with size caps: this is the only
// input to updateMindmap() that isn't otherwise constrained by the
// database (it's stored as free-form jsonb), so without a cap here an
// authenticated student could push an arbitrarily large or malformed
// blob into a team's mindmap_data.
const mindmapNodeSchema = z.looseObject({
  id: z.string().min(1).max(200),
  type: z.string().max(50).optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.looseObject({ label: z.string().max(500) }),
});

const mindmapEdgeSchema = z.looseObject({
  id: z.string().min(1).max(200),
  source: z.string().min(1).max(200),
  target: z.string().min(1).max(200),
  sourceHandle: z.string().max(200).nullable().optional(),
  targetHandle: z.string().max(200).nullable().optional(),
});

export const mindmapDataSchema = z.object({
  nodes: z.array(mindmapNodeSchema).max(300),
  edges: z.array(mindmapEdgeSchema).max(600),
});
