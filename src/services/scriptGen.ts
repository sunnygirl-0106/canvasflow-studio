import type { ScriptShot } from "@/store/canvasStore";
import { pickFixture } from "@/data/scriptFixture";

export interface GenerateScriptInput {
  sourceText: string;
  promptText: string;
  model: string;
}

export interface GenerateScriptHandlers {
  onShot: (shot: ScriptShot) => void;
  onProgress: (percent: number) => void;
  onDone: () => void;
  onError: (err: Error) => void;
  signal?: AbortSignal;
}

/**
 * Generate storyboard script — mock implementation.
 * Streams fixture shots one by one with a ~450ms interval to simulate streaming.
 * Replace this function body with real SSE fetch when connecting to backend.
 */
export function generateStoryboardScript(
  input: GenerateScriptInput,
  handlers: GenerateScriptHandlers,
): void {
  const { onShot, onProgress, onDone, onError, signal } = handlers;

  try {
    const fixtures = pickFixture(input.sourceText);
    const total = fixtures.length;
    let i = 0;

    const timer = setInterval(() => {
      if (signal?.aborted) {
        clearInterval(timer);
        return;
      }
      if (i >= total) {
        clearInterval(timer);
        onProgress(100);
        onDone();
        return;
      }
      const shot: ScriptShot = {
        ...fixtures[i],
        id: `shot-${Date.now()}-${i}`,
        characters: fixtures[i].characters.map((c) => ({ ...c })),
      };
      onShot(shot);
      i++;
      onProgress(Math.round((i / total) * 100));
    }, 450);

    // Clean up on abort
    signal?.addEventListener("abort", () => clearInterval(timer), { once: true });
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
