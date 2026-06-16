import type {
  ScriptShot,
  GenerateScriptRequest,
  GenerateAssetsRequest,
  Snapshot,
} from "@canvasflow/shared";

const BASE = "/api";

// ── Project CRUD ─────────────────────────────────────────────────────────────

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  canvas: Snapshot;
  createdAt: string;
  updatedAt: string;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const res = await fetch(`${BASE}/projects`);
  if (!res.ok) throw new Error(`listProjects failed: ${res.status}`);
  return res.json();
}

export async function loadProject(id: string): Promise<ProjectDetail> {
  const res = await fetch(`${BASE}/projects/${id}`);
  if (!res.ok) throw new Error(`loadProject failed: ${res.status}`);
  return res.json();
}

export async function saveProject(id: string, name: string, canvas: Snapshot): Promise<void> {
  const res = await fetch(`${BASE}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, canvas }),
  });
  if (!res.ok) throw new Error(`saveProject failed: ${res.status}`);
}

export async function createProject(name: string): Promise<{ id: string }> {
  const res = await fetch(`${BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`createProject failed: ${res.status}`);
  return res.json();
}

// ── SSE helper ──────────────────────────────────────────────────────────────

interface SSECallbacks<T extends Record<string, unknown>> {
  /** Called for each named event. `data` is already JSON-parsed. */
  onEvent: (event: string, data: T) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

async function fetchSSE<T extends Record<string, unknown>>(
  url: string,
  body: unknown,
  callbacks: SSECallbacks<T>,
): Promise<void> {
  const { onEvent, onDone, onError, signal } = callbacks;

  try {
    const res = await fetch(`${BASE}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "message";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const raw = line.slice(6);
          if (currentEvent === "done") {
            onDone?.();
          } else {
            try {
              const parsed = raw ? JSON.parse(raw) : {};
              onEvent(currentEvent, parsed as T);
            } catch {
              // If not JSON, pass raw string wrapped
              onEvent(currentEvent, { raw } as unknown as T);
            }
          }
          currentEvent = "message";
        }
      }
    }

    // Final flush
    if (buffer.startsWith("data: ") || buffer.includes("event: done")) {
      onDone?.();
    }
  } catch (err) {
    if (signal?.aborted) return;
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

// ── Script generation ───────────────────────────────────────────────────────

export interface ScriptStreamCallbacks {
  onShot: (shot: ScriptShot) => void;
  onProgress: (percent: number) => void;
  onDone: () => void;
  onError: (err: Error) => void;
  signal?: AbortSignal;
}

export function generateScript(
  input: GenerateScriptRequest,
  callbacks: ScriptStreamCallbacks,
): void {
  fetchSSE("/scripts/generate", input, {
    onEvent: (event, data) => {
      if (event === "shot") callbacks.onShot(data as unknown as ScriptShot);
      if (event === "progress") callbacks.onProgress(Number((data as { raw?: string }).raw ?? 0));
    },
    onDone: callbacks.onDone,
    onError: callbacks.onError,
    signal: callbacks.signal,
  });
}

// ── Prompt composition ──────────────────────────────────────────────────────

export interface ComposePromptsCallbacks {
  onPrompt: (shotId: string, finalPrompt: string) => void;
  onDone: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export function composeFinalPrompts(
  shotIds: string[],
  shots: ScriptShot[],
  callbacks: ComposePromptsCallbacks,
): void {
  fetchSSE(
    "/scripts/compose-prompts",
    { shotIds, shots },
    {
      onEvent: (event, data) => {
        if (event === "prompt") {
          const d = data as unknown as { shotId: string; finalPrompt: string };
          callbacks.onPrompt(d.shotId, d.finalPrompt);
        }
      },
      onDone: callbacks.onDone,
      onError: callbacks.onError,
      signal: callbacks.signal,
    },
  );
}

// ── Asset generation ────────────────────────────────────────────────────────

export interface AssetGenCallbacks {
  onProgress: (assetId: string, progress: number) => void;
  onAssetDone: (assetId: string, image: string) => void;
  onDone: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export function generateAssets(request: GenerateAssetsRequest, callbacks: AssetGenCallbacks): void {
  fetchSSE("/assets/generate", request, {
    onEvent: (event, data) => {
      const d = data as unknown as Record<string, unknown>;
      if (event === "progress") {
        callbacks.onProgress(d.assetId as string, d.progress as number);
      }
      if (event === "asset-done") {
        callbacks.onAssetDone(d.assetId as string, d.image as string);
      }
    },
    onDone: callbacks.onDone,
    onError: callbacks.onError,
    signal: callbacks.signal,
  });
}
