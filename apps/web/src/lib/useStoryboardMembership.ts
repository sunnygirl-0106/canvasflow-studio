import { useMemo } from "react";
import { useCanvas, type AspectRatio } from "@/store/canvasStore";
import { storyboardSlotSize } from "@/lib/container";

/** Everything a member node needs to render itself in storyboard "slot mode". */
export interface SlotInfo {
  storyboardId: string;
  index: number; // 0-based position in memberIds
  label: string; // 1-based shot number for the index badge
  ratio: AspectRatio;
  slotW: number;
  slotH: number;
  showIndex: boolean;
}

/**
 * Returns slot-render info if `nodeId` is a member of some storyboard, else null.
 * Mirrors GroupNode's pattern: subscribe to `s.nodes` and derive via useMemo
 * (the container's StoryboardData is the single source of truth — slot size is
 * derived from `ratio`, never snapshotted onto the member).
 */
export function useStoryboardMembership(nodeId: string): SlotInfo | null {
  const nodes = useCanvas((s) => s.nodes);
  return useMemo(() => {
    for (const n of nodes) {
      if (n.kind !== "storyboard") continue;
      const index = n.data.storyboard.memberIds.indexOf(nodeId);
      if (index < 0) continue;
      const sb = n.data.storyboard;
      const { w, h } = storyboardSlotSize(sb.ratio);
      return {
        storyboardId: n.id,
        index,
        label: String(index + 1),
        ratio: sb.ratio,
        slotW: w,
        slotH: h,
        showIndex: sb.showIndex,
      };
    }
    return null;
  }, [nodes, nodeId]);
}
