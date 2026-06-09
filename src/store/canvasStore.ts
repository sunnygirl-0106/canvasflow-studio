import { create } from "zustand";
import { initialNodes, initialEdges } from "@/data/mockData";
import { autoGrid, fillCells, reflow, stitchToDataURL } from "@/lib/storyboard";

// ── Types ──────────────────────────────────────────────────────────────────────

export type NodeKind =
  | "image"
  | "generateImage"
  | "generateVideo"
  | "composition"
  | "audio"
  | "nodeGroup"
  | "storyboard";
export type ShotStatus = "empty" | "ready" | "generating" | "failed";
export type TrackKind = "video" | "audio";

export interface Clip {
  id: string;
  name: string;
  index: number;
  startSec: number;
  duration: number;
  baseDuration: number;
  speed: number;
  sourceIn: number;
  sourceOut: number;
  bindings: string[];
  thumbnail?: string;
  color: "cyan" | "purple" | "yellow" | "rose" | "emerald" | "gray";
  status: ShotStatus;
  clipKind: TrackKind;
  muted?: boolean;
}

/** @deprecated Use Clip */
export type Shot = Clip;

export interface Track {
  id: string;
  kind: TrackKind;
  name: string;
  clips: Clip[];
}

export const MAX_VIDEO_TRACKS = 2;

// ── Storyboard types ────────────────────────────────────────────────────────

export type AspectRatio = "21:9" | "16:9" | "9:16" | "3:4" | "4:3" | "1:1";

export interface StoryboardCell {
  id: string;
  row: number;
  col: number;
  src?: string;
  sourceNodeId?: string;
  name?: string;
}

export interface StoryboardData {
  rows: number;
  cols: number;
  ratio: AspectRatio;
  showIndex: boolean;
  cells: StoryboardCell[];
}

export const STORYBOARD_RATIOS: AspectRatio[] = ["21:9", "16:9", "9:16", "3:4", "4:3", "1:1"];
export const STORYBOARD_PRESETS = [2, 3, 4, 5];
export const STORYBOARD_MAX = 10;
export const STORYBOARD_CELL_PX = 220;
export const STORYBOARD_GAP_PX = 8;
export const DEFAULT_RATIO: AspectRatio = "16:9";

// ── Canvas node ─────────────────────────────────────────────────────────────

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
    tracks?: Track[];
    waveform?: string;
    /** @deprecated use tracks */
    shots?: Clip[];
    storyboard?: StoryboardData;
    memberIds?: string[];
    members?: { id: string; kind: NodeKind; src?: string; name?: string }[];
    groupColor?: string;
    groupLayout?: "grid" | "horizontal" | "vertical";
    groupWidth?: number;
    groupHeight?: number;
    executing?: boolean;
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

// ── Utility functions (exported for consumers) ────────────────────────────────

export const clipEnd = (c: Clip) => c.startSec + c.duration;

export const trackDuration = (t: Track) => t.clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0);

export const compDuration = (tracks: Track[]) =>
  tracks.reduce((max, t) => Math.max(max, trackDuration(t)), 0);

export function clipAt(track: Track, t: number): Clip | null {
  return track.clips.find((c) => t >= c.startSec && t < clipEnd(c)) ?? null;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function overlaps(a: Clip, b: Clip): boolean {
  return a.startSec < clipEnd(b) && b.startSec < clipEnd(a);
}

/** Re-derive startSec for a sequential (V1) track — no gaps, ordered by current startSec. */
function normalizeSequential(track: Track): Track {
  let cursor = 0;
  const clips = [...track.clips]
    .sort((a, b) => a.startSec - b.startSec)
    .map((c, i) => {
      const next = { ...c, startSec: cursor, index: i };
      cursor += c.duration;
      return next;
    });
  return { ...track, clips };
}

function isV1(t: Track) {
  return t.kind === "video" && t.name === "V1";
}

/** Patch tracks array of a composition node; normalize V1 after change. */
function patchTracks(
  nodes: CanvasNode[],
  compId: string,
  fn: (tracks: Track[]) => Track[],
): CanvasNode[] {
  return nodes.map((n) => {
    if (n.id !== compId) return n;
    const updated = fn(n.data.tracks ?? []).map((t) => (isV1(t) ? normalizeSequential(t) : t));
    return { ...n, data: { ...n.data, tracks: updated } };
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────

type Snapshot = { nodes: CanvasNode[]; edges: Edge[] };

export interface ContextMenuState {
  x: number;
  y: number;
  targetNodeId: string | null;
}

const CLIP_COLORS: Clip["color"][] = ["cyan", "purple", "yellow", "rose", "emerald"];
const colorByIndex = (index: number): Clip["color"] => CLIP_COLORS[index % CLIP_COLORS.length];

const colorHexMap: Record<Clip["color"], string> = {
  cyan: "#56C7CF",
  purple: "#7C3AED",
  yellow: "#F97316",
  rose: "#F43F5E",
  emerald: "#10B981",
  gray: "#94A3B8",
};

// ── State Interface ────────────────────────────────────────────────────────────

interface State {
  projectName: string;
  nodes: CanvasNode[];
  edges: Edge[];
  selectedId: string | null;
  /** @deprecated */
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
  addEdge: (from: string, to: string, sourceHandle?: string, toHandle?: string) => void;
  removeEdge: (id: string) => void;
  select: (id: string | null) => void;
  /** @deprecated */
  selectShot: (id: string | null) => void;
  togglePanel: (open?: boolean) => void;
  setExport: (v: State["exportOpen"]) => void;

  // Backward-compat shot helpers — delegate to track API internally
  /** @deprecated Use updateClip */
  updateShot: (compId: string, shotId: string, patch: Partial<Clip>) => void;
  /** @deprecated */
  addShot: (compId: string) => void;
  /** @deprecated Use removeClip */
  removeShot: (compId: string, shotId: string) => void;
  /** @deprecated Use reorderVideoTrack */
  reorderShots: (compId: string, ids: string[]) => void;
  /** @deprecated */
  bindNodeToShot: (nodeId: string, shotId: string) => void;

  mergeToComposition: (nodeIds: string[]) => string | null;
  addToComposition: (nodeId: string) => string | null;
  setContextMenu: (m: ContextMenuState | null) => void;

  // group actions
  createGroup: (nodeIds: string[]) => string | null;
  ungroupGroup: (id: string) => void;
  setGroupColor: (id: string, color: string) => void;
  setGroupLayout: (id: string, layout: "grid" | "horizontal" | "vertical") => void;
  convertGroupToStoryboard: (id: string) => string | null;
  executeGroup: (id: string) => void;

  // storyboard actions
  mergeToStoryboard: (nodeIds: string[]) => string | null;
  setStoryboardRatio: (id: string, ratio: AspectRatio) => void;
  setStoryboardGrid: (id: string, rows: number, cols: number) => void;
  toggleStoryboardIndex: (id: string) => void;
  stitchStoryboard: (id: string, resolution: "2K" | "4K") => Promise<string | null>;
  clearStoryboard: (id: string) => void;
  convertStoryboardToGroup: (id: string) => string | null;
  ungroupStoryboard: (id: string) => void;
  reorderStoryboardCells: (id: string, fromIdx: number, toIdx: number) => void;
  duplicateStoryboard: (id: string) => string | null;

  // editor actions
  openComposition: (id: string) => void;
  closeComposition: () => void;
  setEditorMode: (m: "full" | "collapsed") => void;
  selectClip: (id: string | null) => void;

  // track operations
  addVideoTrack: (compId: string) => void;
  addAudioTrack: (compId: string) => void;
  removeTrack: (compId: string, trackId: string) => void;

  // clip operations
  updateClip: (compId: string, clipId: string, patch: Partial<Clip>) => void;
  removeClip: (compId: string, clipId: string) => void;
  moveClip: (compId: string, clipId: string, toTrackId: string, toStartSec: number) => void;
  reorderVideoTrack: (compId: string, trackId: string, clipIds: string[]) => void;
  toggleClipMute: (compId: string, clipId: string) => void;
  splitClip: (compId: string, clipId: string, atSec: number) => void;
  cropClip: (compId: string, clipId: string, side: "left" | "right", atSec: number) => void;
  setClipSpeed: (compId: string, clipId: string, speed: number) => void;

  // audio
  addAudioClipFromNode: (compId: string, nodeId: string, atSec?: number) => void;

  // computed
  totalDuration: () => number;
  shotCount: () => number;
  compositionCount: () => number;
}

// ── Store ─────────────────────────────────────────────────────────────────────

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

  editorCompId: null,
  editorMode: "full",
  selectedClipId: null,

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

  updateNode: (id, patch) =>
    set((s) => {
      const updated = s.nodes.map((n) =>
        n.id === id
          ? typeof patch === "function"
            ? patch(n)
            : { ...n, ...patch, data: { ...n.data, ...(patch as Partial<CanvasNode>).data } }
          : n,
      );
      // Propagate src changes to bound clips' thumbnails
      const changedNode = updated.find((n) => n.id === id);
      if (changedNode?.data.src) {
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
                : kind === "audio"
                  ? "音频"
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
    // Audio node → composition: add audio clip
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
      return { selectedId: id, selectedShotId: null, panelOpen: showPanel };
    }),

  selectShot: (id) => set({ selectedShotId: id, selectedId: null, panelOpen: !!id }),
  togglePanel: (open) => set((s) => ({ panelOpen: open ?? !s.panelOpen })),
  setExport: (v) => set({ exportOpen: v }),

  // ── Backward-compat shot wrappers ────────────────────────────────────────────

  updateShot: (compId, shotId, patch) =>
    set((s) => ({
      nodes: patchTracks(s.nodes, compId, (tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => (c.id === shotId ? { ...c, ...patch } : c)),
        })),
      ),
    })),

  addShot: (compId) => {
    get().pushHistory();
    const { nodes } = get();
    const comp = nodes.find((n) => n.id === compId);
    const tracks = comp?.data.tracks ?? [];
    const v1 = tracks.find(isV1);
    const idx = v1 ? v1.clips.length : 0;
    const ts = Date.now();
    const newClip: Clip = {
      id: `clip-new-${ts}`,
      name: `Shot ${String(idx + 1).padStart(2, "0")}`,
      index: idx,
      startSec: 0, // normalizeSequential will fix it
      duration: 3,
      baseDuration: 3,
      speed: 1,
      sourceIn: 0,
      sourceOut: 3,
      bindings: [],
      color: "gray",
      status: "empty",
      clipKind: "video",
    };
    set((s) => ({
      nodes: patchTracks(s.nodes, compId, (trks) => {
        const existingV1 = trks.find(isV1);
        if (existingV1) {
          return trks.map((t) => (isV1(t) ? { ...t, clips: [...t.clips, newClip] } : t));
        }
        return [
          ...trks,
          { id: `track-v1-${ts}`, kind: "video" as TrackKind, name: "V1", clips: [newClip] },
        ];
      }),
    }));
  },

  removeShot: (compId, shotId) => {
    get().pushHistory();
    set((s) => ({
      nodes: patchTracks(s.nodes, compId, (tracks) =>
        tracks.map((t) => ({ ...t, clips: t.clips.filter((c) => c.id !== shotId) })),
      ),
      edges: s.edges.filter((e) => e.to !== shotId),
    }));
  },

  reorderShots: (compId, ids) =>
    set((s) => ({
      nodes: patchTracks(s.nodes, compId, (tracks) =>
        tracks.map((t) => {
          if (!isV1(t)) return t;
          const map = new Map(t.clips.map((c) => [c.id, c]));
          const clips = ids.filter((id) => map.has(id)).map((id) => map.get(id)!);
          return { ...t, clips };
        }),
      ),
    })),

  bindNodeToShot: (nodeId, shotId) => {
    const { nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    // find which comp/track contains the shot
    for (const comp of nodes) {
      for (const t of comp.data.tracks ?? []) {
        const clip = t.clips.find((c) => c.id === shotId);
        if (clip) {
          const idx = t.clips.findIndex((c) => c.id === shotId);
          get().updateClip(comp.id, shotId, {
            bindings: Array.from(new Set([...clip.bindings, nodeId])),
            color: clip.color ?? colorByIndex(idx),
            thumbnail: node.data.src,
            status: "ready",
          });
          return;
        }
      }
    }
  },

  // ── Core composition actions ──────────────────────────────────────────────────

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
    const maxX = Math.max(...picked.map((n) => n.x));
    const minY = Math.min(...picked.map((n) => n.y));
    const maxY = Math.max(...picked.map((n) => n.y));

    let cursor = 0;
    const v1Clips: Clip[] = picked.map((n, i) => {
      const dur = n.data.duration ?? 3;
      const clip: Clip = {
        id: `clip-${ts}-${i}`,
        name: `${n.data.name ?? "Shot"} · ${String(i + 1).padStart(2, "0")}`,
        index: i,
        startSec: cursor,
        duration: dur,
        baseDuration: dur,
        speed: 1,
        sourceIn: 0,
        sourceOut: dur,
        bindings: [n.id],
        thumbnail: n.data.src,
        color: colorByIndex(i),
        status: "ready",
        clipKind: "video",
      };
      cursor += dur;
      return clip;
    });

    const compNode: CanvasNode = {
      id: compId,
      kind: "composition",
      x: maxX + 400,
      y: (minY + maxY) / 2,
      data: {
        name: `视频合成 ${get().nodes.filter((n) => n.kind === "composition").length + 1}`,
        width: Math.max(1200, picked.length * 320),
        pxPerSecond: 60,
        tracks: [{ id: `track-v1-${ts}`, kind: "video", name: "V1", clips: v1Clips }],
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

    const compositions = nodes.filter((n) => n.kind === "composition");
    const existingComp = compositions[compositions.length - 1] ?? null;
    const ts = Date.now();
    const compId = existingComp?.id ?? `composition-${ts}`;

    // Audio node path
    if (node.kind === "audio") {
      if (!existingComp) return null;
      get().pushHistory();
      const tracks = existingComp.data.tracks ?? [];
      const audioTracks = tracks.filter((t) => t.kind === "audio");
      const targetTrackId =
        audioTracks.length > 0 ? audioTracks[audioTracks.length - 1].id : `track-a1-${ts}`;
      const targetTrack = tracks.find((t) => t.id === targetTrackId);
      const dur = node.data.duration ?? 5;
      const startSec = targetTrack
        ? targetTrack.clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0)
        : 0;
      const newClip: Clip = {
        id: `clip-audio-${ts}`,
        name: node.data.name ?? "音频",
        index: targetTrack ? targetTrack.clips.length : 0,
        startSec,
        duration: dur,
        baseDuration: dur,
        speed: 1,
        sourceIn: 0,
        sourceOut: dur,
        bindings: [nodeId],
        thumbnail: node.data.waveform,
        color: "gray",
        status: "ready",
        clipKind: "audio",
        muted: false,
      };
      const newEdge: Edge = {
        id: `e-${ts}`,
        from: nodeId,
        to: compId,
        color: colorHexMap.gray,
      };
      set((s) => ({
        nodes: s.nodes.map((n) => {
          if (n.id !== compId) return n;
          const trks = n.data.tracks ?? [];
          let newTracks: Track[];
          if (audioTracks.length === 0) {
            newTracks = [
              ...trks,
              { id: targetTrackId, kind: "audio" as TrackKind, name: "A1", clips: [newClip] },
            ];
          } else {
            newTracks = trks.map((t) =>
              t.id === targetTrackId ? { ...t, clips: [...t.clips, newClip] } : t,
            );
          }
          return { ...n, data: { ...n.data, tracks: newTracks } };
        }),
        edges: [...s.edges, newEdge],
        selectedId: compId,
        panelOpen: true,
      }));
      return compId;
    }

    // Video node path
    const mediaKinds: NodeKind[] = ["image", "generateImage", "generateVideo"];
    if (!mediaKinds.includes(node.kind)) return null;

    get().pushHistory();

    const newEdge: Edge = {
      id: `e-${ts}`,
      from: nodeId,
      to: compId,
      sourceHandle: "source-process",
      toHandle: "comp-in",
      color: colorHexMap[colorByIndex(0)], // placeholder; will update below
    };

    set((s) => {
      let nextNodes: CanvasNode[];
      let edgeColor = colorHexMap[colorByIndex(0)];

      if (existingComp) {
        nextNodes = s.nodes.map((n) => {
          if (n.id !== compId) return n;
          const trks = n.data.tracks ?? [];
          const v1 = trks.find(isV1);
          const idx = v1 ? v1.clips.length : 0;
          const dur = node.data.duration ?? 3;
          edgeColor = colorHexMap[colorByIndex(idx)];
          const newClip: Clip = {
            id: `clip-${ts}-${idx}`,
            name: `${node.data.name ?? "Shot"} · ${String(idx + 1).padStart(2, "0")}`,
            index: idx,
            startSec: 0, // normalizeSequential will fix
            duration: dur,
            baseDuration: dur,
            speed: 1,
            sourceIn: 0,
            sourceOut: dur,
            bindings: [nodeId],
            thumbnail: node.data.src,
            color: colorByIndex(idx),
            status: "ready",
            clipKind: "video",
          };
          let newTracks: Track[];
          if (v1) {
            newTracks = trks.map((t) =>
              isV1(t) ? normalizeSequential({ ...t, clips: [...t.clips, newClip] }) : t,
            );
          } else {
            newTracks = [
              ...trks,
              { id: `track-v1-${ts}`, kind: "video" as TrackKind, name: "V1", clips: [newClip] },
            ];
          }
          return { ...n, data: { ...n.data, tracks: newTracks } };
        });
      } else {
        const dur = node.data.duration ?? 3;
        const newComp: CanvasNode = {
          id: compId,
          kind: "composition",
          x: node.x + 400,
          y: node.y,
          data: {
            name: `视频合成 ${s.nodes.filter((n) => n.kind === "composition").length + 1}`,
            width: 1200,
            pxPerSecond: 60,
            tracks: [
              {
                id: `track-v1-${ts}`,
                kind: "video",
                name: "V1",
                clips: [
                  {
                    id: `clip-${ts}-0`,
                    name: `${node.data.name ?? "Shot"} · 01`,
                    index: 0,
                    startSec: 0,
                    duration: dur,
                    baseDuration: dur,
                    speed: 1,
                    sourceIn: 0,
                    sourceOut: dur,
                    bindings: [nodeId],
                    thumbnail: node.data.src,
                    color: colorByIndex(0),
                    status: "ready",
                    clipKind: "video",
                  },
                ],
              },
            ],
          },
        };
        nextNodes = [...s.nodes, newComp];
      }
      return {
        nodes: nextNodes,
        edges: [...s.edges, { ...newEdge, color: edgeColor }],
        selectedId: compId,
        selectedShotId: null,
        panelOpen: true,
      };
    });
    return compId;
  },

  setContextMenu: (m) => set({ contextMenu: m }),

  // ── Group actions ────────────────────────────────────────────────────────────

  createGroup: (nodeIds) => {
    const { nodes } = get();
    const mediaKinds: NodeKind[] = ["image", "generateImage", "generateVideo"];
    const picked = nodes.filter(
      (n) => nodeIds.includes(n.id) && mediaKinds.includes(n.kind),
    );
    if (picked.length < 2) return null;

    get().pushHistory();
    const ts = Date.now();
    const groupId = `group-${ts}`;

    // Estimate member node sizes (ImageNode = 240×160)
    const NODE_W = 240;
    const NODE_H = 160;
    const PAD = 24;
    const minX = Math.min(...picked.map((n) => n.x));
    const minY = Math.min(...picked.map((n) => n.y));
    const maxX = Math.max(...picked.map((n) => n.x + NODE_W));
    const maxY = Math.max(...picked.map((n) => n.y + NODE_H));

    const groupNode: CanvasNode = {
      id: groupId,
      kind: "nodeGroup",
      x: minX - PAD,
      y: minY - PAD,
      data: {
        name: `普通组 ${nodes.filter((n) => n.kind === "nodeGroup").length + 1}`,
        memberIds: picked.map((n) => n.id),
        members: picked.map((n) => ({ id: n.id, kind: n.kind, src: n.data.src, name: n.data.name })),
        groupColor: "#56C7CF",
        groupLayout: "grid",
        groupWidth: maxX - minX + PAD * 2,
        groupHeight: maxY - minY + PAD * 2,
      },
    };

    set((s) => ({
      // Put group node first so it renders behind members
      nodes: [groupNode, ...s.nodes],
      selectedId: groupId,
      panelOpen: false,
    }));
    return groupId;
  },

  ungroupGroup: (id) => {
    const { nodes } = get();
    const groupNode = nodes.find((n) => n.id === id);
    if (!groupNode || groupNode.kind !== "nodeGroup") return;

    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.from !== id && e.to !== id),
      selectedId: null,
    }));
  },

  setGroupColor: (id, color) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, groupColor: color } } : n,
      ),
    }));
  },

  setGroupLayout: (id, layout) => {
    const { nodes } = get();
    const groupNode = nodes.find((n) => n.id === id);
    if (!groupNode || groupNode.kind !== "nodeGroup") return;

    get().pushHistory();
    const memberIds = groupNode.data.memberIds ?? [];
    const NODE_W = 240;
    const NODE_H = 160;
    const GAP_X = 20;
    const GAP_Y = 20;
    const PAD = 24;
    const baseX = groupNode.x + PAD;
    const baseY = groupNode.y + PAD;

    const cols =
      layout === "horizontal" ? memberIds.length
        : layout === "vertical" ? 1
        : Math.ceil(Math.sqrt(memberIds.length));
    const rows = Math.ceil(memberIds.length / cols);

    const posMap = new Map<string, { x: number; y: number }>();
    memberIds.forEach((mid, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      posMap.set(mid, {
        x: baseX + col * (NODE_W + GAP_X),
        y: baseY + row * (NODE_H + GAP_Y),
      });
    });

    const frameW = cols * NODE_W + (cols - 1) * GAP_X + PAD * 2;
    const frameH = rows * NODE_H + (rows - 1) * GAP_Y + PAD * 2;

    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, groupLayout: layout, groupWidth: frameW, groupHeight: frameH } };
        }
        const pos = posMap.get(n.id);
        if (pos) return { ...n, x: pos.x, y: pos.y };
        return n;
      }),
    }));
  },

  convertGroupToStoryboard: (id) => {
    const { nodes } = get();
    const groupNode = nodes.find((n) => n.id === id);
    if (!groupNode || groupNode.kind !== "nodeGroup") return null;

    get().pushHistory();
    const memberIds = new Set((groupNode.data.memberIds ?? []) as string[]);
    // Grab live data from canvas nodes (they're still on canvas for group)
    const liveMembers = nodes.filter((n) => memberIds.has(n.id));
    const ts = Date.now();
    const sbId = `storyboard-${ts}`;
    const { rows, cols } = autoGrid(liveMembers.length);
    const cells = fillCells(
      liveMembers.map((n) => ({ src: n.data.src ?? "", sourceNodeId: n.id, name: n.data.name })),
      rows,
      cols,
    );

    const sbNode: CanvasNode = {
      id: sbId,
      kind: "storyboard",
      x: groupNode.x,
      y: groupNode.y,
      data: {
        name: groupNode.data.name ?? "分镜组",
        storyboard: { rows, cols, ratio: DEFAULT_RATIO, showIndex: false, cells },
      },
    };

    // Remove both the group frame and the member nodes (storyboard absorbs them)
    set((s) => ({
      nodes: [
        ...s.nodes.filter((n) => n.id !== id && !memberIds.has(n.id)),
        sbNode,
      ],
      edges: s.edges.filter(
        (e) => e.from !== id && e.to !== id && !memberIds.has(e.from) && !memberIds.has(e.to),
      ),
      selectedId: sbId,
    }));
    return sbId;
  },

  executeGroup: (id) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, executing: true } } : n,
      ),
    }));
    setTimeout(() => {
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, executing: false } } : n,
        ),
      }));
    }, 2000);
  },

  // ── Storyboard actions ──────────────────────────────────────────────────────

  mergeToStoryboard: (nodeIds) => {
    const { nodes } = get();
    const mediaKinds: NodeKind[] = ["image", "generateImage", "generateVideo"];
    const picked = nodes
      .filter((n) => nodeIds.includes(n.id) && mediaKinds.includes(n.kind))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    if (picked.length < 2) return null;

    get().pushHistory();

    const ts = Date.now();
    const sbId = `storyboard-${ts}`;
    const { rows, cols } = autoGrid(picked.length);
    const cells = fillCells(
      picked.map((n) => ({ src: n.data.src ?? "", sourceNodeId: n.id, name: n.data.name })),
      rows,
      cols,
    );

    const maxX = Math.max(...picked.map((n) => n.x));
    const minY = Math.min(...picked.map((n) => n.y));
    const maxY = Math.max(...picked.map((n) => n.y));
    const pickedIds = new Set(picked.map((n) => n.id));

    const sbNode: CanvasNode = {
      id: sbId,
      kind: "storyboard",
      x: maxX + 400,
      y: (minY + maxY) / 2,
      data: {
        name: `分镜组 ${nodes.filter((n) => n.kind === "storyboard").length + 1}`,
        storyboard: { rows, cols, ratio: DEFAULT_RATIO, showIndex: false, cells },
      },
    };

    set((s) => ({
      nodes: [...s.nodes.filter((n) => !pickedIds.has(n.id)), sbNode],
      edges: s.edges.filter((e) => !pickedIds.has(e.from) && !pickedIds.has(e.to)),
      selectedId: sbId,
      panelOpen: false,
    }));
    return sbId;
  },

  setStoryboardRatio: (id, ratio) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id && n.data.storyboard
          ? { ...n, data: { ...n.data, storyboard: { ...n.data.storyboard, ratio } } }
          : n,
      ),
    }));
  },

  setStoryboardGrid: (id, rows, cols) => {
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    rows = clamp(rows, 1, STORYBOARD_MAX);
    cols = clamp(cols, 1, STORYBOARD_MAX);
    get().pushHistory();
    const { nodes } = get();
    const sbNode = nodes.find((n) => n.id === id);
    const sb = sbNode?.data.storyboard;
    if (!sbNode || !sb) return;

    const { cells: newCells, overflow } = reflow(sb, rows, cols);

    // Create overflow nodes to the right of the storyboard
    const overflowNodes: CanvasNode[] = overflow.map((o, i) => ({
      id: `image-overflow-${Date.now()}-${i}`,
      kind: "image" as NodeKind,
      x: sbNode.x + 400 + i * 260,
      y: sbNode.y,
      data: { src: o.src, name: o.name ?? "溢出图片" },
    }));

    set((s) => ({
      nodes: [
        ...s.nodes.map((n) =>
          n.id === id && n.data.storyboard
            ? {
                ...n,
                data: {
                  ...n.data,
                  storyboard: { ...n.data.storyboard, rows, cols, cells: newCells },
                },
              }
            : n,
        ),
        ...overflowNodes,
      ],
    }));
  },

  toggleStoryboardIndex: (id) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id && n.data.storyboard
          ? {
              ...n,
              data: {
                ...n.data,
                storyboard: { ...n.data.storyboard, showIndex: !n.data.storyboard.showIndex },
              },
            }
          : n,
      ),
    }));
  },

  clearStoryboard: (id) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== id || !n.data.storyboard) return n;
        const sb = n.data.storyboard;
        const clearedCells = sb.cells.map((c) => ({
          ...c,
          src: undefined,
          sourceNodeId: undefined,
          name: undefined,
        }));
        return { ...n, data: { ...n.data, storyboard: { ...sb, cells: clearedCells } } };
      }),
      // Remove edges connected to cleared source nodes
      edges: (() => {
        const sbNode = s.nodes.find((n) => n.id === id);
        const sourceIds = new Set(
          (sbNode?.data.storyboard?.cells ?? [])
            .map((c) => c.sourceNodeId)
            .filter(Boolean) as string[],
        );
        return s.edges.filter((e) => !sourceIds.has(e.from) && !sourceIds.has(e.to));
      })(),
    }));
  },

  convertStoryboardToGroup: (id) => {
    const { nodes } = get();
    const sbNode = nodes.find((n) => n.id === id);
    const sb = sbNode?.data.storyboard;
    if (!sbNode || !sb) return null;

    get().pushHistory();
    const ts = Date.now();
    const NODE_W = 240;
    const NODE_H = 160;
    const PAD = 24;
    const filled = sb.cells.filter((c) => c.src);
    const cols = sb.cols;
    const newImageNodes: CanvasNode[] = filled.map((c, i) => ({
      id: c.sourceNodeId ?? `image-${ts}-${i}`,
      kind: "image" as NodeKind,
      x: sbNode.x + PAD + (i % cols) * 260,
      y: sbNode.y + PAD + Math.floor(i / cols) * 180,
      data: { src: c.src, name: c.name },
    }));

    const imgCols = Math.min(filled.length, cols);
    const imgRows = Math.ceil(filled.length / cols);
    const groupId = `group-${ts}`;
    const groupNode: CanvasNode = {
      id: groupId,
      kind: "nodeGroup",
      x: sbNode.x,
      y: sbNode.y,
      data: {
        name: sbNode.data.name ?? "普通组",
        memberIds: newImageNodes.map((n) => n.id),
        members: newImageNodes.map((n) => ({ id: n.id, kind: n.kind, src: n.data.src, name: n.data.name })),
        groupColor: "#56C7CF",
        groupWidth: imgCols * 260 - 20 + PAD * 2,
        groupHeight: imgRows * 180 - 20 + PAD * 2,
      },
    };

    set((s) => ({
      nodes: [groupNode, ...s.nodes.filter((n) => n.id !== id), ...newImageNodes],
      edges: s.edges.filter((e) => e.from !== id && e.to !== id),
      selectedId: groupId,
    }));
    return groupId;
  },

  ungroupStoryboard: (id) => {
    const { nodes } = get();
    const sbNode = nodes.find((n) => n.id === id);
    const sb = sbNode?.data.storyboard;
    if (!sbNode || !sb) return;

    get().pushHistory();
    const ts = Date.now();
    const filled = sb.cells.filter((c) => c.src);
    const newImageNodes: CanvasNode[] = filled.map((c, i) => ({
      id: c.sourceNodeId ?? `image-${ts}-${i}`,
      kind: "image" as NodeKind,
      x: sbNode.x + (i % sb.cols) * 260,
      y: sbNode.y + Math.floor(i / sb.cols) * 180,
      data: { src: c.src, name: c.name },
    }));

    set((s) => ({
      nodes: [...s.nodes.filter((n) => n.id !== id), ...newImageNodes],
      edges: s.edges.filter((e) => e.from !== id && e.to !== id),
      selectedId: null,
    }));
  },

  reorderStoryboardCells: (id, fromIdx, toIdx) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== id || !n.data.storyboard) return n;
        const sb = n.data.storyboard;
        const cells = [...sb.cells];
        const [moved] = cells.splice(fromIdx, 1);
        cells.splice(toIdx, 0, moved);
        // Re-assign row/col based on new position
        const updated = cells.map((c, i) => ({
          ...c,
          row: Math.floor(i / sb.cols) + 1,
          col: (i % sb.cols) + 1,
        }));
        return { ...n, data: { ...n.data, storyboard: { ...sb, cells: updated } } };
      }),
    }));
  },

  duplicateStoryboard: (id) => {
    const { nodes, edges } = get();
    const sbNode = nodes.find((n) => n.id === id);
    if (!sbNode || !sbNode.data.storyboard) return null;

    get().pushHistory();
    const ts = Date.now();
    const newId = `storyboard-dup-${ts}`;
    const sb = sbNode.data.storyboard;
    const newCells = sb.cells.map((c, i) => ({ ...c, id: `cell-dup-${ts}-${i}` }));
    const dupNode: CanvasNode = {
      ...sbNode,
      id: newId,
      x: sbNode.x + 60,
      y: sbNode.y + 60,
      data: {
        ...sbNode.data,
        name: `${sbNode.data.name ?? "分镜组"} 副本`,
        storyboard: { ...sb, cells: newCells },
      },
    };

    // Copy edges: internal + external
    const newEdges: Edge[] = edges
      .filter((e) => e.from === id || e.to === id)
      .map((e, i) => ({
        ...e,
        id: `e-dup-${ts}-${i}`,
        from: e.from === id ? newId : e.from,
        to: e.to === id ? newId : e.to,
      }));

    set((s) => ({
      nodes: [...s.nodes, dupNode],
      edges: [...s.edges, ...newEdges],
      selectedId: newId,
    }));
    return newId;
  },

  stitchStoryboard: async (id, resolution) => {
    const { nodes } = get();
    const sbNode = nodes.find((n) => n.id === id);
    const sb = sbNode?.data.storyboard;
    if (!sbNode || !sb) return null;

    const dataURL = await stitchToDataURL(sb, resolution);

    get().pushHistory();
    const ts = Date.now();
    const imgId = `image-stitch-${ts}`;
    const imgNode: CanvasNode = {
      id: imgId,
      kind: "image",
      x: sbNode.x,
      y: sbNode.y + 400,
      data: { src: dataURL, name: `分镜拼接图 (${resolution})` },
    };

    set((s) => ({
      nodes: [...s.nodes, imgNode],
      selectedId: imgId,
    }));
    return imgId;
  },

  // ── Editor actions ────────────────────────────────────────────────────────────

  openComposition: (id) => set({ editorCompId: id, editorMode: "full", selectedClipId: null }),
  closeComposition: () => set({ editorCompId: null, selectedClipId: null }),
  setEditorMode: (m) => set({ editorMode: m }),
  selectClip: (id) => set({ selectedClipId: id }),

  // ── Track operations ──────────────────────────────────────────────────────────

  addVideoTrack: (compId) => {
    const { nodes } = get();
    const comp = nodes.find((n) => n.id === compId);
    const videoTracks = (comp?.data.tracks ?? []).filter((t) => t.kind === "video");
    if (videoTracks.length >= MAX_VIDEO_TRACKS) return;
    get().pushHistory();
    const ts = Date.now();
    const newTrack: Track = {
      id: `track-v${videoTracks.length + 1}-${ts}`,
      kind: "video",
      name: `V${videoTracks.length + 1}`,
      clips: [],
    };
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id !== compId
          ? n
          : { ...n, data: { ...n.data, tracks: [...(n.data.tracks ?? []), newTrack] } },
      ),
    }));
  },

  addAudioTrack: (compId) => {
    get().pushHistory();
    const { nodes } = get();
    const comp = nodes.find((n) => n.id === compId);
    const audioTracks = (comp?.data.tracks ?? []).filter((t) => t.kind === "audio");
    const ts = Date.now();
    const newTrack: Track = {
      id: `track-a${audioTracks.length + 1}-${ts}`,
      kind: "audio",
      name: `A${audioTracks.length + 1}`,
      clips: [],
    };
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id !== compId
          ? n
          : { ...n, data: { ...n.data, tracks: [...(n.data.tracks ?? []), newTrack] } },
      ),
    }));
  },

  removeTrack: (compId, trackId) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id !== compId
          ? n
          : {
              ...n,
              data: { ...n.data, tracks: (n.data.tracks ?? []).filter((t) => t.id !== trackId) },
            },
      ),
    }));
  },

  // ── Clip operations ───────────────────────────────────────────────────────────

  updateClip: (compId, clipId, patch) =>
    set((s) => ({
      nodes: patchTracks(s.nodes, compId, (tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
        })),
      ),
    })),

  removeClip: (compId, clipId) => {
    get().pushHistory();
    set((s) => ({
      nodes: patchTracks(s.nodes, compId, (tracks) =>
        tracks.map((t) => ({ ...t, clips: t.clips.filter((c) => c.id !== clipId) })),
      ),
    }));
  },

  moveClip: (compId, clipId, toTrackId, toStartSec) => {
    get().pushHistory();
    set((s) => {
      const comp = s.nodes.find((n) => n.id === compId);
      if (!comp) return s;
      const tracks = comp.data.tracks ?? [];

      let sourceClip: Clip | null = null;
      for (const t of tracks) {
        const c = t.clips.find((c) => c.id === clipId);
        if (c) {
          sourceClip = c;
          break;
        }
      }
      if (!sourceClip) return s;

      const toTrack = tracks.find((t) => t.id === toTrackId);
      if (!toTrack) return s;
      if (sourceClip.clipKind !== toTrack.kind) return s; // type mismatch

      // Remove from source
      let newTracks = tracks.map((t) => ({ ...t, clips: t.clips.filter((c) => c.id !== clipId) }));

      const updatedClip: Clip = { ...sourceClip, startSec: toStartSec };

      // Overlap check for non-V1 tracks (free-placement)
      if (!isV1(toTrack)) {
        const targetAfterRemoval = newTracks.find((t) => t.id === toTrackId);
        if (targetAfterRemoval) {
          const hasOverlap = targetAfterRemoval.clips.some((c) => overlaps(c, updatedClip));
          if (hasOverlap) return s; // reject — UI should snap to gap before calling
        }
      }

      // Insert into target
      newTracks = newTracks.map((t) =>
        t.id !== toTrackId
          ? isV1(t)
            ? normalizeSequential(t)
            : t
          : isV1(t)
            ? normalizeSequential({ ...t, clips: [...t.clips, updatedClip] })
            : { ...t, clips: [...t.clips, updatedClip] },
      );

      return {
        ...s,
        nodes: s.nodes.map((n) =>
          n.id !== compId ? n : { ...n, data: { ...n.data, tracks: newTracks } },
        ),
      };
    });
  },

  reorderVideoTrack: (compId, trackId, clipIds) =>
    set((s) => ({
      nodes: patchTracks(s.nodes, compId, (tracks) =>
        tracks.map((t) => {
          if (t.id !== trackId) return t;
          const map = new Map(t.clips.map((c) => [c.id, c]));
          const clips = clipIds.filter((id) => map.has(id)).map((id) => map.get(id)!);
          return { ...t, clips };
        }),
      ),
    })),

  toggleClipMute: (compId, clipId) => {
    get().pushHistory();
    set((s) => ({
      nodes: patchTracks(s.nodes, compId, (tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => (c.id === clipId ? { ...c, muted: !c.muted } : c)),
        })),
      ),
    }));
  },

  splitClip: (compId, clipId, atSec) => {
    get().pushHistory();
    set((s) => ({
      nodes: patchTracks(s.nodes, compId, (tracks) =>
        tracks.map((t) => {
          const idx = t.clips.findIndex((c) => c.id === clipId);
          if (idx === -1) return t;
          const clip = t.clips[idx];
          if (atSec <= 0 || atSec >= clip.duration) return t;

          const leftDur = atSec;
          const rightDur = clip.duration - atSec;
          const leftBase = leftDur * clip.speed;
          const rightBase = rightDur * clip.speed;
          const ts = Date.now();

          const left: Clip = {
            ...clip,
            duration: leftDur,
            baseDuration: leftBase,
            sourceOut: clip.sourceIn + leftBase,
          };
          const right: Clip = {
            ...clip,
            id: `${clip.id}-split-${ts}`,
            name: `${clip.name} (2)`,
            duration: rightDur,
            baseDuration: rightBase,
            sourceIn: clip.sourceIn + leftBase,
            startSec: clip.startSec + atSec,
          };
          return {
            ...t,
            clips: [...t.clips.slice(0, idx), left, right, ...t.clips.slice(idx + 1)],
          };
        }),
      ),
    }));
  },

  cropClip: (compId, clipId, side, atSec) => {
    get().pushHistory();
    set((s) => ({
      nodes: patchTracks(s.nodes, compId, (tracks) =>
        tracks.map((t) => {
          const idx = t.clips.findIndex((c) => c.id === clipId);
          if (idx === -1) return t;
          const clip = t.clips[idx];
          if (atSec <= 0 || atSec >= clip.duration) return t;

          let updated: Clip;
          if (side === "right") {
            const newDur = atSec;
            const newBase = newDur * clip.speed;
            updated = {
              ...clip,
              duration: newDur,
              baseDuration: newBase,
              sourceOut: clip.sourceIn + newBase,
            };
          } else {
            const newDur = clip.duration - atSec;
            const newBase = newDur * clip.speed;
            updated = {
              ...clip,
              duration: newDur,
              baseDuration: newBase,
              sourceIn: clip.sourceOut - newBase,
              startSec: clip.startSec + atSec,
            };
          }
          return { ...t, clips: t.clips.map((c, i) => (i === idx ? updated : c)) };
        }),
      ),
    }));
  },

  setClipSpeed: (compId, clipId, speed) => {
    if (speed <= 0) return;
    get().pushHistory();
    set((s) => ({
      nodes: patchTracks(s.nodes, compId, (tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) =>
            c.id !== clipId ? c : { ...c, speed, duration: c.baseDuration / speed },
          ),
        })),
      ),
    }));
  },

  // ── Audio clip from node ──────────────────────────────────────────────────────

  addAudioClipFromNode: (compId, nodeId, atSec) => {
    get().pushHistory();
    const { nodes } = get();
    const audioNode = nodes.find((n) => n.id === nodeId);
    const comp = nodes.find((n) => n.id === compId);
    if (!audioNode || !comp) return;

    const ts = Date.now();
    const tracks = comp.data.tracks ?? [];
    const audioTracks = tracks.filter((t) => t.kind === "audio");
    const targetTrackId =
      audioTracks.length > 0 ? audioTracks[audioTracks.length - 1].id : `track-a1-${ts}`;
    const targetTrack = tracks.find((t) => t.id === targetTrackId);
    const dur = audioNode.data.duration ?? 5;
    const startSec =
      atSec ??
      (targetTrack ? targetTrack.clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0) : 0);

    const newClip: Clip = {
      id: `clip-audio-${ts}`,
      name: audioNode.data.name ?? "音频",
      index: targetTrack ? targetTrack.clips.length : 0,
      startSec,
      duration: dur,
      baseDuration: dur,
      speed: 1,
      sourceIn: 0,
      sourceOut: dur,
      bindings: [nodeId],
      thumbnail: audioNode.data.waveform,
      color: "gray",
      status: "ready",
      clipKind: "audio",
      muted: false,
    };

    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== compId) return n;
        const trks = n.data.tracks ?? [];
        let newTracks: Track[];
        if (audioTracks.length === 0) {
          newTracks = [
            ...trks,
            { id: targetTrackId, kind: "audio" as TrackKind, name: "A1", clips: [newClip] },
          ];
        } else {
          newTracks = trks.map((t) =>
            t.id === targetTrackId ? { ...t, clips: [...t.clips, newClip] } : t,
          );
        }
        return { ...n, data: { ...n.data, tracks: newTracks } };
      }),
    }));
  },

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
}));
