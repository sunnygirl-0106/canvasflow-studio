import { generateScript as apiGenerateScript } from "@/services/api";
import { autoGrid, fillCells } from "@/lib/storyboard";
import { gridCell } from "@/lib/gridLayout";
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
// Live mock-progress timers keyed by script id, so we can cancel them when the
// script editor closes or a new run starts — otherwise the interval keeps
// calling set() against a closed/removed script (memory + state leak).
const composeTimers = new Map<string, ReturnType<typeof setInterval>>();
const assetGenTimers = new Map<string, ReturnType<typeof setInterval>>();

function clearScriptTimers(id: string) {
  const ct = composeTimers.get(id);
  if (ct) {
    clearInterval(ct);
    composeTimers.delete(id);
  }
  const at = assetGenTimers.get(id);
  if (at) {
    clearInterval(at);
    assetGenTimers.delete(id);
  }
}

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
        clearScriptTimers(id);
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
          onDone: () => {
            scriptAbortMap.delete(id);
            set((s) => ({
              nodes: patchScriptData(s.nodes, id, { status: "ready", progress: undefined }),
            }));
          },
          onError: (err) => {
            scriptAbortMap.delete(id);
            set((s) => ({
              nodes: patchScriptData(s.nodes, id, {
                status: "failed",
                error: err.message,
                progress: undefined,
              }),
            }));
          },
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

    updateScriptShot: (id: string, shotId: string, patch: Partial<ScriptShot>) => {
      // Table/card cells commit on blur (once per edit), so one history entry
      // per field change — not per keystroke.
      get().pushHistory();
      set((s) => ({
        nodes: patchScriptShots(s.nodes, id, (shots) =>
          shots.map((sh) => (sh.id === shotId ? { ...sh, ...patch } : sh)),
        ),
      }));
    },

    updateScriptCharacter: (
      id: string,
      shotId: string,
      charId: string,
      patch: Partial<ScriptCharacter>,
    ) => {
      get().pushHistory();
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
      }));
    },

    setScriptImage: (
      id: string,
      shotId: string,
      target: { kind: "ref" } | { kind: "character"; charId: string },
      src: string,
    ) => {
      get().pushHistory();
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
      }));
    },

    removeScriptImage: (
      id: string,
      shotId: string,
      target: { kind: "ref" } | { kind: "character"; charId: string },
    ) => {
      get().pushHistory();
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
      }));
    },

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

      // `src` not stored on members — once the corresponding generateVideo
      // node materializes, GroupNode reads its live src. Until then the cards
      // render as empty placeholders (matches the "not yet generated" state).
      const members = filledCells.map((_cell, i) => ({
        id: `vid-sb-${ts}-${i}`,
        kind: "generateVideo" as NodeKind,
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

      // Cancel any in-flight compose for this script before (re)starting.
      const prev = composeTimers.get(id);
      if (prev) clearInterval(prev);

      // Simulate progressive composition ~500ms per shot
      let i = 0;
      const timer = setInterval(() => {
        if (i >= shotIds.length) {
          clearInterval(timer);
          composeTimers.delete(id);
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
      composeTimers.set(id, timer);
    },

    extractAssets: (id: string) => {
      const script = getScriptData(get().nodes, id);
      if (!script) return;
      get().pushHistory();
      const assets = extractAssetsFromShots(script.shots);
      set((s) => ({ nodes: patchScriptData(s.nodes, id, { assets }) }));
    },

    addAsset: (id: string, asset: ScriptAsset) => {
      get().pushHistory();
      set((s) => {
        const assets = [...(getScriptData(s.nodes, id)?.assets ?? []), asset];
        return { nodes: patchScriptData(s.nodes, id, { assets }) };
      });
    },

    updateAsset: (id: string, assetId: string, patch: Partial<ScriptAsset>) => {
      set((s) => {
        const assets = (getScriptData(s.nodes, id)?.assets ?? []).map((a) =>
          a.id === assetId ? { ...a, ...patch } : a,
        );
        return { nodes: patchScriptData(s.nodes, id, { assets }) };
      });
      // Keep the materialized asset node's image/name in sync with edits.
      if ("image" in patch || "name" in patch) get().materializeAssetGroups(id);
    },

    removeAsset: (id: string, assetId: string) => {
      set((s) => {
        const assets = (getScriptData(s.nodes, id)?.assets ?? []).filter((a) => a.id !== assetId);
        return { nodes: patchScriptData(s.nodes, id, { assets }) };
      });
      // Drop the corresponding materialized node from the asset group.
      get().materializeAssetGroups(id);
    },

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

      // Cancel any in-flight asset generation for this script before restarting.
      const prevTimer = assetGenTimers.get(id);
      if (prevTimer) clearInterval(prevTimer);

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
        if (progress >= 100) {
          clearInterval(timer);
          assetGenTimers.delete(id);
          // Mount as soon as the images exist — no need to close the editor.
          get().materializeAssetGroups(id);
        }
      }, 400);
      assetGenTimers.set(id, timer);
    },

    cancelAssetGeneration: (id: string, assetId: string) =>
      set((s) => {
        const assets = (getScriptData(s.nodes, id)?.assets ?? []).map((a) =>
          a.id === assetId ? { ...a, generationStatus: { state: "idle" as const } } : a,
        );
        return { nodes: patchScriptData(s.nodes, id, { assets }) };
      }),

    // Idempotent reconcile: materialize every generated asset into a REAL
    // `image` canvas node, wrap them in a dashed-frame "资产组" on the script's
    // left (upstream), and keep all of it in sync with `script.assets[]`.
    //
    // - Real nodes (not virtual refs): they render exactly like 图片N nodes,
    //   survive ungrouping, and can be dragged/edited independently.
    // - Live sync: re-running it after a regenerate refreshes each node's src.
    // - Self-healing: safe to call on load, on generate, on asset edit/remove,
    //   and on editor close — it converges to the same result every time.
    //
    // Stable ids (derived from scriptId) make the reconcile deterministic and
    // avoid the old one-shot `assetGroupsMaterialized` latch that left the
    // canvas stuck with no group after an ungroup.
    materializeAssetGroups: (scriptId: string) => {
      const { nodes } = get();
      const scriptNode = nodes.find((n) => n.id === scriptId);
      if (!scriptNode || scriptNode.kind !== "script") return;
      const script = scriptNode.data.script;
      // Respect a deliberate ungroup: once detached we don't auto-rebuild.
      if (script.assetGroupDetached) return;

      const groupId = `asset-group-${scriptId}`;
      const edgeId = `edge-asset-${scriptId}`;
      const nodeIdFor = (assetId: string) => `assetimg-${scriptId}-${assetId}`;

      const assetsWithImage = (script.assets ?? []).filter((a) => a.image);

      // Grid layout (2 columns) to the LEFT of the script node.
      const NODE_W = 420;
      const NODE_H = 300;
      const GAP = 40;
      const PAD = 32;
      const HEADER = 44;
      const cols = Math.max(1, Math.min(assetsWithImage.length || 1, 2));
      const rows = Math.max(1, Math.ceil(assetsWithImage.length / cols));
      const gridW = cols * NODE_W + (cols - 1) * GAP;
      const gridH = rows * NODE_H + (rows - 1) * GAP;
      const groupW = gridW + PAD * 2;
      const groupH = gridH + PAD * 2 + HEADER;
      const groupX = scriptNode.x - groupW - 120;
      const groupY = scriptNode.y;
      const baseX = groupX + PAD;
      const baseY = groupY + PAD + HEADER;

      set((s) => {
        // 1. Drop the group node, its edge, and any stale asset nodes for this
        //    script — we rebuild from script.assets as the single source.
        const wantedNodeIds = new Set(assetsWithImage.map((a) => nodeIdFor(a.id)));
        let nextNodes = s.nodes.filter((n) => {
          if (n.id === groupId) return false;
          if (n.kind === "image" && n.data.assetScriptId === scriptId) {
            return wantedNodeIds.has(n.id); // keep nodes still backed by an asset
          }
          return true;
        });

        // 2. Upsert a real image node per asset. Preserve a node's existing
        //    position (user may have moved it) and only refresh src/name.
        //    Index by id once to avoid O(assets × nodes) nested scans.
        const nextById = new Map(nextNodes.map((n) => [n.id, n]));
        const assetNodes: CanvasNode[] = assetsWithImage.map((a, i) => {
          const id = nodeIdFor(a.id);
          const existing = nextById.get(id);
          const cell = gridCell(i, cols, {
            baseX,
            baseY,
            cellW: NODE_W,
            cellH: NODE_H,
            gapX: GAP,
            gapY: GAP,
          });
          return {
            id,
            kind: "image",
            x: existing ? existing.x : cell.x,
            y: existing ? existing.y : cell.y,
            data: {
              name: a.name,
              src: a.image,
              status: "ready",
              assetScriptId: scriptId,
              assetId: a.id,
            },
          };
        });
        const assetById = new Map(assetNodes.map((an) => [an.id, an]));
        nextNodes = nextNodes.map((n) => assetById.get(n.id) ?? n);
        const presentIds = new Set(nextNodes.map((n) => n.id));
        for (const an of assetNodes) {
          if (!presentIds.has(an.id)) nextNodes.push(an);
        }

        // 3. No generated assets → leave nothing mounted.
        if (assetNodes.length === 0) {
          return {
            nodes: nextNodes,
            edges: s.edges.filter((e) => e.id !== edgeId),
          };
        }

        // 4. Upsert the dashed-frame group container in front (renders behind
        //    its members, which sit at higher array order).
        const existingGroup = s.nodes.find((n) => n.id === groupId);
        const groupNode: CanvasNode = {
          id: groupId,
          kind: "nodeGroup",
          x: existingGroup ? existingGroup.x : groupX,
          y: existingGroup ? existingGroup.y : groupY,
          data: {
            name: `资产组 · ${script.title || "脚本"}`,
            memberIds: assetNodes.map((n) => n.id),
            members: assetNodes.map((n) => ({
              id: n.id,
              kind: "image" as NodeKind,
              name: n.data.name,
            })),
            groupColor: "#6366F1",
            groupLayout: "grid",
            frame: true,
            sourceScriptId: scriptId,
            groupWidth: groupW,
            groupHeight: groupH,
          },
        };

        const edge: Edge = {
          id: edgeId,
          from: groupId,
          to: scriptId,
          sourceHandle: "group-out",
          toHandle: "in",
        };

        return {
          nodes: [groupNode, ...nextNodes],
          edges: s.edges.some((e) => e.id === edgeId) ? s.edges : [...s.edges, edge],
        };
      });
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
