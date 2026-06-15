// ── Shared types and helpers for all store slices ────────────────────────────

export type NodeKind =
  | "image"
  | "generateImage"
  | "generateVideo"
  | "composition"
  | "audio"
  | "nodeGroup"
  | "storyboard"
  | "text"
  | "script";
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

// ── Script types ───────────────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3;
export type FinalPromptStatus = "pending" | "composing" | "done";

export type AssetGenerationStatus =
  | { state: "idle" }
  | { state: "generating"; progress: number }
  | { state: "done" }
  | { state: "failed"; error: string };

export interface ScriptAsset {
  id: string;
  name: string;
  type: "character" | "scene" | "prop";
  description?: string;
  image?: string;
  generationStatus?: AssetGenerationStatus;
}

export interface ScriptCharacter {
  id: string;
  name: string;
  desc: string;
  image?: string;
}

export interface ScriptShot {
  id: string;
  index: number;
  duration: number;
  description: string;
  characters: ScriptCharacter[];
  refImage?: string;
  shotType: string;
  action: string;
  emotion: string;
  sceneTags: string;
  lighting: string;
  sound: string;
  dialogue: string;
  cameraMove: string;
  imagePrompt: string;
  videoPrompt: string;
  finalPrompt?: string;
  finalPromptStatus?: FinalPromptStatus;
}

export type ScriptStatus = "empty" | "generating" | "ready" | "failed";
export type ScriptView = "table" | "card";

export type ScriptColumnKey =
  | "duration"
  | "description"
  | "characters"
  | "refImage"
  | "shotType"
  | "action"
  | "emotion"
  | "sceneTags"
  | "lighting"
  | "sound"
  | "dialogue"
  | "cameraMove"
  | "imagePrompt"
  | "videoPrompt"
  | "finalPrompt";

export interface ScriptFilter {
  characterName?: string;
  shotType?: string;
  keyword?: string;
}

export interface ScriptData {
  title: string;
  promptText: string;
  sourceText?: string;
  model: string;
  status: ScriptStatus;
  view: ScriptView;
  shots: ScriptShot[];
  hiddenColumns: ScriptColumnKey[];
  filter: ScriptFilter;
  error?: string;
  progress?: number;
  wizardStep?: WizardStep;
  assets?: ScriptAsset[];
  globalStyle?: string;
  assetGroupsMaterialized?: boolean;
}

export const SCRIPT_MODELS = ["GVLM 3.1"];
export const SCRIPT_NODE_WIDTH = 700;
export const SCRIPT_SHOT_TYPES = ["特写", "近景", "中近景", "中景", "全景", "远景"];

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
    storyboard?: StoryboardData;
    memberIds?: string[];
    members?: { id: string; kind: NodeKind; src?: string; name?: string }[];
    groupColor?: string;
    groupLayout?: "grid" | "horizontal" | "vertical";
    groupWidth?: number;
    groupHeight?: number;
    executing?: boolean;
    text?: string;
    script?: ScriptData;
    scriptSourceId?: string; // if storyboard was generated from a script node
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

export interface ContextMenuState {
  x: number;
  y: number;
  targetNodeId: string | null;
}

export type Snapshot = { nodes: CanvasNode[]; edges: Edge[] };

// ── Utility functions ────────────────────────────────────────────────────────

export const clipEnd = (c: Clip) => c.startSec + c.duration;

export const trackDuration = (t: Track) =>
  t.clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0);

export const compDuration = (tracks: Track[]) =>
  tracks.reduce((max, t) => Math.max(max, trackDuration(t)), 0);

export function clipAt(track: Track, t: number): Clip | null {
  return track.clips.find((c) => t >= c.startSec && t < clipEnd(c)) ?? null;
}

// ── Shared helpers ──────────────────────────────────────────────────────────

export const CLIP_COLORS: Clip["color"][] = ["cyan", "purple", "yellow", "rose", "emerald"];
export const colorByIndex = (index: number): Clip["color"] =>
  CLIP_COLORS[index % CLIP_COLORS.length];

export const colorHexMap: Record<Clip["color"], string> = {
  cyan: "#56C7CF",
  purple: "#7C3AED",
  yellow: "#F97316",
  rose: "#F43F5E",
  emerald: "#10B981",
  gray: "#94A3B8",
};

export function overlaps(a: Clip, b: Clip): boolean {
  return a.startSec < clipEnd(b) && b.startSec < clipEnd(a);
}

export function isV1(t: Track) {
  return t.kind === "video" && t.name === "V1";
}

export function patchTracks(
  nodes: CanvasNode[],
  compId: string,
  fn: (tracks: Track[]) => Track[],
): CanvasNode[] {
  return nodes.map((n) => {
    if (n.id !== compId) return n;
    const updated = fn(n.data.tracks ?? []);
    return { ...n, data: { ...n.data, tracks: updated } };
  });
}

// ── Clip factory ────────────────────────────────────────────────────────────

let _clipSeq = 0;

export function createVideoClip(opts: {
  index: number;
  name: string;
  startSec: number;
  duration: number;
  bindings?: string[];
  thumbnail?: string;
}): Clip {
  const id = `clip-${Date.now()}-${_clipSeq++}`;
  const dur = opts.duration;
  return {
    id,
    name: opts.name,
    index: opts.index,
    startSec: opts.startSec,
    duration: dur,
    baseDuration: dur,
    speed: 1,
    sourceIn: 0,
    sourceOut: dur,
    bindings: opts.bindings ?? [],
    thumbnail: opts.thumbnail,
    color: colorByIndex(opts.index),
    status: opts.bindings?.length ? "ready" : "empty",
    clipKind: "video",
  };
}

export function createAudioClip(opts: {
  index: number;
  name: string;
  startSec: number;
  duration: number;
  bindings?: string[];
  thumbnail?: string;
}): Clip {
  const id = `clip-audio-${Date.now()}-${_clipSeq++}`;
  const dur = opts.duration;
  return {
    id,
    name: opts.name,
    index: opts.index,
    startSec: opts.startSec,
    duration: dur,
    baseDuration: dur,
    speed: 1,
    sourceIn: 0,
    sourceOut: dur,
    bindings: opts.bindings ?? [],
    thumbnail: opts.thumbnail,
    color: "gray",
    status: opts.bindings?.length ? "ready" : "empty",
    clipKind: "audio",
    muted: false,
  };
}

// ── Zustand slice helpers ───────────────────────────────────────────────────

export type SetState = (
  partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>),
) => void;
export type GetState = () => StoreState;

/** Full store state — forward-declared for slice typing. */
export interface StoreState {
  projectName: string;
  nodes: CanvasNode[];
  edges: Edge[];
  selectedId: string | null;
  panelOpen: boolean;
  exportOpen: false | "fcpxml" | "edl";
  contextMenu: ContextMenuState | null;
  past: Snapshot[];
  future: Snapshot[];
  editorCompId: string | null;
  editorMode: "full" | "collapsed";
  selectedClipId: string | null;
  editorScriptId: string | null;
  batchVideoSbId: string | null;

  // core actions
  setProjectName: (n: string) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setNodes: (n: CanvasNode[]) => void;
  updateNode: (id: string, patch: Partial<CanvasNode> | ((n: CanvasNode) => CanvasNode)) => void;
  batchUpdatePositions: (updates: Record<string, { x: number; y: number }>) => void;
  addNode: (kind: NodeKind) => void;
  removeNode: (id: string) => void;
  addEdge: (from: string, to: string, sourceHandle?: string, toHandle?: string) => void;
  removeEdge: (id: string) => void;
  select: (id: string | null) => void;
  togglePanel: (open?: boolean) => void;
  setExport: (v: StoreState["exportOpen"]) => void;
  setContextMenu: (m: ContextMenuState | null) => void;

  // composition slice
  mergeToComposition: (nodeIds: string[]) => string | null;
  addToComposition: (nodeId: string) => string | null;
  openComposition: (id: string) => void;
  closeComposition: () => void;
  setEditorMode: (m: "full" | "collapsed") => void;
  selectClip: (id: string | null) => void;
  addVideoTrack: (compId: string) => void;
  addAudioTrack: (compId: string) => void;
  removeTrack: (compId: string, trackId: string) => void;
  updateClip: (compId: string, clipId: string, patch: Partial<Clip>) => void;
  removeClip: (compId: string, clipId: string) => void;
  moveClip: (compId: string, clipId: string, toTrackId: string, toStartSec: number) => void;
  reorderVideoTrack: (compId: string, trackId: string, clipIds: string[]) => void;
  toggleClipMute: (compId: string, clipId: string) => void;
  splitClip: (compId: string, clipId: string, atSec: number) => void;
  cropClip: (compId: string, clipId: string, side: "left" | "right", atSec: number) => void;
  setClipSpeed: (compId: string, clipId: string, speed: number) => void;
  addAudioClipFromNode: (compId: string, nodeId: string, atSec?: number) => void;

  // group slice
  createGroup: (nodeIds: string[]) => string | null;
  ungroupGroup: (id: string) => void;
  setGroupColor: (id: string, color: string) => void;
  setGroupLayout: (id: string, layout: "grid" | "horizontal" | "vertical") => void;
  convertGroupToStoryboard: (id: string) => string | null;
  executeGroup: (id: string) => void;

  // storyboard slice
  mergeToStoryboard: (nodeIds: string[]) => string | null;
  setStoryboardRatio: (id: string, ratio: AspectRatio) => void;
  setStoryboardGrid: (id: string, rows: number, cols: number) => void;
  toggleStoryboardIndex: (id: string) => void;
  clearStoryboard: (id: string) => void;
  convertStoryboardToGroup: (id: string) => string | null;
  ungroupStoryboard: (id: string) => void;
  reorderStoryboardCells: (id: string, fromIdx: number, toIdx: number) => void;
  duplicateStoryboard: (id: string) => string | null;
  stitchStoryboard: (id: string, resolution: "2K" | "4K") => Promise<string | null>;

  // script slice
  openScript: (id: string) => void;
  closeScript: () => void;
  generateScript: (id: string) => void;
  cancelScript: (id: string) => void;
  regenerateScript: (id: string) => void;
  updateScriptShot: (id: string, shotId: string, patch: Partial<ScriptShot>) => void;
  updateScriptCharacter: (
    id: string,
    shotId: string,
    charId: string,
    patch: Partial<ScriptCharacter>,
  ) => void;
  setScriptImage: (
    id: string,
    shotId: string,
    target: { kind: "ref" } | { kind: "character"; charId: string },
    src: string,
  ) => void;
  removeScriptImage: (
    id: string,
    shotId: string,
    target: { kind: "ref" } | { kind: "character"; charId: string },
  ) => void;
  removeScriptShot: (id: string, shotId: string) => void;
  setScriptView: (id: string, view: ScriptView) => void;
  toggleScriptColumn: (id: string, key: ScriptColumnKey) => void;
  setScriptFilter: (id: string, filter: Partial<ScriptFilter>) => void;
  generateStoryboardFromScript: (scriptId: string, shotIds: string[]) => void;
  setBatchVideoSbId: (id: string | null) => void;
  batchGenerateVideo: (sbId: string) => void;
  batchGenerateVideoFromScript: (
    scriptId: string,
    opts: {
      selectedShotIds: string[];
      model: string;
      aspectRatio: string;
      resolution: string;
      durations: Record<string, number>;
    },
  ) => void;
  setScriptWizardStep: (id: string, step: WizardStep) => void;
  addScriptShot: (id: string) => void;
  composeFinalPrompts: (id: string, shotIds: string[]) => void;
  extractAssets: (id: string) => void;
  addAsset: (id: string, asset: ScriptAsset) => void;
  updateAsset: (id: string, assetId: string, patch: Partial<ScriptAsset>) => void;
  removeAsset: (id: string, assetId: string) => void;
  generateAssets: (id: string, assetIds: string[]) => void;
  cancelAssetGeneration: (id: string, assetId: string) => void;
  materializeAssetGroups: (scriptId: string) => void;

  // computed
  totalDuration: () => number;
  shotCount: () => number;
  compositionCount: () => number;
}
