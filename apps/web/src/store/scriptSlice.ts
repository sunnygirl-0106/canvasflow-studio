import { placeholderImage } from "@canvasflow/shared";
import { generateScript as apiGenerateScript } from "@/services/api";
import { gridCell } from "@/lib/gridLayout";
import {
  buildContainer,
  frameGroupBox,
  FRAME_PAD,
  FRAME_HEADER,
  FRAME_GAP_X,
  FRAME_GAP_Y,
  IMG_W,
  IMG_H,
  VID_W,
  VID_H,
} from "@/lib/container";
import { extractAssetsFromShots, MENTION_REGEX } from "@/lib/assetUtils";
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
} from "./types";

// ── Script helpers ────────────────────────────────────────────────────────────

/**
 * Pick a rich "global style" line for the 准备资产 page based on the source
 * text. Mirrors the theme split in the API's pickFixture (历史剧 vs 生活片) so
 * the style matches whichever fixture will be streamed back.
 */
function pickGlobalStyle(sourceText: string): string {
  if (/凤回巢|重生|权倾|古风|死牢/.test(sourceText)) {
    return "凤回巢·国风古装权谋。冷冽青灰主色调，暖金烛火点缀，强对比布光与丁达尔光束；精致工笔厚涂质感，服化道考究，电影级景深与颗粒感。";
  }
  return "夏日初晴晚风·清新治愈日系。低饱和暖调，柔和自然光与丁达尔光束，通透空气感；细腻胶片颗粒，浅景深虚化，青春纪实的生活质感。";
}

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

// Reference edges: which materialized asset images does a shot @mention in its
// prompts? Returns the canvas ids of the asset image nodes that currently exist
// for those mentions, so a storyboard/video shot can wire back to exactly the
// assets it uses. Mentions are matched by asset NAME (how assets are extracted).
function referencedAssetNodeIds(
  nodes: CanvasNode[],
  scriptId: string,
  script: ScriptData,
  shot: ScriptShot,
): string[] {
  const text = [shot.description, shot.imagePrompt, shot.videoPrompt, shot.finalPrompt]
    .filter(Boolean)
    .join(" ");
  const names = new Set<string>();
  const re = new RegExp(MENTION_REGEX.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) names.add(m[1]);
  if (names.size === 0) return [];

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const a of script.assets ?? []) {
    if (!names.has(a.name)) continue;
    const nodeId = `assetimg-${scriptId}-${a.id}`;
    if (seen.has(nodeId)) continue;
    if (nodes.some((n) => n.id === nodeId)) {
      ids.push(nodeId);
      seen.add(nodeId);
    }
  }
  return ids;
}

function buildReferenceEdges(
  nodes: CanvasNode[],
  scriptId: string,
  script: ScriptData,
  pairs: { shot: ScriptShot; memberId: string }[],
): Edge[] {
  const edges: Edge[] = [];
  for (const { shot, memberId } of pairs) {
    for (const assetNodeId of referencedAssetNodeIds(nodes, scriptId, script, shot)) {
      edges.push({
        id: `edge-ref-${memberId}-${assetNodeId}`,
        from: assetNodeId,
        to: memberId,
        sourceHandle: "source-process",
        toHandle: "in",
      });
    }
  }
  return edges;
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
          globalStyle: pickGlobalStyle(srcText),
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
      const memberCount = sb.memberIds.length;

      // `src` not stored on members — once the corresponding generateVideo
      // node materializes, GroupNode reads its live src. Until then the cards
      // render as empty placeholders (matches the "not yet generated" state).
      const members = Array.from({ length: memberCount }, (_, i) => ({
        id: `vid-sb-${ts}-${i}`,
        kind: "generateVideo" as NodeKind,
        name: `分镜视频-#${i + 1}`,
      }));

      const cols = Math.min(memberCount, 4) || 1;
      const CARD_W = 260;
      const CARD_H = 180;
      const PAD = 24;
      const imgCols = Math.min(memberCount, cols) || 1;
      const imgRows = Math.ceil(memberCount / cols) || 1;

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

      // The storyboard is a handle-less visual container (like the asset group),
      // so no edge is drawn from it — the video group is simply placed below.
      set((s) => ({
        nodes: [...s.nodes, groupNode],
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
      const groupId = `videogroup-${ts}`;

      // Same structure as the 资产组 / 分镜图组: REAL generateVideo nodes wrapped
      // in a dashed-frame group. Each node is a draggable/editable/generatable
      // video node (empty until generated) — no virtual placeholder cards.
      // Shared frame constants (identical to 资产组 / 分镜图组) so spacing matches
      // and the "+" handles never overlap. 2-column grid right of the script.
      const groupX = scriptNode.x + 800;
      const groupY = scriptNode.y;

      // Member metadata is known up front (one video node per shot); build the
      // container off it, then place the real nodes at the returned grid slots.
      const memberMeta = selectedShots.map((shot, i) => ({
        id: `vid-script-${ts}-${i}`,
        shot,
        name: `分镜视频-#${shot.index}`,
        duration: opts.durations[shot.id] ?? shot.duration,
      }));

      const { containerNode: groupNode, memberPositions } = buildContainer({
        mode: "frameGroup",
        cellKind: "video",
        containerId: groupId,
        name: `视频组 · ${script.title || scriptNode.data.name || "脚本"}`,
        memberIds: memberMeta.map((m) => m.id),
        origin: { x: groupX, y: groupY },
        members: memberMeta.map((m) => ({
          id: m.id,
          kind: "generateVideo" as NodeKind,
          name: m.name,
          duration: m.duration,
        })),
        groupColor: "#8B5CF6",
      });

      const videoNodes: CanvasNode[] = memberMeta.map((m) => {
        const cell = memberPositions.get(m.id)!;
        return {
          id: m.id,
          kind: "generateVideo",
          x: cell.x,
          y: cell.y,
          data: {
            name: m.name,
            status: "empty",
            duration: m.duration,
            model: opts.model,
            aspect: opts.aspectRatio,
            resolution: opts.resolution,
            // 视频运动提示词 (falls back to the composed 最终提示词 / description).
            prompt: m.shot.videoPrompt || m.shot.finalPrompt || m.shot.description,
          },
        };
      });

      const edge: Edge = {
        id: `edge-script-vg-${ts}`,
        from: scriptId,
        to: groupId,
        sourceHandle: "out",
        toHandle: "group-in",
      };

      // Per-shot reference edges: each video node wires back to the asset images
      // its shot @mentions.
      const refEdges = buildReferenceEdges(
        nodes,
        scriptId,
        script,
        selectedShots.map((shot, i) => ({ shot, memberId: videoNodes[i].id })),
      );

      set((s) => ({
        nodes: [groupNode, ...s.nodes, ...videoNodes],
        edges: [...s.edges, edge, ...refEdges],
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
                image: placeholderImage(a.id, 400, 400),
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
      const edgePrefix = `edge-asset-${scriptId}`;
      const isAssetEdge = (id: string) => id === edgePrefix || id.startsWith(`${edgePrefix}-`);
      const nodeIdFor = (assetId: string) => `assetimg-${scriptId}-${assetId}`;

      const assetsWithImage = (script.assets ?? []).filter((a) => a.image);
      const memberIds = assetsWithImage.map((a) => nodeIdFor(a.id));

      // Grid layout (2 columns) to the LEFT of the script node. Anchor members
      // to the frame's ACTUAL position: if the group already exists (e.g. the
      // user dragged the frame), reuse its position so the members and the
      // dashed frame share one origin — otherwise they drift apart and the last
      // row pokes out the bottom. The shared frame geometry guarantees the "+"
      // handles never overlap (see FRAME_GAP_X).
      const { groupW } = frameGroupBox(assetsWithImage.length || 1, IMG_W, IMG_H);
      const existingGroup = nodes.find((n) => n.id === groupId);
      const groupX = existingGroup ? existingGroup.x : scriptNode.x - groupW - 120;
      const groupY = existingGroup ? existingGroup.y : scriptNode.y;

      // PURELY VISUAL frame (connectable:false) — grouping is only for
      // distinction; the real edges run per-image, not from the group.
      const { containerNode: groupNode, memberPositions } = buildContainer({
        mode: "frameGroup",
        cellKind: "image",
        containerId: groupId,
        name: `资产组 · ${script.title || "脚本"}`,
        memberIds,
        origin: { x: groupX, y: groupY },
        members: assetsWithImage.map((a) => ({
          id: nodeIdFor(a.id),
          kind: "image" as NodeKind,
          name: a.name,
        })),
        groupColor: "#64748B",
        extraData: { connectable: false, sourceScriptId: scriptId },
      });

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

        // 2. Upsert a real image node per asset, laid out on the grid slots that
        //    buildContainer computed so spacing stays tidy (no overlapping
        //    handles) as assets change.
        const assetNodes: CanvasNode[] = assetsWithImage.map((a) => {
          const cell = memberPositions.get(nodeIdFor(a.id))!;
          return {
            id: nodeIdFor(a.id),
            kind: "image",
            x: cell.x,
            y: cell.y,
            data: {
              name: a.name,
              src: a.image,
              status: "ready",
              // Carry the asset's description over as the node's prompt so the
              // prompt panel is pre-filled with the same words used in 准备资产
              // (e.g. "17岁少女，短发，白衬衫，神情专注地举起相机").
              prompt: a.description ?? "",
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

        // Drop every asset-related edge for this script; we rebuild the exact
        // desired set below (handles the legacy one-group→script edge too).
        const baseEdges = s.edges.filter((e) => !isAssetEdge(e.id));

        // 3. No generated assets → leave nothing mounted.
        if (assetNodes.length === 0) {
          return { nodes: nextNodes, edges: baseEdges };
        }

        // 4. Mount the dashed-frame group container in front (renders behind its
        //    members, which sit at higher array order). `groupNode` was built
        //    above from buildContainer.

        // 5. One edge per asset image → script. Each image feeds the script
        //    individually (its right handle → the script's left "in" handle).
        const assetEdges: Edge[] = assetNodes.map((n) => ({
          id: `${edgePrefix}-${(n.data as { assetId?: string }).assetId}`,
          from: n.id,
          to: scriptId,
          sourceHandle: "source-process",
          toHandle: "in",
        }));

        return {
          nodes: [groupNode, ...nextNodes],
          edges: [...baseEdges, ...assetEdges],
        };
      });
    },

    // Produce the SAME structure as the upstream asset group
    // (`materializeAssetGroups`): REAL `image` canvas nodes wrapped in a
    // dashed-frame "组". The cells are no longer virtual refs — each storyboard
    // image is a draggable/editable node that survives ungrouping, mirroring the
    // 资产组 so both sides of the script feel consistent.
    generateStoryboardFromScript: (scriptId: string, shotIds: string[]) => {
      const { nodes } = get();
      const scriptNode = nodes.find((n) => n.id === scriptId);
      if (!scriptNode || scriptNode.kind !== "script") return;
      const script = scriptNode.data.script;

      const selectedShots = script.shots.filter((s) => shotIds.includes(s.id));
      if (selectedShots.length === 0) return;

      get().pushHistory();
      const ts = Date.now();
      const groupId = `sbgroup-${ts}`;

      // 2-column grid below the script (identical frame geometry to 资产组 / 视频组
      // so spacing matches and the "+" handles never overlap).
      const groupX = scriptNode.x;
      const groupY = scriptNode.y + 500;

      // Empty generator cells: no cover image yet. Each carries the shot's
      // prompt (分镜提示词, falling back to the composed 最终提示词 / description)
      // so the prompt panel is pre-filled, but the thumbnail stays blank until
      // the group is run via 整组执行. Mirrors 视频组 (batchGenerateVideoFromScript).
      const memberMeta = selectedShots.map((shot, i) => ({
        id: `sbimg-${ts}-${i}`,
        name: `镜 ${shot.index}`,
        prompt: shot.imagePrompt || shot.finalPrompt || shot.description,
      }));

      const { containerNode: groupNode, memberPositions } = buildContainer({
        mode: "frameGroup",
        cellKind: "image",
        containerId: groupId,
        name: `分镜图 · ${script.title}`,
        memberIds: memberMeta.map((m) => m.id),
        origin: { x: groupX, y: groupY },
        members: memberMeta.map((m) => ({
          id: m.id,
          kind: "generateImage" as NodeKind,
          name: m.name,
        })),
        groupColor: "#0EA5E9",
      });

      const imageNodes: CanvasNode[] = memberMeta.map((m) => {
        const cell = memberPositions.get(m.id)!;
        return {
          id: m.id,
          kind: "generateImage",
          x: cell.x,
          y: cell.y,
          data: {
            name: m.name,
            status: "empty",
            prompt: m.prompt,
          },
        };
      });

      const edge: Edge = {
        id: `edge-script-sb-${ts}`,
        from: scriptId,
        to: groupId,
        sourceHandle: "out",
        toHandle: "group-in",
      };

      // Per-shot reference edges: each storyboard image wires back to the asset
      // images its shot @mentions, so you can see which assets feed which shot.
      const refEdges = buildReferenceEdges(
        nodes,
        scriptId,
        script,
        selectedShots.map((shot, i) => ({ shot, memberId: imageNodes[i].id })),
      );

      set((s) => ({
        nodes: [groupNode, ...s.nodes, ...imageNodes],
        edges: [...s.edges, edge, ...refEdges],
        selectedId: groupId,
      }));
    },

    // Rebuild the per-shot reference edges (asset image → storyboard/video shot)
    // for a script's already-generated downstream groups. Idempotent and safe to
    // call on load — this back-fills the edges for groups that were created
    // before this wiring existed (members are mapped to shots by the 镜号 in
    // their name, e.g. "镜 3" / "分镜视频-#3").
    reconcileShotReferenceEdges: (scriptId: string) => {
      const { nodes, edges } = get();
      const scriptNode = nodes.find((n) => n.id === scriptId);
      if (!scriptNode || scriptNode.kind !== "script") return;
      const script = scriptNode.data.script;

      // Downstream groups = those the script points at (script → group).
      const groupIds = edges
        .filter((e) => e.from === scriptId && e.toHandle === "group-in")
        .map((e) => e.to);

      const pairs: { shot: ScriptShot; memberId: string }[] = [];
      const matchedIds = new Set<string>(); // members mapped to a shot (get ref edges)
      const allMemberIds = new Set<string>(); // every downstream-group member
      for (const gid of groupIds) {
        const group = nodes.find((n) => n.id === gid);
        if (!group || group.kind !== "nodeGroup") continue;
        for (const mid of group.data.memberIds ?? []) {
          const member = nodes.find((n) => n.id === mid);
          if (!member || (member.kind !== "image" && member.kind !== "generateVideo")) continue;
          allMemberIds.add(mid);
          const idxMatch = (member.data.name ?? "").match(/(\d+)/);
          if (!idxMatch) continue;
          const shot = script.shots.find((sh) => sh.index === Number(idxMatch[1]));
          if (!shot) continue;
          pairs.push({ shot, memberId: mid });
          matchedIds.add(mid);
        }
      }
      if (allMemberIds.size === 0) return;

      const refEdges = buildReferenceEdges(nodes, scriptId, script, pairs);
      // Two cleanups, then add the fresh ref edges:
      //  - stray `script → member`: the script's output must only feed the GROUP
      //    (group-in), never a member directly. These show up as extra lines out
      //    of the script node.
      //  - stale ref edges for the processed members (rebuilt below).
      const isScriptToMember = (e: Edge) => e.from === scriptId && allMemberIds.has(e.to);
      const isStaleRef = (e: Edge) => e.id.startsWith("edge-ref-") && matchedIds.has(e.to);
      const kept = edges.filter((e) => !isScriptToMember(e) && !isStaleRef(e));
      const existing = new Set(kept.map((e) => e.id));
      const merged = [...kept, ...refEdges.filter((e) => !existing.has(e.id))];
      set({ edges: merged });
    },

    // Re-space the members of a script's downstream frame groups (分镜图组/视频组)
    // onto the shared grid and resize the frame. Idempotent — back-fills the
    // tidier spacing for groups generated with the old cramped constants, so
    // existing projects fix themselves on load without regenerating.
    relayoutShotGroups: (scriptId: string) => {
      const { nodes, edges } = get();
      const scriptNode = nodes.find((n) => n.id === scriptId);
      if (!scriptNode || scriptNode.kind !== "script") return;

      const groupIds = edges
        .filter((e) => e.from === scriptId && e.toHandle === "group-in")
        .map((e) => e.to);
      if (groupIds.length === 0) return;

      set((s) => {
        const byId = new Map(s.nodes.map((n) => [n.id, n]));
        const moved = new Map<string, { x: number; y: number }>();
        const resized = new Map<string, { groupWidth: number; groupHeight: number }>();

        for (const gid of groupIds) {
          const group = byId.get(gid);
          if (!group || group.kind !== "nodeGroup" || !group.data.frame) continue;
          const memberIds = group.data.memberIds ?? [];
          const members = memberIds.map((id) => byId.get(id)).filter((n): n is CanvasNode => !!n);
          if (members.length === 0) continue;

          const isVideo = members.every((m) => m.kind === "generateVideo");
          const cellW = isVideo ? VID_W : IMG_W;
          const cellH = isVideo ? VID_H : IMG_H;
          const { cols, groupW, groupH } = frameGroupBox(members.length, cellW, cellH);
          const baseX = group.x + FRAME_PAD;
          const baseY = group.y + FRAME_PAD + FRAME_HEADER;

          members.forEach((m, i) => {
            const cell = gridCell(i, cols, {
              baseX,
              baseY,
              cellW,
              cellH,
              gapX: FRAME_GAP_X,
              gapY: FRAME_GAP_Y,
            });
            moved.set(m.id, cell);
          });
          resized.set(gid, { groupWidth: groupW, groupHeight: groupH });
        }

        if (moved.size === 0 && resized.size === 0) return {};
        return {
          nodes: s.nodes.map((n) => {
            const pos = moved.get(n.id);
            if (pos) return { ...n, x: pos.x, y: pos.y };
            const dim = resized.get(n.id);
            if (dim && n.kind === "nodeGroup") {
              return { ...n, data: { ...n.data, ...dim } };
            }
            return n;
          }),
        };
      });
    },
  };
}
