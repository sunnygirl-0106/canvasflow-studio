import { describe, it, expect } from "vitest";
import { autoGrid, slotLabel, cellSize } from "./storyboard";

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

// ── slotLabel ─────────────────────────────────────────────────────────────

describe("slotLabel", () => {
  it("renders the 1-based shot number for a 0-based index", () => {
    expect(slotLabel(0)).toBe("1");
    expect(slotLabel(4)).toBe("5");
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
