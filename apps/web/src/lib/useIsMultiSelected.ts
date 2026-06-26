import { useStore } from "@xyflow/react";

/**
 * True when ≥2 nodes are currently selected (box-select / multi-select).
 *
 * Per-node chrome (the floating edit toolbar above a node and the prompt
 * panel below it) should hide in this state: when the user is bulk-selecting
 * we want a clean selection rectangle plus a single action bar, not N stacked
 * toolbars and prompt panels. Selecting a boolean keeps re-renders minimal —
 * the value only flips as selection crosses the 1↔2 boundary.
 */
export function useIsMultiSelected(): boolean {
  return useStore((s) => {
    let count = 0;
    for (const n of s.nodes) {
      if (n.selected) {
        count += 1;
        if (count > 1) return true;
      }
    }
    return false;
  });
}
