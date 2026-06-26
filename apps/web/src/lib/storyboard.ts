import type { AspectRatio } from "@/store/canvasStore";

// ── Auto grid layout (PRD 5.1) ─────────────────────────────────────────────

/** N items -> near-square rows x cols */
export function autoGrid(n: number): { rows: number; cols: number } {
  if (n <= 0) return { rows: 0, cols: 0 };
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  return { rows, cols };
}

// ── Label & geometry ────────────────────────────────────────────────────────

/** 1-based shot number badge for a member at the given 0-based slot index. */
export const slotLabel = (index: number): string => `${index + 1}`;

const RATIO_MAP: Record<AspectRatio, [number, number]> = {
  "21:9": [21, 9],
  "16:9": [16, 9],
  "9:16": [9, 16],
  "3:4": [3, 4],
  "4:3": [4, 3],
  "1:1": [1, 1],
};

/** Compute single cell pixel size from aspect ratio and a base width. */
export function cellSize(ratio: AspectRatio, baseW: number): { w: number; h: number } {
  const [rw, rh] = RATIO_MAP[ratio];
  return { w: baseW, h: Math.round(baseW * (rh / rw)) };
}

// ── Stitch (canvas composite, demo-level) ───────────────────────────────────

const RESOLUTION_W = { "2K": 2560, "4K": 3840 } as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Stitch ordered members into a single image using an offscreen canvas. Members
 * are placed row-major by `idx`; their live `src` is read by the caller. Returns
 * a dataURL. On cross-origin failure, falls back to a placeholder grid.
 */
export async function stitchToDataURL(
  items: { src?: string; idx: number }[],
  grid: { rows: number; cols: number; ratio: AspectRatio; showIndex: boolean },
  resolution: "2K" | "4K",
): Promise<{ dataURL: string; width: number; height: number }> {
  const totalW = RESOLUTION_W[resolution];
  const [rw, rh] = RATIO_MAP[grid.ratio];
  const cellW = Math.floor(totalW / grid.cols);
  const cellH = Math.round(cellW * (rh / rw));
  const totalH = cellH * grid.rows;
  const gap = 4;

  const canvas = document.createElement("canvas");
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#F1F5F9";
  ctx.fillRect(0, 0, totalW, totalH);

  let useFallback = false;

  for (const item of items) {
    const col0 = item.idx % grid.cols;
    const row0 = Math.floor(item.idx / grid.cols);
    const x = col0 * cellW;
    const y = row0 * cellH;

    if (item.src) {
      try {
        const img = await loadImage(item.src);
        // contain fit
        const scale = Math.min((cellW - gap * 2) / img.width, (cellH - gap * 2) / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = x + (cellW - dw) / 2;
        const dy = y + (cellH - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      } catch {
        // Cross-origin or load failure — draw placeholder
        useFallback = true;
        ctx.fillStyle = "#E2E8F0";
        ctx.fillRect(x + gap, y + gap, cellW - gap * 2, cellH - gap * 2);
      }
    }

    // Draw grid border
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cellW, cellH);

    // Index label (1-based shot number)
    if (grid.showIndex) {
      const label = slotLabel(item.idx);
      ctx.font = `bold ${Math.max(12, cellW * 0.06)}px Inter, system-ui`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const tm = ctx.measureText(label);
      const lw = tm.width + 8;
      const lh = 20;
      ctx.fillRect(x + cellW - lw - 4, y + cellH - lh - 4, lw, lh);
      ctx.fillStyle = "#334155";
      ctx.fillText(label, x + cellW - lw, y + cellH - 8);
    }
  }

  try {
    const url = canvas.toDataURL("image/png");
    if (useFallback) {
      console.warn("stitchToDataURL: some images fell back to placeholders (cross-origin)");
    }
    return { dataURL: url, width: totalW, height: totalH };
  } catch {
    // Canvas tainted — full fallback
    console.warn("stitchToDataURL: canvas tainted, returning fallback");
    return { dataURL: canvas.toDataURL("image/png"), width: totalW, height: totalH };
  }
}
