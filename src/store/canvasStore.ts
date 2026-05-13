import { create } from "zustand";
import { initialNodes, initialEdges } from "@/data/mockData";

export type NodeKind = "image" | "generateImage" | "generateVideo" | "timeline";
export type ShotStatus = "empty" | "ready" | "generating" | "failed";

export interface Shot {
  id: string;
  name: string;
  index: number;
  duration: number;
  sourceIn: number;
  sourceOut: number;
  bindings: string[];
  thumbnail?: string;
  color: "cyan" | "purple" | "yellow" | "gray";
  status: ShotStatus;
}

export interface CanvasNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  data: {
    src?: string;
    name?: string;
    duration?: number;
    width?: number;
    pxPerSecond?: number;
    shots?: Shot[];
  };
}

export interface Edge {
  id: string;
  from: string;
  to: string;
}

type Snapshot = { nodes: CanvasNode[]; edges: Edge[] };

interface State {
  projectName: string;
  nodes: CanvasNode[];
  edges: Edge[];
  selectedId: string | null;
  selectedShotId: string | null;
  panelOpen: boolean;
  exportOpen: false | "fcpxml" | "edl";
  past: Snapshot[];
  future: Snapshot[];
  setProjectName: (n: string) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setNodes: (n: CanvasNode[]) => void;
  updateNode: (id: string, patch: Partial<CanvasNode> | ((n: CanvasNode) => CanvasNode)) => void;
  addNode: (kind: NodeKind) => void;
  removeNode: (id: string) => void;
  addEdge: (from: string, to: string) => void;
  removeEdge: (id: string) => void;
  select: (id: string | null) => void;
  selectShot: (id: string | null) => void;
  togglePanel: (open?: boolean) => void;
  setExport: (v: State["exportOpen"]) => void;
  // shot helpers
  updateShot: (timelineId: string, shotId: string, patch: Partial<Shot>) => void;
  addShot: (timelineId: string) => void;
  removeShot: (timelineId: string, shotId: string) => void;
  reorderShots: (timelineId: string, ids: string[]) => void;
  bindNodeToShot: (nodeId: string, shotId: string) => void;
  // computed
  totalDuration: () => number;
  shotCount: () => number;
  timelineCount: () => number;
}

const colorFor = (kind: NodeKind): Shot["color"] => {
  if (kind === "image") return "cyan";
  if (kind === "generateVideo") return "purple";
  if (kind === "generateImage") return "yellow";
  return "gray";
};

export const useCanvas = create<State>((set, get) => ({
  projectName: "古风短片 · Demo",
  nodes: initialNodes,
  edges: initialEdges,
  selectedId: null,
  selectedShotId: null,
  panelOpen: false,
  exportOpen: false,
  past: [],
  future: [],

  setProjectName: (n) => set({ projectName: n }),

  pushHistory: () => {
    const { nodes, edges, past } = get();
    const snap: Snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({ past: [...past.slice(-49), snap], future: [] });
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
  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? (typeof patch === "function" ? patch(n) : { ...n, ...patch, data: { ...n.data, ...(patch as any).data } }) : n,
      ),
    })),

  addNode: (kind) => {
    get().pushHistory();
    const id = `${kind}-${Date.now()}`;
    const seed = Math.random().toString(36).slice(2, 7);
    const center = { x: 600 + Math.random() * 80, y: 200 + Math.random() * 80 };
    const base: CanvasNode = {
      id,
      kind,
      x: center.x,
      y: center.y,
      data: {
        name:
          kind === "timeline"
            ? `时间线 ${get().nodes.filter((n) => n.kind === "timeline").length + 1}`
            : kind === "image"
              ? "新图片"
              : kind === "generateImage"
                ? "AI 生图"
                : "AI 视频",
      },
    };
    if (kind === "image") base.data.src = `https://picsum.photos/seed/${seed}/400/225`;
    if (kind === "timeline") {
      base.data.width = 1200;
      base.data.pxPerSecond = 60;
      base.data.shots = [];
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

  addEdge: (from, to) => {
    const exists = get().edges.some((e) => e.from === from && e.to === to);
    if (exists) return;
    get().pushHistory();
    set((s) => ({ edges: [...s.edges, { id: `e-${Date.now()}`, from, to }] }));
    // if to is a shot, bind
    const shot = findShot(get().nodes, to);
    if (shot) get().bindNodeToShot(from, to);
  },

  removeEdge: (id) => {
    get().pushHistory();
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
  },

  select: (id) => set({ selectedId: id, selectedShotId: null, panelOpen: !!id }),
  selectShot: (id) => set({ selectedShotId: id, selectedId: null, panelOpen: !!id }),
  togglePanel: (open) => set((s) => ({ panelOpen: open ?? !s.panelOpen })),
  setExport: (v) => set({ exportOpen: v }),

  updateShot: (timelineId, shotId, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === timelineId
          ? {
              ...n,
              data: {
                ...n.data,
                shots: (n.data.shots ?? []).map((sh) => (sh.id === shotId ? { ...sh, ...patch } : sh)),
              },
            }
          : n,
      ),
    })),

  addShot: (timelineId) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== timelineId) return n;
        const shots = n.data.shots ?? [];
        const idx = shots.length;
        const newShot: Shot = {
          id: `shot-new-${Date.now()}`,
          name: `Shot ${String(idx + 1).padStart(2, "0")}`,
          index: idx,
          duration: 3,
          sourceIn: 0,
          sourceOut: 3,
          bindings: [],
          color: "gray",
          status: "empty",
        };
        return { ...n, data: { ...n.data, shots: [...shots, newShot] } };
      }),
    }));
  },

  removeShot: (timelineId, shotId) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === timelineId
          ? { ...n, data: { ...n.data, shots: (n.data.shots ?? []).filter((sh) => sh.id !== shotId) } }
          : n,
      ),
      edges: s.edges.filter((e) => e.to !== shotId),
    }));
  },

  reorderShots: (timelineId, ids) =>
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== timelineId) return n;
        const map = new Map((n.data.shots ?? []).map((sh) => [sh.id, sh]));
        const next = ids.map((id, i) => ({ ...(map.get(id) as Shot), index: i }));
        return { ...n, data: { ...n.data, shots: next } };
      }),
    })),

  bindNodeToShot: (nodeId, shotId) => {
    const { nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const tl = nodes.find((n) => n.data.shots?.some((sh) => sh.id === shotId));
    if (!tl) return;
    get().updateShot(tl.id, shotId, {
      bindings: Array.from(new Set([nodeId])),
      color: colorFor(node.kind),
      thumbnail: node.data.src,
      status: "ready",
    });
  },

  totalDuration: () =>
    get()
      .nodes.filter((n) => n.kind === "timeline")
      .reduce((sum, t) => sum + (t.data.shots ?? []).reduce((a, s) => a + s.duration, 0), 0),
  shotCount: () =>
    get()
      .nodes.filter((n) => n.kind === "timeline")
      .reduce((a, t) => a + (t.data.shots?.length ?? 0), 0),
  timelineCount: () => get().nodes.filter((n) => n.kind === "timeline").length,
}));

function findShot(nodes: CanvasNode[], id: string): Shot | undefined {
  for (const n of nodes) {
    const s = n.data.shots?.find((sh) => sh.id === id);
    if (s) return s;
  }
}

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
