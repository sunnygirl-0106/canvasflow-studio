// Placeholder images for the demo.
//
// `placeholderImage()` returns a real photo from picsum.photos, keyed by seed so
// the same node always shows the same picture (a stable "generated frame"). This
// needs network access; when the host is unreachable the <img> onError handler
// falls back to `localPlaceholderImage()`, which synthesizes a deterministic SVG
// from the same seed so the demo never shows a broken image.

/** Deterministic 32-bit FNV-1a hash of a string. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A real placeholder photo from picsum.photos, keyed by `seed`.
 *
 * Deterministic in `seed`: the same seed always resolves to the same picture,
 * so a node keeps a stable image across reloads. Requires network access; pair
 * the rendered `<img>` with an onError fallback to {@link localPlaceholderImage}
 * so offline/unreachable states degrade gracefully.
 */
export function placeholderImage(
  seed: string,
  width = 400,
  height = 400,
): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

/**
 * Build a local placeholder image as an `data:image/svg+xml` URI.
 *
 * Deterministic in `seed`: a diagonal gradient plus a few soft blobs, with hues
 * derived from the seed hash, so different seeds read as visually distinct
 * frames. Used as the offline fallback when a picsum photo fails to load.
 */
export function localPlaceholderImage(
  seed: string,
  width = 400,
  height = 400,
): string {
  const h = hashSeed(seed);
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + ((h >>> 8) % 80)) % 360;
  const angle = (h >>> 16) % 360;
  const rad = (angle * Math.PI) / 180;
  // Gradient direction as unit-square coordinates.
  const x2 = (50 + 50 * Math.cos(rad)).toFixed(1);
  const y2 = (50 + 50 * Math.sin(rad)).toFixed(1);

  // Three deterministic soft blobs for texture.
  const blobs = [0, 1, 2]
    .map((i) => {
      const b = hashSeed(`${seed}:${i}`);
      const cx = (b % 100).toFixed(1);
      const cy = ((b >>> 7) % 100).toFixed(1);
      const r = (12 + ((b >>> 14) % 20)).toFixed(1);
      const op = (0.05 + ((b >>> 20) % 10) / 100).toFixed(2);
      return `<circle cx="${cx}%" cy="${cy}%" r="${r}%" fill="#fff" opacity="${op}"/>`;
    })
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="g" x1="0%" y1="0%" x2="${x2}%" y2="${y2}%">` +
    `<stop offset="0%" stop-color="hsl(${hue1},58%,46%)"/>` +
    `<stop offset="100%" stop-color="hsl(${hue2},54%,28%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#g)"/>` +
    blobs +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
