import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import type { GenerateAssetsRequest } from "@canvasflow/shared";
import { placeholderImage } from "@canvasflow/shared";
import {
  storageConfigured,
  validateAsset,
  createPresignedUpload,
} from "../lib/storage";

export const assets = new Hono();

// ── Upload URL (presigned direct upload) ────────────────────────────────────

const UploadUrlBody = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  projectId: z.string().min(1).optional(),
});

assets.post("/upload-url", async (c) => {
  const body = await c.req.json();
  const parsed = UploadUrlBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { filename, contentType, size, projectId } = parsed.data;

  // Validate type and size
  const validationError = validateAsset(contentType, size);
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  if (!storageConfigured) {
    // Dev fallback: return a mock response so the frontend flow still works
    // In dev mode, files stay as local blob URLs (not persisted across refresh)
    return c.json(
      {
        uploadUrl: "",
        publicUrl: "",
        key: "",
        mock: true,
      },
      200,
    );
  }

  try {
    const result = await createPresignedUpload(
      projectId ?? "default",
      filename,
      contentType,
    );
    return c.json(result);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      500,
    );
  }
});

// ── Asset generation (mock SSE) ─────────────────────────────────────────────

/**
 * POST /api/assets/generate
 *
 * SSE stream that simulates asset image generation.
 * For each asset, emits progress 0→100 then "done" with a placeholder image URL.
 * Events: "progress" ({assetId, progress}), "asset-done" ({assetId, image}), "done"
 */
assets.post("/generate", async (c) => {
  const body = await c.req.json<GenerateAssetsRequest>();

  return streamSSE(c, async (stream) => {
    for (const assetId of body.assetIds) {
      // Simulate 5 progress ticks
      for (let tick = 1; tick <= 5; tick++) {
        await new Promise((r) => setTimeout(r, 400));
        const progress = Math.min(tick * 20, 100);

        await stream.writeSSE({
          event: "progress",
          data: JSON.stringify({ assetId, progress }),
        });
      }

      // Done — return placeholder image
      await stream.writeSSE({
        event: "asset-done",
        data: JSON.stringify({
          assetId,
          image: placeholderImage(assetId, 400, 400),
        }),
      });
    }

    await stream.writeSSE({ event: "done", data: "" });
  });
});
