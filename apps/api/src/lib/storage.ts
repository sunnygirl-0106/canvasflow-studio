// ── Demo storage (mock-only) ─────────────────────────────────────────────────
//
// This is a demo repo: there is no real object storage. The API always runs in
// mock mode — `storageConfigured` is false, so `routes/assets.ts` returns a
// mock upload response and files stay as local blob URLs in the browser.
//
// `validateAsset` is kept as a real, useful helper (type/size whitelist).
// `createPresignedUpload` remains as a stub for the (unused) configured path,
// so a future real-storage implementation has an obvious place to land.

// Always false in the demo. Kept as a named export so callers branch on it.
export const storageConfigured = false;

// ── Content-type whitelist ───────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const IMAGE_MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const VIDEO_MAX_SIZE = 500 * 1024 * 1024; // 500 MB

// ── Public API ───────────────────────────────────────────────────────────────

export interface PresignResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export function validateAsset(
  contentType: string,
  size: number,
): string | null {
  const isImage = ALLOWED_IMAGE_TYPES.has(contentType);
  const isVideo = ALLOWED_VIDEO_TYPES.has(contentType);

  if (!isImage && !isVideo) {
    return `Unsupported content type: ${contentType}`;
  }
  if (isImage && size > IMAGE_MAX_SIZE) {
    return `Image too large (max ${IMAGE_MAX_SIZE / 1024 / 1024}MB)`;
  }
  if (isVideo && size > VIDEO_MAX_SIZE) {
    return `Video too large (max ${VIDEO_MAX_SIZE / 1024 / 1024}MB)`;
  }
  return null;
}

// Unreachable in the demo (storageConfigured is always false). Left as a stub
// so a real object-storage implementation has a clear home.
export async function createPresignedUpload(
  _projectId: string,
  _filename: string,
  _contentType: string,
): Promise<PresignResult> {
  throw new Error("Object storage is not configured (demo runs in mock mode)");
}
