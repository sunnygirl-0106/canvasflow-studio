// Re-export all shared types — single import point for the web app.
// Components import from "@/store/canvasStore" or "@/store/types" as before.

export * from "@canvasflow/shared";

// ── Store-specific types ────────────────────────────────────────────────────

import type {
  CanvasNode,
  Edge,
  ContextMenuState,
  Snapshot,
  NodeKind,
  Clip,
  AspectRatio,
  ScriptShot,
  ScriptCharacter,
  ScriptColumnKey,
  ScriptFilter,
  ScriptView,
  ScriptAsset,
  WizardStep,
} from "@canvasflow/shared";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface StoreState {
  projectId: string;
  projectName: string;
  nodes: CanvasNode[];
  edges: Edge[];
  selectedId: string | null;
  panelOpen: boolean;
  exportOpen: false | "fcpxml" | "edl";
  contextMenu: ContextMenuState | null;
  addPanel: { open: boolean; x?: number; y?: number };
  past: Snapshot[];
  future: Snapshot[];
  editorCompId: string | null;
  editorMode: "full" | "collapsed";
  selectedClipId: string | null;
  editorScriptId: string | null;
  batchVideoSbId: string | null;
  saveStatus: SaveStatus;
  // In-memory clipboard for 复制 / 粘贴 (deep-cloned node snapshots).
  clipboard: CanvasNode[] | null;

  setProjectName: (n: string) => void;
  loadFromServer: (id: string) => Promise<void>;
  saveToServer: () => Promise<void>;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setNodes: (n: CanvasNode[]) => void;
  updateNode: (id: string, patch: Partial<CanvasNode> | ((n: CanvasNode) => CanvasNode)) => void;
  batchUpdatePositions: (updates: Record<string, { x: number; y: number }>) => void;
  addNode: (kind: NodeKind) => string;
  addNodeAtPosition: (kind: NodeKind, x: number, y: number) => string;
  removeNode: (id: string) => void;
  removeNodes: (ids: string[]) => void;
  duplicateNodes: (ids: string[]) => string[];
  copyNodes: (ids: string[]) => void;
  pasteNodes: () => string[];
  addEdge: (from: string, to: string, sourceHandle?: string, toHandle?: string) => void;
  removeEdge: (id: string) => void;
  select: (id: string | null) => void;
  togglePanel: (open?: boolean) => void;
  setExport: (v: StoreState["exportOpen"]) => void;
  setContextMenu: (m: ContextMenuState | null) => void;
  setAddPanel: (panel: { open: boolean; x?: number; y?: number }) => void;

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
  resizeClipRight: (compId: string, clipId: string, newDuration: number) => void;
  removeClip: (compId: string, clipId: string) => void;
  moveClip: (compId: string, clipId: string, toTrackId: string, toStartSec: number) => void;
  reorderVideoTrack: (compId: string, trackId: string, clipIds: string[]) => void;
  toggleClipMute: (compId: string, clipId: string) => void;
  splitClip: (compId: string, clipId: string, atSec: number) => void;
  cropClip: (compId: string, clipId: string, side: "left" | "right", atSec: number) => void;
  setClipSpeed: (compId: string, clipId: string, speed: number) => void;
  addAudioClipFromNode: (compId: string, nodeId: string, atSec?: number) => void;

  createGroup: (nodeIds: string[]) => string | null;
  ungroupGroup: (id: string) => void;
  setGroupColor: (id: string, color: string) => void;
  setGroupLayout: (id: string, layout: "grid" | "horizontal" | "vertical") => void;
  convertGroupToStoryboard: (id: string) => string | null;
  executeGroup: (id: string) => void;

  mergeToStoryboard: (nodeIds: string[]) => string | null;
  setStoryboardRatio: (id: string, ratio: AspectRatio) => void;
  setStoryboardGrid: (id: string, rows: number, cols: number) => void;
  toggleStoryboardIndex: (id: string) => void;
  clearStoryboard: (id: string) => void;
  convertStoryboardToGroup: (id: string) => string | null;
  ungroupStoryboard: (id: string) => void;
  reorderStoryboardMembers: (id: string, fromIdx: number, toIdx: number) => void;
  addStoryboardMember: (id: string, opts?: { src?: string }) => string | null;
  duplicateStoryboard: (id: string) => string | null;
  stitchStoryboard: (id: string, resolution: "2K" | "4K") => Promise<string | null>;

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
  materializeAssetGroups: (scriptId: string) => void;
  reconcileShotReferenceEdges: (scriptId: string) => void;
  relayoutShotGroups: (scriptId: string) => void;

  totalDuration: () => number;
  shotCount: () => number;
  compositionCount: () => number;
}

export type SetState = (
  partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>),
) => void;
export type GetState = () => StoreState;
