import { generateScript as apiGenerateScript } from "@/services/api";
import { autoGrid, fillCells } from "@/lib/storyboard";
import { extractAssetsFromShots } from "@/lib/assetUtils";
import {
  type CanvasNode,
  type Edge,
  type NodeKind,
  type ScriptAsset,
  type ScriptData,
  type ScriptShot,
  type ScriptCharacter,
  type ScriptColumnKey,
  type ScriptFilter,
  type ScriptView,
  type WizardStep,
  type SetState,
  type GetState,
  DEFAULT_RATIO,
} from "./types";

// ── Script helpers ────────────────────────────────────────────────────────────

const scriptAbortMap = new Map<string, AbortController>();

function patchScriptData(
  nodes: CanvasNode[],
  id: string,
  patch: Partial<ScriptData>,
): CanvasNode[] {
  return nodes.map((n) => {
    if (n.id !== id || n.kind !== "script") return n;
    return { ...n, data: { ...n.data, script: { ...n.data.script, ...patch } } };
  });
}

function patchScriptShots(
  nodes: CanvasNode[],
  id: string,
  fn: (shots: ScriptShot[]) => ScriptShot[],
): CanvasNode[] {
  return nodes.map((n) => {
    if (n.id !== id || n.kind !== "script") return n;
    return {
      ...n,
      data: { ...n.data, script: { ...n.data.script, shots: fn(n.data.script.shots) } },
    };
  });
}

function getScriptData(nodes: CanvasNode[], id: string) {
  const node = nodes.find((n) => n.id === id);
  return node?.kind === "script" ? node.data.script : undefined;
}

function getConnectedScriptSource(
  state: { nodes: CanvasNode[]; edges: Edge[] },
  scriptId: string,
): string | undefined {
  const incoming = state.edges.filter((e) => e.to === scriptId);
  for (const edge of incoming) {
    const src = state.nodes.find((n) => n.id === edge.from);
    if (src?.kind === "text" && src.data.text?.trim()) return src.data.text;
  }
  return undefined;
}

// ── Slice ─────────────────────────────────────────────────────────────────────

export function createScriptSlice(set: SetState, get: GetState) {
  return {
    openScript: (id: string) => set({ editorScriptId: id }),

    closeScript: () => {
      const id = get().editorScriptId;
      if (id) {
        scriptAbortMap.get(id)?.abort();
        scriptAbortMap.delete(id);
        get().materializeAssetGroups(id);
      }
      set({ editorScriptId: null });
    },

    generateScript: (id: string) => {
      const sb = getScriptData(get().nodes, id);
      if (!sb) return;
      const srcText = getConnectedScriptSource(get(), id) ?? sb.sourceText ?? "";
      if (!srcText.trim()) return;

      get().pushHistory();
      set((s) => ({
        nodes: patchScriptData(s.nodes, id, {
          status: "generating",
          shots: [],
          sourceText: srcText,
          error: undefined,
          progress: 0,
        }),
      }));

      const controller = new AbortController();
      scriptAbortMap.set(id, controller);
      apiGenerateScript(
        { sourceText: srcText, promptText: sb.promptText, model: sb.model },
        {
          onShot: (shot) =>
            set((s) => ({ nodes: patchScriptShots(s.nodes, id, (arr) => [...arr, shot]) })),
          onProgress: (percent) =>
            set((s) => ({ nodes: patchScriptData(s.nodes, id, { progress: percent }) })),
          onDone: () =>
            set((s) => ({
              nodes: patchScriptData(s.nodes, id, { status: "ready", progress: undefined }),
            })),
          onError: (err) =>
            set((s) => ({
              nodes: patchScriptData(s.nodes, id, {
                status: "failed",
                error: err.message,
                progress: undefined,
              }),
            })),
          signal: controller.signal,
        },
      );
    },

    cancelScript: (id: string) => {
      scriptAbortMap.get(id)?.abort();
      scriptAbortMap.delete(id);
      set((s) => ({
        nodes: patchScriptData(s.nodes, id, { status: "empty", shots: [], progress: undefined }),
      }));
    },

    regenerateScript: (id: string) => {
      scriptAbortMap.get(id)?.abort();
      scriptAbortMap.delete(id);
      get().generateScript(id);
    },

    updateScriptShot: (id: string, shotId: string, patch: Partial<ScriptShot>) =>
      set((s) => ({
        nodes: patchScriptShots(s.nodes, id, (shots) =>
          shots.map((sh) => (sh.id === shotId ? { ...sh, ...patch } : sh)),
        ),
      })),

    updateScriptCharacter: (
      id: string,
      shotId: string,
      charId: string,
      patch: Partial<ScriptCharacter>,
    ) =>
      set((s) => ({
        nodes: patchScriptShots(s.nodes, id, (shots) =>
          shots.map((sh) =>
            sh.id !== shotId
              ? sh
              : {
                  ...sh,
                  characters: sh.characters.map((c) => (c.id === charId ? { ...c, ...patch } : c)),
                },
          ),
        ),
      })),

    setScriptImage: (
      id: string,
      shotId: string,
      target: { kind: "ref" } | { kind: "character"; charId: string },
      src: string,
    ) =>
      set((s) => ({
        nodes: patchScriptShots(s.nodes, id, (shots) =>
          shots.map((sh) => {
            if (sh.id !== shotId) return sh;
            if (target.kind === "ref") return { ...sh, refImage: src };
            return {
              ...sh,
              characters: sh.characters.map((c) =>
                c.id === target.charId ? { ...c, image: src } : c,
              ),
            };
          }),
        ),
      })),

    removeScriptImage: (
      id: string,
      shotId: string,
      target: { kind: "ref" } | { kind: "character"; charId: string },
    ) =>
      set((s) => ({
        nodes: patchScriptShots(s.nodes, id, (shots) =>
          shots.map((sh) => {
            if (sh.id !== shotId) return sh;
            if (target.kind === "ref") return { ...sh, refImage: undefined };
            return {
              ...sh,
              characters: sh.characters.map((c) =>
                c.id === target.charId ? { ...c, image: undefined } : c,
              ),
            };
          }),
        ),
      })),

    removeScriptShot: (id: string, shotId: string) => {
      get().pushHistory();
      set((s) => ({
        nodes: patchScriptShots(s.nodes, id, (shots) =>
          shots.filter((sh) => sh.id !== shotId).map((sh, i) => ({ ...sh, index: i + 1 })),
        ),
      }));
    },

    setScriptView: (id: string, view: ScriptView) =>
      set((s) => ({ nodes: patchScriptData(s.nodes, id, { view }) })),

    toggleScriptColumn: (id: string, key: ScriptColumnKey) =>
      set((s) => {
        const sd = getScriptData(s.nodes, id);
        const hidden = sd?.hiddenColumns ?? [];
        const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
        return { nodes: patchScriptData(s.nodes, id, { hiddenColumns: next }) };
      }),

    setScriptFilter: (id: string, filter: Partial<ScriptFilter>) =>
      set((s) => {
        const sd = getScriptData(s.nodes, id);
        const current = sd?.filter ?? {};
        return { nodes: patchScriptData(s.nodes, id, { filter: { ...current, ...filter } }) };
      }),

    setBatchVideoSbId: (id: string | null) => set({ batchVideoSbId: id }),

    batchGenerateVideo: (sbId: string) => {
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === sbId);
      if (!sbNode || sbNode.kind !== "storyboard") return;
      const sb = sbNode.data.storyboard;

      get().pushHistory();
      const ts = Date.now();
      const filledCells = sb.cells.filter((c) => c.src);

      const members = filledCells.map((cell, i) => ({
        id: `vid-sb-${ts}-${i}`,
        kind: "generateVideo" as NodeKind,
        src: cell.src,
        name: `分镜视频-#${i + 1}`,
      }));

      const cols = Math.min(filledCells.length, 4);
      const CARD_W = 260;
      const CARD_H = 180;
      const PAD = 24;
      const imgCols = Math.min(filledCells.length, cols);
      const imgRows = Math.ceil(filledCells.length / cols);

      const groupId = `videogroup-${ts}`;
      const groupNode: CanvasNode = {
        id: groupId,
        kind: "nodeGroup",
        x: sbNode.x,
        y: sbNode.y + 500,
        data: {
          name: `视频组 · ${sbNode.data.name}`,
          memberIds: members.map((m) => m.id),
          members,
          groupColor: "#8B5CF6",
          groupLayout: "grid",
          groupWidth: imgCols * CARD_W - 20 + PAD * 2,
          groupHeight: imgRows * CARD_H - 20 + PAD * 2,
        },
      };

      const edge: Edge = {
        id: `edge-sb-vg-${ts}`,
        from: sbId,
        to: groupId,
        sourceHandle: "sb-out",
      };

      set((s) => ({
        nodes: [...s.nodes, groupNode],
        edges: [...s.edges, edge],
        selectedId: groupId,
        batchVideoSbId: null,
      }));
    },

    batchGenerateVideoFromScript: (
      scriptId: string,
      opts: {
        selectedShotIds: string[];
        model: string;
        aspectRatio: string;
        resolution: string;
        durations: Record<string, number>;
      },
    ) => {
      const { nodes } = get();
      const scriptNode = nodes.find((n) => n.id === scriptId);
      if (!scriptNode || scriptNode.kind !== "script") return;
      const script = scriptNode.data.script;

      const selectedShots = script.shots.filter((s) => opts.selectedShotIds.includes(s.id));
      if (selectedShots.length === 0) return;

      get().pushHistory();
      const ts = Date.now();

      const members = selectedShots.map((shot, i) => ({
        id: `vid-script-${ts}-${i}`,
        kind: "generateVideo" as NodeKind,
        src: undefined as string | undefined,
        name: `分镜视频-#${shot.index}`,
        duration: opts.durations[shot.id] ?? shot.duration,
      }));

      const cols = Math.min(selectedShots.length, 3);
      const CARD_W = 260;
      const CARD_H = 200;
      const PAD = 24;
      const imgCols = Math.min(selectedShots.length, cols);
      const imgRows = Math.ceil(selectedShots.length / cols);

      const groupId = `videogroup-${ts}`;
      const groupNode: CanvasNode = {
        id: groupId,
        kind: "nodeGroup",
        x: scriptNode.x + 800,
        y: scriptNode.y,
        data: {
          name: `视频组 · ${script.title || scriptNode.data.name || "脚本"}-视频组`,
          memberIds: members.map((m) => m.id),
          members,
          groupColor: "#8B5CF6",
          groupLayout: "grid",
          groupWidth: imgCols * CARD_W + (imgCols - 1) * 16 + PAD * 2,
          groupHeight: imgRows * CARD_H + (imgRows - 1) * 16 + PAD * 2 + 40,
        },
      };

      const edge: Edge = {
        id: `edge-script-vg-${ts}`,
        from: scriptId,
        to: groupId,
        sourceHandle: "out",
        toHandle: "group-in",
      };

      set((s) => ({
        nodes: [...s.nodes, groupNode],
        edges: [...s.edges, edge],
        selectedId: groupId,
      }));
    },

    setScriptWizardStep: (id: string, step: WizardStep) =>
      set((s) => ({ nodes: patchScriptData(s.nodes, id, { wizardStep: step }) })),

    addScriptShot: (id: string) => {
      get().pushHistory();
      set((s) => ({
        nodes: patchScriptShots(s.nodes, id, (shots) => {
          const nextIndex = shots.length > 0 ? Math.max(...shots.map((sh) => sh.index)) + 1 : 1;
          const newShot: ScriptShot = {
            id: `shot-${Date.now()}-${nextIndex}`,
            index: nextIndex,
            duration: 3,
            description: "",
            characters: [],
            shotType: "",
            action: "",
            emotion: "",
            sceneTags: "",
            lighting: "",
            sound: "",
            dialogue: "",
            cameraMove: "",
            imagePrompt: "",
            videoPrompt: "",
            finalPrompt: "",
            finalPromptStatus: "pending",
          };
          return [...shots, newShot];
        }),
      }));
    },

    composeFinalPrompts: (id: string, shotIds: string[]) => {
      // Mark selected shots as "composing"
      set((s) => ({
        nodes: patchScriptShots(s.nodes, id, (shots) =>
          shots.map((sh) =>
            shotIds.includes(sh.id) ? { ...sh, finalPromptStatus: "composing" as const } : sh,
          ),
        ),
      }));

      // Simulate progressive composition ~500ms per shot
      let i = 0;
      const timer = setInterval(() => {
        if (i >= shotIds.length) {
          clearInterval(timer);
          return;
        }
        const shotId = shotIds[i];
        set((s) => ({
          nodes: patchScriptShots(s.nodes, id, (shots) =>
            shots.map((sh) => {
              if (sh.id !== shotId) return sh;
              const prompt = [sh.description, sh.lighting, sh.sound, sh.dialogue, sh.imagePrompt]
                .filter(Boolean)
                .join(" + ");
              return { ...sh, finalPrompt: prompt, finalPromptStatus: "done" as const };
            }),
          ),
        }));
        i++;
      }, 500);
    },

    extractAssets: (id: string) => {
      const script = getScriptData(get().nodes, id);
      if (!script) return;
      const assets = extractAssetsFromShots(script.shots);
      set((s) => ({ nodes: patchScriptData(s.nodes, id, { assets }) }));
    },

    addAsset: (id: string, asset: ScriptAsset) =>
      set((s) => {
        const assets = [...(getScriptData(s.nodes, id)?.assets ?? []), asset];
        return { nodes: patchScriptData(s.nodes, id, { assets }) };
      }),

    updateAsset: (id: string, assetId: string, patch: Partial<ScriptAsset>) =>
      set((s) => {
        const assets = (getScriptData(s.nodes, id)?.assets ?? []).map((a) =>
          a.id === assetId ? { ...a, ...patch } : a,
        );
        return { nodes: patchScriptData(s.nodes, id, { assets }) };
      }),

    removeAsset: (id: string, assetId: string) =>
      set((s) => {
        const assets = (getScriptData(s.nodes, id)?.assets ?? []).filter((a) => a.id !== assetId);
        return { nodes: patchScriptData(s.nodes, id, { assets }) };
      }),

    generateAssets: (id: string, assetIds: string[]) => {
      // Mark all as generating
      set((s) => {
        const assets = (getScriptData(s.nodes, id)?.assets ?? []).map((a) =>
          assetIds.includes(a.id)
            ? { ...a, generationStatus: { state: "generating" as const, progress: 0 } }
            : a,
        );
        return { nodes: patchScriptData(s.nodes, id, { assets }) };
      });

      // Simulate progress for each asset
      let tick = 0;
      const timer = setInterval(() => {
        tick++;
        const progress = Math.min(tick * 20, 100);
        set((s) => {
          const assets = (getScriptData(s.nodes, id)?.assets ?? []).map((a) => {
            if (!assetIds.includes(a.id)) return a;
            if (a.generationStatus?.state !== "generating") return a;
            if (progress >= 100) {
              return {
                ...a,
                image: `https://picsum.photos/seed/${a.id}/400/400`,
                generationStatus: { state: "done" as const },
              };
            }
            return { ...a, generationStatus: { state: "generating" as const, progress } };
          });
          return { nodes: patchScriptData(s.nodes, id, { assets }) };
        });
        if (progress >= 100) clearInterval(timer);
      }, 400);
    },

    cancelAssetGeneration: (id: string, assetId: string) =>
      set((s) => {
        const assets = (getScriptData(s.nodes, id)?.assets ?? []).map((a) =>
          a.id === assetId ? { ...a, generationStatus: { state: "idle" as const } } : a,
        );
        return { nodes: patchScriptData(s.nodes, id, { assets }) };
      }),

    materializeAssetGroups: (scriptId: string) => {
      const { nodes } = get();
      const scriptNode = nodes.find((n) => n.id === scriptId);
      if (!scriptNode || scriptNode.kind !== "script") return;
      const script = scriptNode.data.script;
      if (script.assetGroupsMaterialized) return;

      const assetsWithImage = (script.assets ?? []).filter((a) => a.image);
      if (assetsWithImage.length === 0) return;

      const ts = Date.now();
      const groupId = `asset-group-${ts}`;
      const members = assetsWithImage.map((a) => ({
        id: a.id,
        kind: "image" as NodeKind,
        src: a.image,
        name: a.name,
      }));

      const groupNode: CanvasNode = {
        id: groupId,
        kind: "nodeGroup",
        x: scriptNode.x - 400,
        y: scriptNode.y,
        data: {
          name: `资产组 · ${script.title}`,
          memberIds: members.map((m) => m.id),
          members,
          groupColor: "#6366F1",
          groupLayout: "grid",
        },
      };

      const edge: Edge = {
        id: `edge-asset-${ts}`,
        from: groupId,
        to: scriptId,
        sourceHandle: "group-out",
        toHandle: "in",
      };

      set((s) => ({
        nodes: [
          ...patchScriptData(s.nodes, scriptId, { assetGroupsMaterialized: true }),
          groupNode,
        ],
        edges: [...s.edges, edge],
      }));
    },

    generateStoryboardFromScript: (scriptId: string, shotIds: string[]) => {
      const { nodes } = get();
      const scriptNode = nodes.find((n) => n.id === scriptId);
      if (!scriptNode || scriptNode.kind !== "script") return;
      const script = scriptNode.data.script;

      const selectedShots = script.shots.filter((s) => shotIds.includes(s.id));
      if (selectedShots.length === 0) return;

      get().pushHistory();
      const ts = Date.now();
      const sbId = `storyboard-${ts}`;
      const { rows, cols } = autoGrid(selectedShots.length);

      const items = selectedShots.map((shot, i) => ({
        src: `https://picsum.photos/seed/sb-${ts}-${i}/400/225`,
        sourceNodeId: `img-sb-${ts}-${i}`,
        name: `镜 ${shot.index}`,
      }));
      const cells = fillCells(items, rows, cols);

      const sbNode: CanvasNode = {
        id: sbId,
        kind: "storyboard",
        x: scriptNode.x,
        y: scriptNode.y + 500,
        data: {
          name: `分镜图 · ${script.title}`,
          storyboard: { rows, cols, ratio: DEFAULT_RATIO, showIndex: true, cells },
          scriptSourceId: scriptId,
        },
      };

      const edge: Edge = {
        id: `edge-script-sb-${ts}`,
        from: scriptId,
        to: sbId,
        sourceHandle: "out",
        toHandle: "sb-in",
      };

      set((s) => ({
        nodes: [...s.nodes, sbNode],
        edges: [...s.edges, edge],
        selectedId: sbId,
      }));
    },
  };
}
