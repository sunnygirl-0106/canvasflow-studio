import { create } from "zustand";
import { initialNodes, initialEdges } from "@/data/mockData";
import { loadProject, saveProject } from "@/services/api";
import {
  type CanvasNode,
  type Edge,
  type NodeKind,
  type StoreState,
  type SaveStatus,
  compDuration,
  NODE_DEFAULT_NAMES,
  SCRIPT_MODELS,
} from "./types";
import { createCompositionSlice } from "./compositionSlice";
import { createStoryboardSlice } from "./storyboardSlice";
import { createGroupSlice } from "./groupSlice";
import { createScriptSlice } from "./scriptSlice";

// Re-export everything from types so existing component imports keep working.
// NOTE: `export *` skips names that are locally imported, so we must explicitly
// re-export the ones used in this file.
export * from "./types";
export type { CanvasNode, Edge, NodeKind, StoreState, SaveStatus };
export { compDuration, NODE_DEFAULT_NAMES, SCRIPT_MODELS };

// ── Node factory ────────────────────────────────────────────────────────────

function createNodeByKind(
  kind: NodeKind,
  id: string,
  x: number,
  y: number,
  nameOverride?: string,
): CanvasNode {
  const name = nameOverride ?? NODE_DEFAULT_NAMES[kind];
  const seed = Math.random().toString(36).slice(2, 7);

  switch (kind) {
    case "image":
      return {
        id,
        kind,
        x,
        y,
        data: {
          name,
          src: `https://picsum.photos/seed/${seed}/400/225`,
          status: "ready",
          model: "phan-nano-l",
        },
      };
    case "generateImage":
      return {
        id,
        kind,
        x,
        y,
        data: {
          name,
          status: "empty",
          model: "phan-nano-l",
          prompt: "",
          estimatedCost: 36,
        },
      };
    case "generateVideo":
      return {
        id,
        kind,
        x,
        y,
        data: {
          name,
          status: "empty",
          videoMode: "text",
          model: "SD 2.0",
          aspect: "9:16",
          resolution: "720p",
          duration: 5,
          withSound: true,
          prompt: "",
          estimatedCost: 788,
        },
      };
    case "composition":
      return { id, kind, x, y, data: { name, width: 1200, pxPerSecond: 60, tracks: [] } };
    case "audio":
      return { id, kind, x, y, data: { name, duration: 5, waveform: "" } };
    case "nodeGroup":
      return {
        id,
        kind,
        x,
        y,
        data: { name, memberIds: [], members: [], groupColor: "#56C7CF", groupLayout: "grid" },
      };
    case "storyboard":
      return {
        id,
        kind,
        x,
        y,
        data: {
          name,
          storyboard: { rows: 0, cols: 0, ratio: "16:9", showIndex: false, cells: [] },
        },
      };
    case "text":
      return { id, kind, x, y, data: { name, text: "" } };
    case "script":
      return {
        id,
        kind,
        x,
        y,
        data: {
          name,
          script: {
            title: "未命名脚本",
            promptText: "",
            model: SCRIPT_MODELS[0],
            status: "empty",
            view: "table",
            shots: [],
            hiddenColumns: [],
            filter: {},
            wizardStep: 1,
          },
        },
      };
  }
}

// ── Helpers for discriminated-union node access ─────────────────────────────

function getNodeSrc(n: CanvasNode): string | undefined {
  if (n.kind === "image" || n.kind === "generateImage" || n.kind === "generateVideo")
    return n.data.src;
  return undefined;
}

function getNodeTracks(n: CanvasNode) {
  return n.kind === "composition" ? n.data.tracks : undefined;
}

// ── Sanitise transient states after reload ───────────────────────────────────
// No background task survives a page refresh, so "in-progress" states are stale.

function sanitizeNodes(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.map((n) => {
    if (n.kind === "image" || n.kind === "generateImage") {
      const status = n.data.status ?? (n.data.src ? "ready" : "empty");
      const fixed = status === "generating" ? "empty" : status;
      // Per refactor 原则 A: a node with no main image must not carry a
      // persisted `useMainImage`. Older saves baked in `true`, which would
      // keep the toggle checked on empty nodes regardless of the new
      // derived default. Strip it so the panel falls back to `?? hasMain`.
      const hasMain = !!n.data.src && fixed === "ready";
      const staleMainFlag = !hasMain && n.data.useMainImage !== undefined;
      if (fixed !== n.data.status || staleMainFlag) {
        const data = { ...n.data, status: fixed };
        if (staleMainFlag) delete (data as { useMainImage?: boolean }).useMainImage;
        return { ...n, data } as CanvasNode;
      }
    }
    if (n.kind === "generateVideo") {
      const status = n.data.status ?? (n.data.src ? "ready" : "empty");
      const fixed = status === "generating" ? "empty" : status;
      if (fixed !== n.data.status) {
        return { ...n, data: { ...n.data, status: fixed } } as CanvasNode;
      }
    }
    if (n.kind === "nodeGroup" && n.data.executing) {
      return { ...n, data: { ...n.data, executing: false } };
    }
    if (n.kind === "script" && n.data.script) {
      const s = n.data.script;
      let changed = false;
      let script = s;

      // Script-level generating → failed
      if (s.status === "generating") {
        script = { ...script, status: "failed" as const, progress: 0, error: "中断：页面已刷新" };
        changed = true;
      }

      // Shot finalPromptStatus composing → pending
      const hasComposing = s.shots.some((sh) => sh.finalPromptStatus === "composing");
      if (hasComposing) {
        script = {
          ...script,
          shots: script.shots.map((sh) =>
            sh.finalPromptStatus === "composing"
              ? { ...sh, finalPromptStatus: "pending" as const }
              : sh,
          ),
        };
        changed = true;
      }

      // Asset generating → failed
      if (s.assets?.some((a) => a.generationStatus?.state === "generating")) {
        script = {
          ...script,
          assets: script.assets?.map((a) =>
            a.generationStatus?.state === "generating"
              ? { ...a, generationStatus: { state: "failed" as const, error: "中断：页面已刷新" } }
              : a,
          ),
        };
        changed = true;
      }

      if (changed) return { ...n, data: { ...n.data, script } };
    }
    if (n.kind === "composition") {
      const hasGenerating = n.data.tracks.some((t) =>
        t.clips.some((c) => c.status === "generating"),
      );
      if (hasGenerating) {
        return {
          ...n,
          data: {
            ...n.data,
            tracks: n.data.tracks.map((t) => ({
              ...t,
              clips: t.clips.map((c) =>
                c.status === "generating" ? { ...c, status: "failed" as const } : c,
              ),
            })),
          },
        };
      }
    }
    return n;
  });
}

// ── Reconcile editor/selection refs after undo/redo ─────────────────────────
// A history snapshot only restores {nodes, edges}. If the restored canvas no
// longer contains the node an open editor / selection points at, those ids
// dangle (e.g. editorCompId referencing a composition that was just undone away,
// which would crash the editor). Null out any ref whose target is gone.

function reconcileEditorRefs(restoredNodes: CanvasNode[], s: StoreState): Partial<StoreState> {
  const ids = new Set(restoredNodes.map((n) => n.id));
  const patch: Partial<StoreState> = {};
  if (s.selectedId && !ids.has(s.selectedId)) patch.selectedId = null;
  if (s.editorCompId && !ids.has(s.editorCompId)) {
    patch.editorCompId = null;
    patch.selectedClipId = null;
  }
  if (s.editorScriptId && !ids.has(s.editorScriptId)) patch.editorScriptId = null;
  if (s.batchVideoSbId && !ids.has(s.batchVideoSbId)) patch.batchVideoSbId = null;
  return patch;
}

// ── Store ─────────────────────────────────────────────────────────────────────

// ── Auto-save (debounced) ──────────────────────────────────────────────────

const DEFAULT_PROJECT_ID = "proj-1";
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    useCanvas.getState().saveToServer();
  }, 2000);
}

function cancelScheduledSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

export const useCanvas = create<StoreState>((set, get) => ({
  projectId: DEFAULT_PROJECT_ID,
  projectName: "古风短片 · Demo",
  nodes: initialNodes,
  edges: initialEdges,
  selectedId: null,
  panelOpen: false,
  exportOpen: false,
  contextMenu: null,
  addPanel: { open: false },
  past: [],
  future: [],

  editorCompId: null,
  editorMode: "full",
  selectedClipId: null,
  editorScriptId: null,
  batchVideoSbId: null,
  saveStatus: "idle" as SaveStatus,

  setProjectName: (n) => set({ projectName: n }),

  loadFromServer: async (id: string) => {
    try {
      const project = await loadProject(id);
      set({
        projectId: project.id,
        projectName: project.name,
        nodes: sanitizeNodes((project.canvas.nodes ?? []) as CanvasNode[]),
        edges: (project.canvas.edges ?? []) as Edge[],
        past: [],
        future: [],
        saveStatus: "saved",
      });
      // Self-heal: reconcile each script's asset group so generated assets are
      // mounted as real image nodes — including older projects saved before this
      // logic existed, or ones left empty by the previous one-shot latch bug.
      for (const n of get().nodes) {
        if (n.kind === "script") get().materializeAssetGroups(n.id);
      }
      // The subscription below schedules a save on every nodes/edges change,
      // including this one. Cancel it so a fresh load doesn't immediately
      // round-trip back to the server.
      cancelScheduledSave();
    } catch {
      // Failed to load — keep current mock data
      console.warn(`Failed to load project ${id}, using mock data`);
      set({ projectId: id, saveStatus: "idle" });
    }
  },

  saveToServer: async () => {
    const { projectId, projectName, nodes, edges } = get();
    set({ saveStatus: "saving" });
    try {
      await saveProject(projectId, projectName, { nodes, edges });
      set({ saveStatus: "saved" });
    } catch {
      console.error("Failed to save project");
      set({ saveStatus: "error" });
    }
  },

  pushHistory: () => {
    const { nodes, edges, past } = get();
    set({
      past: [...past.slice(-49), { nodes: structuredClone(nodes), edges: structuredClone(edges) }],
      future: [],
    });
  },

  undo: () => {
    const s = get();
    if (!s.past.length) return;
    const prev = s.past[s.past.length - 1];
    set({
      past: s.past.slice(0, -1),
      future: [{ nodes: s.nodes, edges: s.edges }, ...s.future].slice(0, 50),
      nodes: prev.nodes,
      edges: prev.edges,
      ...reconcileEditorRefs(prev.nodes, s),
    });
  },

  redo: () => {
    const s = get();
    if (!s.future.length) return;
    const next = s.future[0];
    set({
      future: s.future.slice(1),
      past: [...s.past, { nodes: s.nodes, edges: s.edges }].slice(-50),
      nodes: next.nodes,
      edges: next.edges,
      ...reconcileEditorRefs(next.nodes, s),
    });
  },

  setNodes: (nodes) => set({ nodes }),

  batchUpdatePositions: (updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) => {
        const pos = updates[n.id];
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      }),
    }));
  },

  updateNode: (id, patch) =>
    set((s) => {
      const prevNode = s.nodes.find((n) => n.id === id);
      const updated: CanvasNode[] = s.nodes.map((n) =>
        n.id === id
          ? typeof patch === "function"
            ? patch(n)
            : { ...n, ...patch, data: { ...n.data, ...(patch as Partial<CanvasNode>).data } }
          : n,
      ) as CanvasNode[];
      const changedNode = updated.find((n) => n.id === id);
      const changedSrc = changedNode ? getNodeSrc(changedNode) : undefined;
      const prevSrc = prevNode ? getNodeSrc(prevNode) : undefined;
      // Sync binding thumbnails when src changes
      if (changedSrc && changedSrc !== prevSrc) {
        return {
          nodes: updated.map((n) => {
            const tracks = getNodeTracks(n);
            if (!tracks) return n;
            const hasBound = tracks.some((t) => t.clips.some((c) => c.bindings.includes(id)));
            if (!hasBound) return n;
            return {
              ...n,
              data: {
                ...n.data,
                tracks: tracks.map((t) => ({
                  ...t,
                  clips: t.clips.map((c) =>
                    c.bindings.includes(id) ? { ...c, thumbnail: changedSrc } : c,
                  ),
                })),
              },
            } as CanvasNode;
          }),
        };
      }
      return { nodes: updated };
    }),

  addNode: (kind) => {
    const x = 600 + Math.random() * 80;
    const y = 200 + Math.random() * 80;
    return get().addNodeAtPosition(kind, x, y);
  },

  addNodeAtPosition: (kind, x, y) => {
    get().pushHistory();
    const id = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
    const existing = get().nodes;
    let name: string | undefined;
    if (kind === "composition") {
      name = `视频合成 ${existing.filter((n) => n.kind === "composition").length + 1}`;
    } else if (kind === "image" || kind === "generateImage") {
      const count = existing.filter((n) => n.kind === "image" || n.kind === "generateImage").length;
      name = `图片${count + 1}`;
    } else if (kind === "generateVideo") {
      const count = existing.filter((n) => n.kind === "generateVideo").length;
      name = `视频${count + 1}`;
    }
    const node = createNodeByKind(kind, id, x, y, name);
    set((s) => ({ nodes: [...s.nodes, node] }));
    return id;
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
      const usesToolbarPanel =
        node?.kind === "generateVideo" || node?.kind === "generateImage" || node?.kind === "image";
      const showPanel = !!id && !!node && !usesToolbarPanel;
      return { selectedId: id, panelOpen: showPanel };
    }),

  togglePanel: (open) => set((s) => ({ panelOpen: open ?? !s.panelOpen })),
  setExport: (v) => set({ exportOpen: v }),
  setContextMenu: (m) => set({ contextMenu: m }),
  setAddPanel: (panel) => set({ addPanel: panel }),

  totalDuration: () => {
    const { nodes } = get();
    return nodes
      .filter((n): n is CanvasNode & { kind: "composition" } => n.kind === "composition")
      .reduce((max, n) => Math.max(max, compDuration(n.data.tracks)), 0);
  },

  shotCount: () =>
    get()
      .nodes.filter((n): n is CanvasNode & { kind: "composition" } => n.kind === "composition")
      .reduce((a, n) => a + n.data.tracks.reduce((sum, t) => sum + t.clips.length, 0), 0),

  compositionCount: () => get().nodes.filter((n) => n.kind === "composition").length,

  ...createCompositionSlice(set, get),
  ...createStoryboardSlice(set, get),
  ...createGroupSlice(set, get),
  ...createScriptSlice(set, get),
}));

// Persist any nodes/edges mutation. Catches every slice path (updateNode,
// asset generation, composition edits, etc.) uniformly — without this each
// mutation site would need its own scheduleSave() call, and the existing
// ones were inconsistent (image generation completion was silently dropped).
useCanvas.subscribe((curr, prev) => {
  if (curr.nodes !== prev.nodes || curr.edges !== prev.edges) {
    scheduleSave();
  }
});
