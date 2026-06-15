import { create } from "zustand";
import { initialNodes, initialEdges } from "@/data/mockData";
import {
  type CanvasNode,
  type Edge,
  type StoreState,
  compDuration,
  SCRIPT_MODELS,
} from "./types";
import { createCompositionSlice } from "./compositionSlice";
import { createStoryboardSlice } from "./storyboardSlice";
import { createGroupSlice } from "./groupSlice";
import { createScriptSlice } from "./scriptSlice";

// ── Re-export everything from types for backward compatibility ───────────────

export {
  type NodeKind,
  type ShotStatus,
  type TrackKind,
  type Clip,
  type Track,
  type AspectRatio,
  type StoryboardCell,
  type StoryboardData,
  type ScriptCharacter,
  type ScriptShot,
  type ScriptStatus,
  type ScriptView,
  type ScriptColumnKey,
  type ScriptFilter,
  type ScriptData,
  type ScriptAsset,
  type AssetGenerationStatus,
  type WizardStep,
  type FinalPromptStatus,
  type CanvasNode,
  type Edge,
  type ContextMenuState,
  MAX_VIDEO_TRACKS,
  STORYBOARD_RATIOS,
  STORYBOARD_PRESETS,
  STORYBOARD_MAX,
  STORYBOARD_CELL_PX,
  STORYBOARD_GAP_PX,
  DEFAULT_RATIO,
  SCRIPT_MODELS,
  SCRIPT_NODE_WIDTH,
  SCRIPT_SHOT_TYPES,
  clipEnd,
  trackDuration,
  compDuration,
  clipAt,
  colorHexMap,
} from "./types";

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCanvas = create<StoreState>((set, get) => ({
  projectName: "古风短片 · Demo",
  nodes: initialNodes,
  edges: initialEdges,
  selectedId: null,
  panelOpen: false,
  exportOpen: false,
  contextMenu: null,
  past: [],
  future: [],

  editorCompId: null,
  editorMode: "full",
  selectedClipId: null,
  editorScriptId: null,
  batchVideoSbId: null,

  setProjectName: (n) => set({ projectName: n }),

  pushHistory: () => {
    const { nodes, edges, past } = get();
    set({
      past: [...past.slice(-49), { nodes: structuredClone(nodes), edges: structuredClone(edges) }],
      future: [],
    });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [{ nodes, edges }, ...future].slice(0, 50),
      nodes: prev.nodes,
      edges: prev.edges,
    });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    if (!future.length) return;
    const next = future[0];
    set({
      future: future.slice(1),
      past: [...past, { nodes, edges }].slice(-50),
      nodes: next.nodes,
      edges: next.edges,
    });
  },

  setNodes: (nodes) => set({ nodes }),

  batchUpdatePositions: (updates) =>
    set((s) => ({
      nodes: s.nodes.map((n) => {
        const pos = updates[n.id];
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      }),
    })),

  updateNode: (id, patch) =>
    set((s) => {
      const prevNode = s.nodes.find((n) => n.id === id);
      const updated = s.nodes.map((n) =>
        n.id === id
          ? typeof patch === "function"
            ? patch(n)
            : { ...n, ...patch, data: { ...n.data, ...(patch as Partial<CanvasNode>).data } }
          : n,
      );
      const changedNode = updated.find((n) => n.id === id);
      // Only run binding sync when `data.src` actually changed
      if (changedNode?.data.src && changedNode.data.src !== prevNode?.data.src) {
        return {
          nodes: updated.map((n) => {
            if (!n.data.tracks) return n;
            const hasBound = n.data.tracks.some((t) =>
              t.clips.some((c) => c.bindings.includes(id)),
            );
            if (!hasBound) return n;
            return {
              ...n,
              data: {
                ...n.data,
                tracks: n.data.tracks.map((t) => ({
                  ...t,
                  clips: t.clips.map((c) =>
                    c.bindings.includes(id) ? { ...c, thumbnail: changedNode.data.src } : c,
                  ),
                })),
              },
            };
          }),
        };
      }
      return { nodes: updated };
    }),

  addNode: (kind) => {
    get().pushHistory();
    const id = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
    const seed = Math.random().toString(36).slice(2, 7);
    const center = { x: 600 + Math.random() * 80, y: 200 + Math.random() * 80 };
    const base: CanvasNode = {
      id,
      kind,
      x: center.x,
      y: center.y,
      data: {
        name:
          kind === "composition"
            ? `视频合成 ${get().nodes.filter((n) => n.kind === "composition").length + 1}`
            : kind === "image"
              ? "新图片"
              : kind === "generateImage"
                ? "AI 生图"
                : kind === "audio"
                  ? "音频"
                  : kind === "text"
                    ? "剧本"
                    : kind === "script"
                      ? "未命名脚本"
                      : "AI 视频",
      },
    };
    if (kind === "image") base.data.src = `https://picsum.photos/seed/${seed}/400/225`;
    if (kind === "composition") {
      base.data.width = 1200;
      base.data.pxPerSecond = 60;
      base.data.tracks = [];
    }
    if (kind === "audio") {
      base.data.duration = 5;
      base.data.waveform = "";
    }
    if (kind === "text") {
      base.data.text = "";
    }
    if (kind === "script") {
      base.data.script = {
        title: "未命名脚本",
        promptText: "",
        model: SCRIPT_MODELS[0],
        status: "empty",
        view: "table",
        shots: [],
        hiddenColumns: [],
        filter: {},
        wizardStep: 1,
      };
    }
    set((s) => ({ nodes: [...s.nodes, base] }));
  },

  removeNode: (id) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.from !== id && e.to !== id),
    }));
  },

  addEdge: (from, to, sourceHandle?, toHandle?) => {
    const exists = get().edges.some((e) => e.from === from && e.to === to);
    if (exists) return;
    get().pushHistory();
    const edge: Edge = { id: `e-${Date.now()}`, from, to };
    if (sourceHandle) edge.sourceHandle = sourceHandle;
    if (toHandle) edge.toHandle = toHandle;
    set((s) => ({ edges: [...s.edges, edge] }));
    const { nodes } = get();
    const fromNode = nodes.find((n) => n.id === from);
    const toNode = nodes.find((n) => n.id === to);
    if (fromNode?.kind === "audio" && toNode?.kind === "composition") {
      get().addAudioClipFromNode(to, from);
    }
  },

  removeEdge: (id) => {
    get().pushHistory();
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
  },

  select: (id) =>
    set((s) => {
      const node = id ? s.nodes.find((n) => n.id === id) : null;
      const showPanel = !!id && node?.kind !== "generateVideo";
      return { selectedId: id, panelOpen: showPanel };
    }),

  togglePanel: (open) => set((s) => ({ panelOpen: open ?? !s.panelOpen })),
  setExport: (v) => set({ exportOpen: v }),
  setContextMenu: (m) => set({ contextMenu: m }),

  // ── Computed ──────────────────────────────────────────────────────────────────

  totalDuration: () => {
    const { nodes } = get();
    return nodes
      .filter((n) => n.kind === "composition")
      .reduce((max, n) => Math.max(max, compDuration(n.data.tracks ?? [])), 0);
  },

  shotCount: () =>
    get()
      .nodes.filter((n) => n.kind === "composition")
      .reduce((a, n) => a + (n.data.tracks ?? []).reduce((sum, t) => sum + t.clips.length, 0), 0),

  compositionCount: () => get().nodes.filter((n) => n.kind === "composition").length,

  // ── Domain slices ──────────────────────────────────────────────────────────────

  ...createCompositionSlice(set, get),
  ...createStoryboardSlice(set, get),
  ...createGroupSlice(set, get),
  ...createScriptSlice(set, get),
}));
