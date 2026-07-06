import { z } from "zod";

/**
 * Upper bound on the length of a single inlined `data:` URL string. Locally
 * uploaded assets are stored as base64 data URLs so they persist with the
 * canvas (see web `fileToDataUrl`, capped at 6 MB); base64 inflates ~4/3, so
 * ~8.4M chars ≈ 6.3 MB of binary — a comfortable ceiling above the client cap
 * that still blocks a runaway asset from bloating the project row.
 */
const MAX_DATA_URL_CHARS = 8_400_000;

/**
 * Depth-first scan for an oversized inlined `data:` URL anywhere in the canvas.
 * Short-circuits on the first offender and never allocates a full
 * `JSON.stringify` of the (potentially large) canvas — it walks references
 * directly and bails early. The cheap length check runs before `startsWith` so
 * the common (small) string case exits immediately.
 */
function hasOversizedDataUrl(value: unknown): boolean {
  if (typeof value === "string") {
    return value.length > MAX_DATA_URL_CHARS && value.startsWith("data:");
  }
  if (Array.isArray(value)) {
    for (const item of value) if (hasOversizedDataUrl(item)) return true;
    return false;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) if (hasOversizedDataUrl(v)) return true;
  }
  return false;
}

export const SaveProjectBody = z.object({
  name: z.string().min(1).max(200),
  canvas: z
    .object({
      nodes: z.array(z.looseObject({})),
      edges: z.array(z.looseObject({})),
    })
    .check(
      z.refine(
        (c) => !hasOversizedDataUrl(c),
        "canvas contains an oversized inlined asset (data URL too large)",
      ),
    ),
});

export const CreateProjectBody = z.object({
  name: z.string().min(1).max(200),
});

export type SaveProjectInput = z.infer<typeof SaveProjectBody>;
export type CreateProjectInput = z.infer<typeof CreateProjectBody>;
