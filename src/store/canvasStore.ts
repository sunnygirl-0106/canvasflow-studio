import { create } from "zustand";
import { initialNodes, initialEdges } from "@/data/mockData";

export type NodeKind = "image" | "generateImage" | "generateVideo" | "composition";
export type ShotStatus = "empty" | "ready" | "generating" | "failed";

export interface Shot {
  id: string;
  name: string;
  index: number;
  duration: number;
  baseDuration: number;
  speed: number;
  sourceIn: number;
  sourceOut: number;
  bindings: string[];
  thumbnail?: string;
  color: "cyan" | "purple" | "yellow" | "rose" | "emerald" | "gray";
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
  toHandle?: string;
  sourceHandle?: string;
  color?: string;
}

type Snapshot = { nodes: CanvasNode[]; edges: Edge[] };

export interface ContextMenuState {
  x: number;
  y: number;
  /** null = right-clicked on empty pane */
  targetNodeId: string | null;
}

interface State {
  projectName: string;
  nodes: CanvasNode[];
  edges: Edge[];
  selectedId: string | null;
  selectedShotId: string | null;
  panelOpen: boolean;
  exportOpen: false | "fcpxml" | "edl";
  contextMenu: ContextMenuState | null;
  past: Snapshot[];
  future: Snapshot[];

  // editor state
  editorCompId: string | null;
  editorMode: "full" | "collapsed";
  selectedClipId: string | null;

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
  updateShot: (compId: string, shotId: string, patch: Partial<Shot>) => void;
  addShot: (compId: string) => void;
  removeShot: (compId: string, shotId: string) => void;
  reorderShots: (compId: string, ids: string[]) => void;
  bindNodeToShot: (nodeId: string, shotId: string) => void;
  mergeToComposition: (nodeIds: string[]) => string | null;
  addToComposition: (nodeId: string) => string | null;
  setContextMenu: (m: ContextMenuState | null) => void;

  // editor actions
  openComposition: (id: string) => void;
  closeComposition: () => void;
  setEditorMode: (m: "full" | "collapsed") => void;
  selectClip: (id: string | null) => void;

  // clip operations
  splitClip: (compId: string, clipId: string, atSec: number) => void;
  cropClip: (compId: string, clipId: string, side: "left" | "right", atSec: number) => void;
  setClipSpeed: (compId: string, clipId: string, speed: number) => void;

  // computed
  totalDuration: () => number;
  shotCount: () => number;
  compositionCount: () => number;
}

const SHOT_COLORS: Shot["color"][] = ["cyan", "purple", "yellow", "rose", "emerald"];

const colorByIndex = (index: number): Shot["color"] => SHOT_COLORS[index % SHOT_COLORS.length];

const colorHexMap: Record<Shot["color"], string> = {
  cyan: "#56C7CF",
  purple: "#7C3AED",
  yellow: "#F97316",
  rose: "#F43F5E",
  emerald: "#10B981",
  gray: "#94A3B8",
};

export const useCanvas = create<State>((set, get) => ({
  projectName: "古风短片 · Demo",
  nodes: initialNodes,
  edges: initialEdges,
  selectedId: null,
  selectedShotId: null,
  panelOpen: false,
  exportOpen: false,
  contextMenu: null,
  past: [],
  future: [],

  // editor state
  editorCompId: null,
  editorMode: "full",
  selectedClipId: null,

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
    set((s) => {
      const updated = s.nodes.map((n) =>
        n.id === id ? (typeof patch === "function" ? patch(n) : { ...n, ...patch, data: { ...n.data, ...(patch as any).data } }) : n,
      );
      // Propagate src changes to bound shots' thumbnails
      const changedNode = updated.find((n) => n.id === id);
      if (changedNode?.data.src) {
        return {
          nodes: updated.map((n) => {
            if (!n.data.shots) return n;
            const hasBinding = n.data.shots.some((sh: Shot) => sh.bindings.includes(id));
            if (!hasBinding) return n;
            return {
              ...n,
              data: {
                ...n.data,
                shots: n.data.shots.map((sh: Shot) =>
                  sh.bindings.includes(id) ? { ...sh, thumbnail: changedNode.data.src } : sh,
                ),
              },
            };
          }),
        };
      }
      return { nodes: updated };
    }),

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
          kind === "composition"
            ? `视频合成 ${get().nodes.filter((n) => n.kind === "composition").length + 1}`
            : kind === "image"
              ? "新图片"
              : kind === "generateImage"
                ? "AI 生图"
                : "AI 视频",
      },
    };
    if (kind === "image") base.data.src = `https://picsum.photos/seed/${seed}/400/225`;
    if (kind === "composition") {
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

  select: (id) => set((s) => {
    const node = id ? s.nodes.find((n) => n.id === id) : null;
    const showPanel = !!id && node?.kind !== "generateVideo";
    return { selectedId: id, selectedShotId: null, panelOpen: showPanel };
  }),
  selectShot: (id) => set({ selectedShotId: id, selectedId: null, panelOpen: !!id }),
  togglePanel: (open) => set((s) => ({ panelOpen: open ?? !s.panelOpen })),
  setExport: (v) => set({ exportOpen: v }),

  updateShot: (compId, shotId, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === compId
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

  addShot: (compId) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== compId) return n;
        const shots = n.data.shots ?? [];
        const idx = shots.length;
        const newShot: Shot = {
          id: `shot-new-${Date.now()}`,
          name: `Shot ${String(idx + 1).padStart(2, "0")}`,
          index: idx,
          duration: 3,
          baseDuration: 3,
          speed: 1,
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

  removeShot: (compId, shotId) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === compId
          ? { ...n, data: { ...n.data, shots: (n.data.shots ?? []).filter((sh) => sh.id !== shotId) } }
          : n,
      ),
      edges: s.edges.filter((e) => e.to !== shotId),
    }));
  },

  reorderShots: (compId, ids) =>
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== compId) return n;
        const map = new Map((n.data.shots ?? []).map((sh) => [sh.id, sh]));
        const next = ids.map((id, i) => ({ ...(map.get(id) as Shot), index: i }));
        return { ...n, data: { ...n.data, shots: next } };
      }),
    })),

  bindNodeToShot: (nodeId, shotId) => {
    const { nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const comp = nodes.find((n) => n.data.shots?.some((sh) => sh.id === shotId));
    if (!comp) return;
    const shot = comp.data.shots?.find((sh) => sh.id === shotId);
    get().updateShot(comp.id, shotId, {
      bindings: Array.from(new Set([nodeId])),
      color: shot?.color ?? colorByIndex(shot?.index ?? 0),
      thumbnail: node.data.src,
      status: "ready",
    });
  },

  mergeToComposition: (nodeIds) => {
    const { nodes } = get();
    const mediaKinds: NodeKind[] = ["image", "generateImage", "generateVideo"];
    const picked = nodes
      .filter((n) => nodeIds.includes(n.id) && mediaKinds.includes(n.kind))
      .sort((a, b) => a.x - b.x || a.y - b.y);
    if (picked.length < 2) return null;

    get().pushHistory();

    const ts = Date.now();
    const compId = `composition-${ts}`;
    // Position to the right of the selection
    const maxX = Math.max(...picked.map((n) => n.x));
    const minY = Math.min(...picked.map((n) => n.y));
    const maxY = Math.max(...picked.map((n) => n.y));
    const compNode: CanvasNode = {
      id: compId,
      kind: "composition",
      x: maxX + 400,
      y: (minY + maxY) / 2,
      data: {
        name: `视频合成 ${get().nodes.filter((n) => n.kind === "composition").length + 1}`,
        width: Math.max(1200, picked.length * 320),
        pxPerSecond: 60,
        shots: picked.map((n, i) => {
          const dur = n.data.duration ?? 3;
          return {
            id: `shot-${ts}-${i}`,
            name: `${n.data.name ?? "Shot"} · ${String(i + 1).padStart(2, "0")}`,
            index: i,
            duration: dur,
            baseDuration: dur,
            speed: 1,
            sourceIn: 0,
            sourceOut: dur,
            bindings: [n.id],
            thumbnail: n.data.src,
            color: colorByIndex(i),
            status: "ready" as const,
          };
        }),
      },
    };

    const newEdges: Edge[] = picked.map((n, i) => ({
      id: `e-${ts}-${i}`,
      from: n.id,
      to: compId,
      sourceHandle: "source-process",
      toHandle: "comp-in",
      color: colorHexMap[colorByIndex(i)],
    }));

    set((s) => ({
      nodes: [...s.nodes, compNode],
      edges: [...s.edges, ...newEdges],
      selectedId: compId,
      selectedShotId: null,
      panelOpen: true,
    }));
    return compId;
  },

  addToComposition: (nodeId) => {
    const { nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    const mediaKinds: NodeKind[] = ["image", "generateImage", "generateVideo"];
    if (!mediaKinds.includes(node.kind)) return null;

    get().pushHistory();

    const compositions = nodes.filter((n) => n.kind === "composition");
    const existingComp = compositions[compositions.length - 1] ?? null;
    const ts = Date.now();
    const compId = existingComp?.id ?? `composition-${ts}`;

    const baseShots = existingComp?.data.shots ?? [];
    const idx = baseShots.length;
    const shotId = `shot-${ts}-${idx}`;
    const dur = node.data.duration ?? 3;
    const newShot: Shot = {
      id: shotId,
      name: `${node.data.name ?? "Shot"} · ${String(idx + 1).padStart(2, "0")}`,
      index: idx,
      duration: dur,
      baseDuration: dur,
      speed: 1,
      sourceIn: 0,
      sourceOut: dur,
      bindings: [node.id],
      thumbnail: node.data.src,
      color: colorByIndex(idx),
      status: "ready",
    };

    const newEdge: Edge = {
      id: `e-${ts}`,
      from: node.id,
      to: compId,
      sourceHandle: "source-process",
      toHandle: "comp-in",
      color: colorHexMap[colorByIndex(idx)],
    };

    set((s) => {
      let nextNodes: CanvasNode[];
      if (existingComp) {
        nextNodes = s.nodes.map((n) =>
          n.id === compId
            ? { ...n, data: { ...n.data, shots: [...(n.data.shots ?? []), newShot] } }
            : n,
        );
      } else {
        const newComp: CanvasNode = {
          id: compId,
          kind: "composition",
          x: node.x + 400,
          y: node.y,
          data: {
            name: `视频合成 ${s.nodes.filter((n) => n.kind === "composition").length + 1}`,
            width: 1200,
            pxPerSecond: 60,
            shots: [newShot],
          },
        };
        nextNodes = [...s.nodes, newComp];
      }
      return {
        nodes: nextNodes,
        edges: [...s.edges, newEdge],
        selectedId: compId,
        selectedShotId: null,
        panelOpen: true,
      };
    });
    return compId;
  },

  setContextMenu: (m) => set({ contextMenu: m }),

  // editor actions
  openComposition: (id) => set({ editorCompId: id, editorMode: "full", selectedClipId: null }),
  closeComposition: () => set({ editorCompId: null, selectedClipId: null }),
  setEditorMode: (m) => set({ editorMode: m }),
  selectClip: (id) => set({ selectedClipId: id }),

  // clip operations
  splitClip: (compId, clipId, atSec) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== compId) return n;
        const shots = n.data.shots ?? [];
        const idx = shots.findIndex((sh) => sh.id === clipId);
        if (idx === -1) return n;
        const clip = shots[idx];

        // atSec is relative to the start of this clip
        if (atSec <= 0 || atSec >= clip.duration) return n;

        const leftDuration = atSec;
        const rightDuration = clip.duration - atSec;
        const leftBaseDuration = leftDuration * clip.speed;
        const rightBaseDuration = rightDuration * clip.speed;

        const left: Shot = {
          ...clip,
          duration: leftDuration,
          baseDuration: leftBaseDuration,
          sourceOut: clip.sourceIn + leftBaseDuration,
        };
        const right: Shot = {
          ...clip,
          id: `${clip.id}-split-${Date.now()}`,
          name: `${clip.name} (2)`,
          duration: rightDuration,
          baseDuration: rightBaseDuration,
          sourceIn: clip.sourceIn + leftBaseDuration,
        };

        const nextShots = [...shots.slice(0, idx), left, right, ...shots.slice(idx + 1)];
        // Re-index
        nextShots.forEach((sh, i) => (sh.index = i));
        return { ...n, data: { ...n.data, shots: nextShots } };
      }),
    }));
  },

  cropClip: (compId, clipId, side, atSec) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== compId) return n;
        const shots = n.data.shots ?? [];
        const idx = shots.findIndex((sh) => sh.id === clipId);
        if (idx === -1) return n;
        const clip = shots[idx];

        // atSec is relative to the start of this clip
        if (atSec <= 0 || atSec >= clip.duration) return n;

        let updated: Shot;
        if (side === "right") {
          // Keep left side, crop right
          const newDuration = atSec;
          const newBaseDuration = newDuration * clip.speed;
          updated = {
            ...clip,
            duration: newDuration,
            baseDuration: newBaseDuration,
            sourceOut: clip.sourceIn + newBaseDuration,
          };
        } else {
          // Keep right side, crop left
          const newDuration = clip.duration - atSec;
          const newBaseDuration = newDuration * clip.speed;
          updated = {
            ...clip,
            duration: newDuration,
            baseDuration: newBaseDuration,
            sourceIn: clip.sourceOut - newBaseDuration,
          };
        }

        const nextShots = shots.map((sh) => (sh.id === clipId ? updated : sh));
        return { ...n, data: { ...n.data, shots: nextShots } };
      }),
    }));
  },

  setClipSpeed: (compId, clipId, speed) => {
    if (speed <= 0) return;
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== compId) return n;
        return {
          ...n,
          data: {
            ...n.data,
            shots: (n.data.shots ?? []).map((sh) => {
              if (sh.id !== clipId) return sh;
              const newDuration = sh.baseDuration / speed;
              return { ...sh, speed, duration: newDuration };
            }),
          },
        };
      }),
    }));
  },

  totalDuration: () =>
    get()
      .nodes.filter((n) => n.kind === "composition")
      .reduce((sum, t) => sum + (t.data.shots ?? []).reduce((a, s) => a + s.duration, 0), 0),
  shotCount: () =>
    get()
      .nodes.filter((n) => n.kind === "composition")
      .reduce((a, t) => a + (t.data.shots?.length ?? 0), 0),
  compositionCount: () => get().nodes.filter((n) => n.kind === "composition").length,
}));

function findShot(nodes: CanvasNode[], id: string): Shot | undefined {
  for (const n of nodes) {
    const s = n.data.shots?.find((sh) => sh.id === id);
    if (s) return s;
  }
}
