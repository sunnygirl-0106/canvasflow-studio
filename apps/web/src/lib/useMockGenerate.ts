import { useCallback } from "react";
import { useCanvas, type CanvasNode, type NodeStatus } from "@/store/canvasStore";

// Shared mock-generation progress loop. Image and video prompt panels both ran
// an identical requestAnimationFrame loop: mark the node `generating`, animate
// `progress` 0→1 over `totalMs`, then apply a completion patch (e.g. the result
// `src`). It self-cancels if the node disappears or leaves the generating state.
export function useMockGenerate(nodeId: string) {
  const updateNode = useCanvas((s) => s.updateNode);
  return useCallback(
    (totalMs: number, buildDone: () => Record<string, unknown>) => {
      const patchData = (partial: Record<string, unknown>) =>
        updateNode(nodeId, (n) => ({ ...n, data: { ...n.data, ...partial } }) as CanvasNode);

      patchData({ status: "generating" as NodeStatus, progress: 0 });
      const start = performance.now();
      const tick = () => {
        const elapsed = performance.now() - start;
        const p = Math.min(1, elapsed / totalMs);
        const fresh = useCanvas.getState().nodes.find((n) => n.id === nodeId);
        if (!fresh) return; // node removed mid-flight
        if ((fresh.data as { status?: NodeStatus }).status !== "generating") return; // cancelled
        if (p >= 1) {
          patchData({ status: "ready" as NodeStatus, progress: 1, ...buildDone() });
          return;
        }
        patchData({ progress: p });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    [nodeId, updateNode],
  );
}
