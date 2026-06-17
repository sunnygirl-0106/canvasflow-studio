// Shared grid-layout math. The formula `col = i % cols; row = ⌊i / cols⌋;
// x = baseX + col*(cellW + gap)` was re-derived in ~6 store slices with slightly
// different constants. Centralise the per-index cell position here.

export interface GridOpts {
  baseX: number;
  baseY: number;
  cellW: number;
  cellH: number;
  gapX?: number;
  gapY?: number;
}

/** Position of the i-th item in a left-to-right, top-to-bottom grid. */
export function gridCell(i: number, cols: number, opts: GridOpts): { x: number; y: number } {
  const { baseX, baseY, cellW, cellH, gapX = 0, gapY = 0 } = opts;
  const col = i % cols;
  const row = Math.floor(i / cols);
  return {
    x: baseX + col * (cellW + gapX),
    y: baseY + row * (cellH + gapY),
  };
}
