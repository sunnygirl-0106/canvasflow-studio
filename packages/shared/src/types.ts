// ── Shared types for CanvasFlow ─────────────────────────────────────────────

// ── Node kinds ──────────────────────────────────────────────────────────────

export type NodeKind =
  | "image"
  | "generateImage"
  | "generateVideo"
  | "composition"
  | "audio"
  | "nodeGroup"
  | "storyboard"
  | "text"
  | "script"
  | "director";

// ── Track / Clip ────────────────────────────────────────────────────────────

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
  color: ClipColor;
  status: ShotStatus;
  clipKind: TrackKind;
  muted?: boolean;
}

export type ClipColor = "cyan" | "purple" | "yellow" | "rose" | "emerald" | "gray";

export interface Track {
  id: string;
  kind: TrackKind;
  name: string;
  clips: Clip[];
}

export const MAX_VIDEO_TRACKS = 2;

// ── Storyboard ──────────────────────────────────────────────────────────────

export type AspectRatio = "21:9" | "16:9" | "9:16" | "3:4" | "4:3" | "1:1";

/** @deprecated Virtual-cell model. Kept only for migrating old saves into the
 *  real-node container model (see `StoryboardData.memberIds`). Do not write. */
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
  // Ordered member node ids (order = storyboard shot number 1..N). The single
  // source of truth: a storyboard is a real container wrapping these real
  // canvas nodes, laid out at grid slots. The members render their own live
  // `src` (cover-cropped to `ratio`); nothing is snapshotted here.
  memberIds: string[];
  // Name/kind snapshot, mirrors `GroupNodeData.members` — used to rebuild a
  // member or render a name fallback when the real node is gone.
  members?: { id: string; kind: NodeKind; name?: string }[];
  // @deprecated Migration-only. Old saves stored the grid contents here; new
  // writes use `memberIds`. `sanitizeNodes` migrates `cells` → real nodes.
  cells?: StoryboardCell[];
}

export const STORYBOARD_RATIOS: AspectRatio[] = [
  "21:9",
  "16:9",
  "9:16",
  "3:4",
  "4:3",
  "1:1",
];
export const STORYBOARD_PRESETS = [2, 3, 4, 5];
export const STORYBOARD_MAX = 10;
export const STORYBOARD_CELL_PX = 220;
export const STORYBOARD_GAP_PX = 16;
export const DEFAULT_RATIO: AspectRatio = "16:9";

// ── Script ──────────────────────────────────────────────────────────────────

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
  // Set when the user ungroups the asset group. Once detached, the materialized
  // image nodes become independent and the store stops auto-rebuilding the group
  // when assets are regenerated.
  assetGroupDetached?: boolean;
}

export const SCRIPT_MODELS = ["GVLM 3.1"];
export const SCRIPT_NODE_WIDTH = 700;
export const SCRIPT_SHOT_TYPES = ["特写", "近景", "中近景", "中景", "全景", "远景"];

// ── Discriminated-union CanvasNode ───────────────────────────────────────────
//
// Each node kind carries only the `data` it actually uses — no more optional bag.

interface NodeBase {
  id: string;
  x: number;
  y: number;
}

// Index signature makes data interfaces compatible with ReactFlow's Record<string, unknown>.
interface NodeDataBase {
  name: string;
  [key: string]: unknown;
}

export type NodeStatus = "empty" | "generating" | "ready";

export type VideoMode = "text" | "firstFrame" | "headTail" | "ref";

export interface ImageNodeData extends NodeDataBase {
  src?: string;
  status?: NodeStatus;
  prompt?: string;
  model?: string;
  useMainImage?: boolean;
  estimatedCost?: number;
  progress?: number;
  // Intrinsic pixel size, shown as a "W × H" badge (e.g. stitch results).
  width?: number;
  height?: number;
  // When this image node was materialized from a script's asset, these link it
  // back to the source asset so the store can keep its `src` in sync when the
  // asset is regenerated. Cleared if the asset group is ungrouped (detached).
  assetScriptId?: string;
  assetId?: string;
}

export interface GenerateImageNodeData extends NodeDataBase {
  src?: string;
  status?: NodeStatus;
  prompt?: string;
  model?: string;
  useMainImage?: boolean;
  estimatedCost?: number;
  progress?: number;
}

export interface GenerateVideoNodeData extends NodeDataBase {
  src?: string;
  duration?: number;
  status?: NodeStatus;
  prompt?: string;
  model?: string;
  videoMode?: VideoMode;
  aspect?: string;
  resolution?: string;
  withSound?: boolean;
  estimatedCost?: number;
  progress?: number;
  referenceNodeId?: string;
}

export interface CompositionNodeData extends NodeDataBase {
  width: number;
  pxPerSecond: number;
  tracks: Track[];
}

export interface AudioNodeData extends NodeDataBase {
  duration: number;
  waveform: string;
}

export interface GroupNodeData extends NodeDataBase {
  memberIds: string[];
  // Name + kind only. `src` is intentionally NOT cached here — the renderer
  // looks up the live member node by id and reads its current `src`, so
  // regenerating a source image immediately reflects in the group thumbnail.
  // `duration` is the planned duration for to-be-generated videos in a batch
  // group; it is the group's own decision, not derived.
  members: { id: string; kind: NodeKind; name?: string; duration?: number }[];
  groupColor: string;
  groupLayout: "grid" | "horizontal" | "vertical";
  groupWidth?: number;
  groupHeight?: number;
  executing?: boolean;
  // `frame: true` → render as a labelled dashed container around its real
  // member nodes (used by asset groups whose members are real image nodes),
  // rather than as a self-contained thumbnail card. Avoids double-rendering.
  frame?: boolean;
  // For asset groups: the script node this group's assets belong to.
  sourceScriptId?: string;
  // `connectable: false` → the group is purely a visual container with no
  // connection handles. Used by the asset group: grouping is only for visual
  // distinction; the real connections run from each member image to the script.
  connectable?: boolean;
}

export interface StoryboardNodeData extends NodeDataBase {
  storyboard: StoryboardData;
  scriptSourceId?: string;
}

export interface TextNodeData extends NodeDataBase {
  text: string;
}

export interface ScriptNodeData extends NodeDataBase {
  script: ScriptData;
}

export interface DirectorNodeData extends NodeDataBase {
  // Placeholder card only for now — the 3D director stage opens elsewhere.
  description?: string;
  /**
   * Panorama screenshot captured from the 3D director stage. The stage only
   * accepts 2:1 scenes, so this image is always 2:1. When present the node
   * renders the panorama thumbnail instead of the empty placeholder.
   */
  panorama?: string;
}

export type ImageNode = NodeBase & { kind: "image"; data: ImageNodeData };
export type GenerateImageNode = NodeBase & { kind: "generateImage"; data: GenerateImageNodeData };
export type GenerateVideoNode = NodeBase & { kind: "generateVideo"; data: GenerateVideoNodeData };
export type CompositionNode = NodeBase & { kind: "composition"; data: CompositionNodeData };
export type AudioNode = NodeBase & { kind: "audio"; data: AudioNodeData };
export type GroupNode = NodeBase & { kind: "nodeGroup"; data: GroupNodeData };
export type StoryboardNode = NodeBase & { kind: "storyboard"; data: StoryboardNodeData };
export type TextNode = NodeBase & { kind: "text"; data: TextNodeData };
export type ScriptNode = NodeBase & { kind: "script"; data: ScriptNodeData };
export type DirectorNode = NodeBase & { kind: "director"; data: DirectorNodeData };

export type CanvasNode =
  | ImageNode
  | GenerateImageNode
  | GenerateVideoNode
  | CompositionNode
  | AudioNode
  | GroupNode
  | StoryboardNode
  | TextNode
  | ScriptNode
  | DirectorNode;

// ── Loose node data — union of all node data types.
// Useful for React components that receive `data` from ReactFlow before narrowing.
export type AnyNodeData =
  | ImageNodeData
  | GenerateImageNodeData
  | GenerateVideoNodeData
  | CompositionNodeData
  | AudioNodeData
  | GroupNodeData
  | StoryboardNodeData
  | TextNodeData
  | ScriptNodeData
  | DirectorNodeData;

// ── Edge ────────────────────────────────────────────────────────────────────

export interface Edge {
  id: string;
  from: string;
  to: string;
  toHandle?: string;
  sourceHandle?: string;
  color?: string;
}

// ── Context menu ────────────────────────────────────────────────────────────

export interface ContextMenuState {
  x: number;
  y: number;
  targetNodeId: string | null;
}

export type Snapshot = { nodes: CanvasNode[]; edges: Edge[] };

// ── Clip helpers ────────────────────────────────────────────────────────────

export const clipEnd = (c: Clip) => c.startSec + c.duration;

export const trackDuration = (t: Track) =>
  t.clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0);

export const compDuration = (tracks: Track[]) =>
  tracks.reduce((max, t) => Math.max(max, trackDuration(t)), 0);

export function clipAt(track: Track, t: number): Clip | null {
  return track.clips.find((c) => t >= c.startSec && t < clipEnd(c)) ?? null;
}

export const CLIP_COLORS: ClipColor[] = ["cyan", "purple", "yellow", "rose", "emerald"];
export const colorByIndex = (index: number): ClipColor =>
  CLIP_COLORS[index % CLIP_COLORS.length];

export const colorHexMap: Record<ClipColor, string> = {
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
    if (n.id !== compId || n.kind !== "composition") return n;
    const updated = fn(n.data.tracks);
    return { ...n, data: { ...n.data, tracks: updated } };
  });
}

// ── Clip factory ────────────────────────────────────────────────────────────

export function createVideoClip(opts: {
  index: number;
  name: string;
  startSec: number;
  duration: number;
  bindings?: string[];
  thumbnail?: string;
}): Clip {
  const id = `clip-${crypto.randomUUID().slice(0, 12)}`;
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
  const id = `clip-audio-${crypto.randomUUID().slice(0, 12)}`;
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

// ── Node name map ───────────────────────────────────────────────────────────

export const NODE_DEFAULT_NAMES: Record<NodeKind, string> = {
  image: "图片",
  generateImage: "图片",
  generateVideo: "视频",
  composition: "视频合成",
  audio: "音频",
  nodeGroup: "组",
  storyboard: "分镜组",
  text: "剧本",
  script: "未命名脚本",
  director: "导演台",
};

// ── API types ───────────────────────────────────────────────────────────────

export interface GenerateScriptRequest {
  sourceText: string;
  promptText: string;
  model: string;
}

export interface GenerateAssetsRequest {
  assetIds: string[];
  assets: ScriptAsset[];
}

export interface ComposeFinalPromptsRequest {
  shotIds: string[];
  shots: ScriptShot[];
}
