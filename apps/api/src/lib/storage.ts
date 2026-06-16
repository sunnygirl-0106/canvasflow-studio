import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import path from "node:path";

// ── Configuration ────────────────────────────────────────────────────────────

const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "";
const S3_REGION = process.env.S3_REGION ?? "auto";
const S3_BUCKET = process.env.S3_BUCKET ?? "";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID ?? "";
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY ?? "";
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL ?? "";

export const storageConfigured =
  S3_ENDPOINT !== "" && S3_BUCKET !== "" && S3_ACCESS_KEY_ID !== "";

const s3 = storageConfigured
  ? new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    })
  : null;

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
const PRESIGN_EXPIRES_IN = 300; // 5 minutes

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

export async function createPresignedUpload(
  projectId: string,
  filename: string,
  contentType: string,
): Promise<PresignResult> {
  if (!s3) {
    throw new Error("Object storage is not configured");
  }

  const ext = path.extname(filename) || mimeToExt(contentType);
  const key = `projects/${projectId}/${crypto.randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: PRESIGN_EXPIRES_IN,
  });

  const publicUrl = S3_PUBLIC_BASE_URL
    ? `${S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`
    : uploadUrl.split("?")[0];

  return { uploadUrl, publicUrl, key };
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
  };
  return map[mime] ?? "";
}
