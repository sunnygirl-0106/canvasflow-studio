import { useCallback } from "react";
import { useCanvas, type CanvasNode } from "@/store/canvasStore";

// Shallow-merge a partial into a node's `data`. This `(n) => ({...n, data:{...}})`
// + `as CanvasNode` shape was hand-rolled in both prompt panels (and elsewhere);
// the cast is needed because TS can't collapse a spread-of-union back to the
// discriminated union.
export function useNodePatch<T>(nodeId: string) {
  const updateNode = useCanvas((s) => s.updateNode);
  return useCallback(
    (partial: Partial<T>) =>
      updateNode(nodeId, (n) => ({ ...n, data: { ...n.data, ...partial } }) as CanvasNode),
    [nodeId, updateNode],
  );
}
