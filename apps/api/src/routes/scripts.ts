import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { ScriptShot, GenerateScriptRequest } from "@canvasflow/shared";
import { pickFixture } from "../fixtures";

export const scripts = new Hono();

/**
 * POST /api/scripts/generate
 *
 * SSE stream that emits shots one by one (mock — 450ms interval).
 * Events: "shot" (data: ScriptShot), "progress" (data: number), "done", "error"
 */
scripts.post("/generate", async (c) => {
  const body = await c.req.json<GenerateScriptRequest>();
  const fixtures = pickFixture(body.sourceText);
  const total = fixtures.length;

  return streamSSE(c, async (stream) => {
    for (let i = 0; i < total; i++) {
      await new Promise((r) => setTimeout(r, 450));

      const shot: ScriptShot = {
        ...fixtures[i],
        id: `shot-${Date.now()}-${i}`,
        characters: fixtures[i].characters.map((ch) => ({ ...ch })),
      };

      await stream.writeSSE({ event: "shot", data: JSON.stringify(shot) });
      await stream.writeSSE({
        event: "progress",
        data: String(Math.round(((i + 1) / total) * 100)),
      });
    }

    await stream.writeSSE({ event: "done", data: "" });
  });
});

/**
 * POST /api/scripts/compose-prompts
 *
 * SSE stream that emits composed final prompts one by one (mock — 500ms each).
 * Events: "prompt" (data: {shotId, finalPrompt}), "done"
 */
scripts.post("/compose-prompts", async (c) => {
  const body = await c.req.json<{ shotIds: string[]; shots: ScriptShot[] }>();
  const shotMap = new Map(body.shots.map((s) => [s.id, s]));

  return streamSSE(c, async (stream) => {
    for (const shotId of body.shotIds) {
      await new Promise((r) => setTimeout(r, 500));

      const shot = shotMap.get(shotId);
      const prompt = shot
        ? [shot.description, shot.lighting, shot.sound, shot.dialogue, shot.imagePrompt]
            .filter(Boolean)
            .join(" + ")
        : "";

      await stream.writeSSE({
        event: "prompt",
        data: JSON.stringify({ shotId, finalPrompt: prompt }),
      });
    }

    await stream.writeSSE({ event: "done", data: "" });
  });
});
