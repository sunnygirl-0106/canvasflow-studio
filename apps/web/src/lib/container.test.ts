import { describe, it, expect } from "vitest";
import {
  storyboardMemberPos,
  storyboardSize,
  memberGridLayout,
  findContainerOf,
  addMembers,
  removeMembers,
  sortNodesContainerFirst,
  SB_PAD_X,
  SB_HEADER_H,
  SB_CELL_W,
  SB_CELL_H,
  SB_CELL_GAP_X,
  SB_CELL_GAP_Y,
} from "./container";
import type { CanvasNode } from "@/store/canvasStore";

// 分镜组 members render at their FULL card footprint (no thumbnail shrink), so
// the grid steps by the real image-node size + handle-clearing gaps.

describe("storyboardMemberPos", () => {
  it("places index 0 at the grid origin (header + pad offset)", () => {
    const p = storyboardMemberPos(100, 200, 0, 3, "16:9");
    expect(p).toEqual({ x: 100 + SB_PAD_X, y: 200 + SB_HEADER_H });
  });

  it("advances by cell + gap across columns and wraps to next row", () => {
    const second = storyboardMemberPos(0, 0, 1, 3, "16:9");
    expect(second.x).toBe(SB_PAD_X + SB_CELL_W + SB_CELL_GAP_X);
    expect(second.y).toBe(SB_HEADER_H);
    // index 3 with cols=3 → row 1, col 0
    const wrapped = storyboardMemberPos(0, 0, 3, 3, "16:9");
    expect(wrapped.x).toBe(SB_PAD_X);
    expect(wrapped.y).toBe(SB_HEADER_H + SB_CELL_H + SB_CELL_GAP_Y);
  });
});

describe("storyboardSize", () => {
  it("accounts for cells, gaps, padding and header", () => {
    const { width, height } = storyboardSize(2, 3, "16:9");
    expect(width).toBe(3 * SB_CELL_W + 2 * SB_CELL_GAP_X + SB_PAD_X * 2);
    expect(height).toBeGreaterThan(SB_HEADER_H + 2 * SB_CELL_H);
  });
});

describe("memberGridLayout", () => {
  it("maps each index to a grid position", () => {
    const m = memberGridLayout(4, 2, {
      baseX: 0,
      baseY: 0,
      cellW: 10,
      cellH: 10,
      gapX: 2,
      gapY: 2,
    });
    expect(m.get(0)).toEqual({ x: 0, y: 0 });
    expect(m.get(1)).toEqual({ x: 12, y: 0 });
    expect(m.get(2)).toEqual({ x: 0, y: 12 });
    expect(m.get(3)).toEqual({ x: 12, y: 12 });
  });
});

function sbNode(id: string, memberIds: string[]): CanvasNode {
  return {
    id,
    kind: "storyboard",
    x: 0,
    y: 0,
    data: {
      name: id,
      storyboard: { rows: 1, cols: 2, ratio: "16:9", showIndex: false, memberIds },
    },
  } as CanvasNode;
}
function imgNode(id: string): CanvasNode {
  return { id, kind: "image", x: 0, y: 0, data: { name: id } } as CanvasNode;
}

describe("findContainerOf", () => {
  it("finds the storyboard a node belongs to with its index", () => {
    const nodes = [sbNode("sb1", ["a", "b"]), imgNode("a"), imgNode("b")];
    expect(findContainerOf("b", nodes)).toEqual({
      kind: "storyboard",
      containerId: "sb1",
      index: 1,
    });
    expect(findContainerOf("z", nodes)).toBeNull();
  });
});

describe("addMembers / removeMembers", () => {
  it("appends without duplicates and removes by id", () => {
    expect(addMembers(["a"], ["a", "b"])).toEqual(["a", "b"]);
    expect(removeMembers(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });
});

describe("sortNodesContainerFirst", () => {
  it("emits each container before its members regardless of original order", () => {
    // members appear BEFORE their container in the input
    const nodes = [imgNode("a"), imgNode("b"), sbNode("sb1", ["a", "b"])];
    const sorted = sortNodesContainerFirst(nodes).map((n) => n.id);
    expect(sorted.indexOf("sb1")).toBeLessThan(sorted.indexOf("a"));
    expect(sorted.indexOf("sb1")).toBeLessThan(sorted.indexOf("b"));
    expect(sorted).toHaveLength(3);
  });

  it("is a no-op when there are no containers", () => {
    const nodes = [imgNode("a"), imgNode("b")];
    expect(sortNodesContainerFirst(nodes)).toBe(nodes);
  });
});
