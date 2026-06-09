import { describe, it, expect } from "vitest";
import { autoGrid, fillCells, reflow, cellLabel, cellSize } from "./storyboard";
import type { StoryboardData, StoryboardCell } from "@/store/canvasStore";

// ── autoGrid ────────────────────────────────────────────────────────────────

describe("autoGrid", () => {
  it("returns 0x0 for n=0", () => {
    expect(autoGrid(0)).toEqual({ rows: 0, cols: 0 });
  });

  it("returns 1x1 for n=1", () => {
    expect(autoGrid(1)).toEqual({ rows: 1, cols: 1 });
  });

  it("returns 2x2 for n=4", () => {
    expect(autoGrid(4)).toEqual({ rows: 2, cols: 2 });
  });

  it("returns 3x3 for n=9", () => {
    expect(autoGrid(9)).toEqual({ rows: 3, cols: 3 });
  });

  it("returns 2x3 for n=6 (cols=ceil(sqrt(6))=3, rows=ceil(6/3)=2)", () => {
    expect(autoGrid(6)).toEqual({ rows: 2, cols: 3 });
  });

  it("returns 3x4 for n=12", () => {
    expect(autoGrid(12)).toEqual({ rows: 3, cols: 4 });
  });

  it("returns 2x2 for n=3 (cols=2, rows=2, one empty slot)", () => {
    expect(autoGrid(3)).toEqual({ rows: 2, cols: 2 });
  });

  it("returns 3x3 for n=7", () => {
    expect(autoGrid(7)).toEqual({ rows: 3, cols: 3 });
  });

  it("returns 1x2 for n=2", () => {
    expect(autoGrid(2)).toEqual({ rows: 1, cols: 2 });
  });

  it("returns 2x3 for n=5", () => {
    expect(autoGrid(5)).toEqual({ rows: 2, cols: 3 });
  });
});

// ── fillCells ───────────────────────────────────────────────────────────────

describe("fillCells", () => {
  it("fills items into grid with empty placeholders", () => {
    const items = [
      { src: "a.jpg", sourceNodeId: "n1", name: "A" },
      { src: "b.jpg", sourceNodeId: "n2", name: "B" },
    ];
    const cells = fillCells(items, 2, 2);
    expect(cells).toHaveLength(4);
    expect(cells[0].src).toBe("a.jpg");
    expect(cells[0].row).toBe(1);
    expect(cells[0].col).toBe(1);
    expect(cells[1].src).toBe("b.jpg");
    expect(cells[1].row).toBe(1);
    expect(cells[1].col).toBe(2);
    expect(cells[2].src).toBeUndefined();
    expect(cells[2].row).toBe(2);
    expect(cells[2].col).toBe(1);
    expect(cells[3].src).toBeUndefined();
    expect(cells[3].row).toBe(2);
    expect(cells[3].col).toBe(2);
  });

  it("fills exactly when items = capacity", () => {
    const items = [
      { src: "a.jpg", sourceNodeId: "n1" },
      { src: "b.jpg", sourceNodeId: "n2" },
      { src: "c.jpg", sourceNodeId: "n3" },
      { src: "d.jpg", sourceNodeId: "n4" },
    ];
    const cells = fillCells(items, 2, 2);
    expect(cells).toHaveLength(4);
    expect(cells.every((c) => c.src != null)).toBe(true);
  });
});

// ── reflow ──────────────────────────────────────────────────────────────────

function makeStoryboard(
  rows: number,
  cols: number,
  filledCount: number,
): StoryboardData {
  const cells: StoryboardCell[] = [];
  for (let i = 0; i < rows * cols; i++) {
    const r = Math.floor(i / cols) + 1;
    const c = (i % cols) + 1;
    cells.push({
      id: `cell-${r}-${c}`,
      row: r,
      col: c,
      ...(i < filledCount
        ? { src: `img${i}.jpg`, sourceNodeId: `n${i}`, name: `Img ${i}` }
        : {}),
    });
  }
  return { rows, cols, ratio: "16:9", showIndex: false, cells };
}

describe("reflow", () => {
  it("expanding grid keeps all images and adds empty slots", () => {
    const sb = makeStoryboard(2, 2, 4);
    const { cells, overflow } = reflow(sb, 3, 3);
    expect(cells).toHaveLength(9);
    expect(overflow).toHaveLength(0);
    // first 4 filled
    expect(cells[0].src).toBe("img0.jpg");
    expect(cells[3].src).toBe("img3.jpg");
    // rest empty
    expect(cells[4].src).toBeUndefined();
  });

  it("shrinking grid produces overflow", () => {
    const sb = makeStoryboard(3, 3, 9);
    const { cells, overflow } = reflow(sb, 2, 2);
    expect(cells).toHaveLength(4);
    expect(overflow).toHaveLength(5);
    expect(overflow[0].src).toBe("img4.jpg");
    expect(overflow[4].src).toBe("img8.jpg");
  });

  it("same size keeps everything", () => {
    const sb = makeStoryboard(2, 3, 5);
    const { cells, overflow } = reflow(sb, 2, 3);
    expect(cells).toHaveLength(6);
    expect(overflow).toHaveLength(0);
    expect(cells.filter((c) => c.src != null)).toHaveLength(5);
  });

  it("shrinking with partially filled grid has no overflow if images fit", () => {
    const sb = makeStoryboard(3, 3, 3); // only 3 filled in 9 slots
    const { cells, overflow } = reflow(sb, 2, 2);
    expect(cells).toHaveLength(4);
    expect(overflow).toHaveLength(0);
    expect(cells.filter((c) => c.src != null)).toHaveLength(3);
  });
});

// ── cellLabel ───────────────────────────────────────────────────────────────

describe("cellLabel", () => {
  it("formats as row-col", () => {
    expect(cellLabel({ id: "x", row: 2, col: 3 })).toBe("2-3");
  });
});

// ── cellSize ────────────────────────────────────────────────────────────────

describe("cellSize", () => {
  it("16:9 at base 320 gives correct height", () => {
    const { w, h } = cellSize("16:9", 320);
    expect(w).toBe(320);
    expect(h).toBe(180);
  });

  it("9:16 at base 180 gives correct height", () => {
    const { w, h } = cellSize("9:16", 180);
    expect(w).toBe(180);
    expect(h).toBe(320);
  });

  it("1:1 at base 200 gives square", () => {
    const { w, h } = cellSize("1:1", 200);
    expect(w).toBe(200);
    expect(h).toBe(200);
  });

  it("21:9 at base 420 gives correct height", () => {
    const { w, h } = cellSize("21:9", 420);
    expect(w).toBe(420);
    expect(h).toBe(180);
  });

  it("4:3 at base 400 gives correct height", () => {
    const { w, h } = cellSize("4:3", 400);
    expect(w).toBe(400);
    expect(h).toBe(300);
  });

  it("3:4 at base 300 gives correct height", () => {
    const { w, h } = cellSize("3:4", 300);
    expect(w).toBe(300);
    expect(h).toBe(400);
  });
});
