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
      return { id, kind, x, y, data: { name, src: `https://picsum.photos/seed/${seed}/400/225` } };
    case "generateImage":
      return { id, kind, x, y, data: { name } };
    case "generateVideo":
      return { id, kind, x, y, data: { name } };
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

export const useCanvas = create<StoreState>((set, get) => ({
  projectId: DEFAULT_PROJECT_ID,
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
    scheduleSave();
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

  batchUpdatePositions: (updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) => {
        const pos = updates[n.id];
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      }),
    }));
    scheduleSave();
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
    get().pushHistory();
    const id = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
    const x = 600 + Math.random() * 80;
    const y = 200 + Math.random() * 80;
    const name =
      kind === "composition"
        ? `视频合成 ${get().nodes.filter((n) => n.kind === "composition").length + 1}`
        : undefined;
    const node = createNodeByKind(kind, id, x, y, name);
    set((s) => ({ nodes: [...s.nodes, node] }));
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
