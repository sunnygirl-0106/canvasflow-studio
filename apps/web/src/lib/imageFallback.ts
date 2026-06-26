// Offline fallback for placeholder images.
//
// `placeholderImage()` (shared) returns a picsum.photos URL keyed by seed. When
// that host is unreachable, swap the failed <img> to a deterministic local SVG
// derived from the same seed/dimensions, so the demo never shows a broken image.
import type { SyntheticEvent } from "react";
import { localPlaceholderImage } from "@canvasflow/shared";

const PICSUM_RE = /picsum\.photos\/seed\/([^/]+)\/(\d+)\/(\d+)/;

/**
 * onError handler for any <img> whose src comes from `placeholderImage()`.
 * Recovers the seed/width/height from the picsum URL and regenerates the same
 * local SVG the demo used to ship. Guarded so it only runs once per element.
 */
export function onPlaceholderImgError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fellBack) return; // already swapped — avoid an onError loop
  img.dataset.fellBack = "1";
  const m = PICSUM_RE.exec(img.src);
  img.src = m
    ? localPlaceholderImage(decodeURIComponent(m[1]), Number(m[2]), Number(m[3]))
    : localPlaceholderImage(img.src, 400, 400);
}
