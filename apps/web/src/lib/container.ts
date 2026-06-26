// Shared "container wraps real nodes" helpers, used by both the storyboard
// (分镜组) and the 普通组 frame mode. Pure functions only — no React, no store —
// so they stay unit-testable. The React binding lives in
// `useStoryboardMembership.ts`.

import type { AspectRatio, CanvasNode, Edge, NodeKind } from "@/store/types";
import { autoGrid } from "@/lib/storyboard";
import { gridCell } from "@/lib/gridLayout";

// ── Storyboard container geometry ───────────────────────────────────────────
// These MUST match the chrome rendered by StoryboardGroupNode so member nodes
// (painted on top) align with the container's grid slots.
//
// 分镜组 lays out its members as FULL-SIZE real cards — the same footprint they
// have standing alone on the canvas — so building or ungrouping a storyboard
// only REPOSITIONS members, never resizes them. The grid cell therefore matches
// the real image-node footprint (IMG_W × IMG_H) and uses the wide frame gaps so
// members' connection-handle pills don't overlap across columns. `ratio` no
// longer affects the cell size (full cards have a fixed shape), but the param is
// kept so existing call sites and the ratio control stay compatible.
export const SB_PAD_X = 20; // horizontal padding inside the container
export const SB_HEADER_H = 20; // top inset of the grid (title sits OUTSIDE, above)
export const SB_PAD_BOTTOM = 20; // padding below the grid

// Member-card footprint + inter-card gaps for the storyboard grid. Defined just
// below, alongside the frame-group constants they mirror (single source for the
// real-node footprint), since `const` has no hoisting.

/** Slot pixel size for a storyboard cell (full member-card footprint). */
export function storyboardSlotSize(_ratio: AspectRatio): { w: number; h: number } {
  return { w: SB_CELL_W, h: SB_CELL_H };
}

/** Absolute canvas position of the member at `index` in a storyboard's grid. */
export function storyboardMemberPos(
  sbX: number,
  sbY: number,
  index: number,
  cols: number,
  ratio: AspectRatio,
): { x: number; y: number } {
  const { w, h } = storyboardSlotSize(ratio);
  return gridCell(index, cols, {
    baseX: sbX + SB_PAD_X,
    baseY: sbY + SB_HEADER_H,
    cellW: w,
    cellH: h,
    gapX: SB_CELL_GAP_X,
    gapY: SB_CELL_GAP_Y,
  });
}

/** Outer pixel size of a storyboard container for a given grid + ratio. */
export function storyboardSize(
  rows: number,
  cols: number,
  ratio: AspectRatio,
): { width: number; height: number } {
  const { w, h } = storyboardSlotSize(ratio);
  return {
    width: cols * w + (cols - 1) * SB_CELL_GAP_X + SB_PAD_X * 2,
    height: SB_HEADER_H + rows * h + (rows - 1) * SB_CELL_GAP_Y + SB_PAD_BOTTOM,
  };
}

// ── 普通组 (card grid) geometry ──────────────────────────────────────────────
// Footprint + spacing for plain "打组" cards laid out in a neat grid. Shared by
// groupSlice.createGroup / ungroupGroup / setGroupLayout and
// storyboardSlice.convertStoryboardToGroup — previously each inlined its own
// copy of these four numbers.
export const CARD_W = 240;
export const CARD_H = 160;
export const CARD_GAP = 20;
export const CARD_PAD = 24;

// Looser spacing used when a storyboard is ungrouped and its (full-size) members
// are spread back onto the canvas (storyboardSlice.ungroupStoryboard), so the
// cards don't overlap at the tighter slot spacing.
export const SB_UNGROUP_CELL_W = 460;
export const SB_UNGROUP_CELL_H = 340;

// ── Frame-group container geometry ──────────────────────────────────────────
// Connection handles render as a 22px "+" pill pushed 6px OUTSIDE each node
// (see styles.css .react-flow__handle), so a node needs ~28px clearance on its
// left and right. Two adjacent columns therefore need a horizontal gap > 56px
// or the pills overlap. We use a comfortable 96px. FRAME_PAD also exceeds 28px
// so the outer columns' pills stay inside the dashed frame.
export const FRAME_PAD = 40;
export const FRAME_HEADER = 44;
export const FRAME_GAP_X = 96;
export const FRAME_GAP_Y = 64;
// Real node footprints (must match GenerateImageNode / GenerateVideoNode).
export const IMG_W = 420;
export const IMG_H = 300;
export const VID_W = 480;
export const VID_H = 320;
export const FRAME_COLS = 2;

// Storyboard grid uses the same full-card footprint + handle-clearing gaps as
// the frame group, so 分镜组 members render at their real size (no thumbnails).
export const SB_CELL_W = IMG_W; // 420 — full image-card width
export const SB_CELL_H = IMG_H; // 300 — full image-card height
export const SB_CELL_GAP_X = FRAME_GAP_X; // 96 — clear the handle pills
export const SB_CELL_GAP_Y = FRAME_GAP_Y; // 64

/** Grid + outer box for a frame group of `count` cells at the given footprint. */
export function frameGroupBox(count: number, cellW: number, cellH: number) {
  const cols = Math.max(1, Math.min(count, FRAME_COLS));
  const rows = Math.max(1, Math.ceil(count / cols));
  const gridW = cols * cellW + (cols - 1) * FRAME_GAP_X;
  const gridH = rows * cellH + (rows - 1) * FRAME_GAP_Y;
  return {
    cols,
    rows,
    groupW: gridW + FRAME_PAD * 2,
    groupH: gridH + FRAME_PAD * 2 + FRAME_HEADER,
  };
}

// ── Generic grid layout ─────────────────────────────────────────────────────

export interface MemberGridOpts {
  baseX: number;
  baseY: number;
  cellW: number;
  cellH: number;
  gapX?: number;
  gapY?: number;
}

/** Map of index → absolute position for `count` items in a `cols`-wide grid. */
export function memberGridLayout(
  count: number,
  cols: number,
  opts: MemberGridOpts,
): Map<number, { x: number; y: number }> {
  const map = new Map<number, { x: number; y: number }>();
  for (let i = 0; i < count; i++) {
    map.set(i, gridCell(i, cols, opts));
  }
  return map;
}

// ── Membership lookup ───────────────────────────────────────────────────────

/** The ordered member ids of a container node (storyboard, or frame group). */
export function containerMemberIds(n: CanvasNode): string[] | null {
  if (n.kind === "storyboard") return n.data.storyboard.memberIds ?? [];
  if (n.kind === "nodeGroup" && n.data.frame) return n.data.memberIds ?? [];
  return null;
}

export interface ContainerRef {
  kind: "storyboard" | "nodeGroup";
  containerId: string;
  index: number;
}

/** Find the container (storyboard / frame group) a node belongs to, if any. */
export function findContainerOf(nodeId: string, nodes: CanvasNode[]): ContainerRef | null {
  for (const n of nodes) {
    const ids = containerMemberIds(n);
    if (!ids) continue;
    const index = ids.indexOf(nodeId);
    if (index >= 0) {
      return { kind: n.kind as ContainerRef["kind"], containerId: n.id, index };
    }
  }
  return null;
}

// ── Member id list ops (pure) ───────────────────────────────────────────────

export function addMembers(memberIds: string[], ids: string[]): string[] {
  const seen = new Set(memberIds);
  return [...memberIds, ...ids.filter((id) => !seen.has(id))];
}

export function removeMembers(memberIds: string[], ids: string[]): string[] {
  const drop = new Set(ids);
  return memberIds.filter((id) => !drop.has(id));
}

// ── Z-order: containers before their members ────────────────────────────────
// A container is painted behind its members via array order (no ReactFlow
// parentId). This stable transform guarantees every container is emitted
// before the members it wraps, regardless of their original relative order.
export function sortNodesContainerFirst(nodes: CanvasNode[]): CanvasNode[] {
  const memberIdsByContainer = new Map<string, string[]>();
  const allMembers = new Set<string>();
  for (const n of nodes) {
    const ids = containerMemberIds(n);
    if (ids && ids.length) {
      memberIdsByContainer.set(n.id, ids);
      ids.forEach((id) => allMembers.add(id));
    }
  }
  if (allMembers.size === 0) return nodes;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const emitted = new Set<string>();
  const result: CanvasNode[] = [];

  for (const n of nodes) {
    if (emitted.has(n.id)) continue;
    // A member is emitted together with its container; skip it standalone.
    if (allMembers.has(n.id) && !memberIdsByContainer.has(n.id)) continue;
    result.push(n);
    emitted.add(n.id);
    const memberIds = memberIdsByContainer.get(n.id);
    if (memberIds) {
      for (const mid of memberIds) {
        const m = byId.get(mid);
        if (m && !emitted.has(mid)) {
          result.push(m);
          emitted.add(mid);
        }
      }
    }
  }
  // Members whose container was missing — keep them (appended in original order).
  for (const n of nodes) {
    if (!emitted.has(n.id)) {
      result.push(n);
      emitted.add(n.id);
    }
  }
  return result;
}

// ── Member snapshot ─────────────────────────────────────────────────────────
// A lightweight {id, kind, name} record stored on the container so toolbars can
// list members without walking the node array. Single source for the snapshot
// shape — callers must not re-inline `.map(n => ({id, kind, name}))`.
export interface MemberSnapshot {
  id: string;
  kind: NodeKind;
  name?: string;
  duration?: number;
}

/** Snapshot the given member ids against the current node array. */
export function snapshotMembers(ids: string[], nodes: CanvasNode[]): MemberSnapshot[] {
  return ids.map((id) => {
    const n = nodes.find((x) => x.id === id);
    return { id, kind: (n?.kind ?? "image") as NodeKind, name: n?.data.name };
  });
}

// ── Edge endpoint remap ─────────────────────────────────────────────────────
// Rewrite edge endpoints through an id map (old id → new id). Ids absent from
// the map are left untouched, and edges with no remapped endpoint keep their
// identity (===). Used by group↔storyboard conversion (single-id map) and by
// duplicateStoryboard (container + members map, on a pre-filtered subset).
export function remapEdges(edges: Edge[], idMap: Map<string, string>): Edge[] {
  return edges.map((e) => {
    const from = idMap.get(e.from) ?? e.from;
    const to = idMap.get(e.to) ?? e.to;
    return from === e.from && to === e.to ? e : { ...e, from, to };
  });
}

// ── The single "build a container" entry point ──────────────────────────────
// Encapsulates the grid math + container-node assembly that was previously
// copy-pasted across seven call sites. PURE: it returns data only — prepending
// the node, repositioning members and rewiring edges stay the caller's job.
export type ContainerMode = "cardGroup" | "frameGroup" | "storyboard";

export interface BuildContainerParams {
  mode: ContainerMode;
  containerId: string;
  name: string;
  /** Ordered member ids — drives both layout order and the snapshot order. */
  memberIds: string[];
  /** Top-left of the container node on the canvas. */
  origin: { x: number; y: number };
  // Member snapshot source: pass `members` for freshly-created nodes (not yet
  // on the canvas), or `nodes` to snapshot members that already exist.
  members?: MemberSnapshot[];
  nodes?: CanvasNode[];
  // frameGroup: real-node footprint (image vs video cells).
  cellKind?: "image" | "video";
  // cardGroup / storyboard grid. Defaults: cardGroup → ceil(sqrt(n)) cols,
  // storyboard → autoGrid(n).
  cols?: number;
  rows?: number;
  // storyboard only.
  ratio?: AspectRatio;
  // nodeGroup-only visual + behavioural extras (groupColor, connectable,
  // sourceScriptId, …). Ignored for storyboard.
  groupColor?: string;
  extraData?: Record<string, unknown>;
}

export interface BuiltContainer {
  containerNode: CanvasNode;
  /** Member id → absolute canvas position for the laid-out grid. */
  memberPositions: Map<string, { x: number; y: number }>;
}

export function buildContainer(p: BuildContainerParams): BuiltContainer {
  const { mode, containerId, name, memberIds, origin } = p;
  const count = memberIds.length;
  const members = p.members ?? snapshotMembers(memberIds, p.nodes ?? []);
  const memberPositions = new Map<string, { x: number; y: number }>();

  if (mode === "storyboard") {
    const grid = autoGrid(count);
    const cols = Math.max(1, p.cols ?? grid.cols);
    const rows = Math.max(1, p.rows ?? grid.rows);
    const ratio = p.ratio ?? ("16:9" as AspectRatio);
    memberIds.forEach((mid, i) =>
      memberPositions.set(mid, storyboardMemberPos(origin.x, origin.y, i, cols, ratio)),
    );
    const containerNode = {
      id: containerId,
      kind: "storyboard",
      x: origin.x,
      y: origin.y,
      data: {
        name,
        storyboard: { rows, cols, ratio, showIndex: false, memberIds, members },
      },
    } as CanvasNode;
    return { containerNode, memberPositions };
  }

  // nodeGroup frame modes (cardGroup / frameGroup) — differ only in geometry.
  let cols: number;
  let rows: number;
  let groupWidth: number;
  let groupHeight: number;

  if (mode === "frameGroup") {
    const cellW = p.cellKind === "video" ? VID_W : IMG_W;
    const cellH = p.cellKind === "video" ? VID_H : IMG_H;
    const box = frameGroupBox(count, cellW, cellH);
    cols = box.cols;
    rows = box.rows;
    groupWidth = box.groupW;
    groupHeight = box.groupH;
    const baseX = origin.x + FRAME_PAD;
    const baseY = origin.y + FRAME_PAD + FRAME_HEADER;
    memberIds.forEach((mid, i) =>
      memberPositions.set(
        mid,
        gridCell(i, cols, {
          baseX,
          baseY,
          cellW,
          cellH,
          gapX: FRAME_GAP_X,
          gapY: FRAME_GAP_Y,
        }),
      ),
    );
  } else {
    // cardGroup
    cols = Math.max(1, p.cols ?? Math.ceil(Math.sqrt(count)));
    rows = Math.max(1, Math.ceil(count / cols));
    groupWidth = cols * CARD_W + (cols - 1) * CARD_GAP + CARD_PAD * 2;
    groupHeight = rows * CARD_H + (rows - 1) * CARD_GAP + CARD_PAD * 2;
    const baseX = origin.x + CARD_PAD;
    const baseY = origin.y + CARD_PAD;
    memberIds.forEach((mid, i) =>
      memberPositions.set(
        mid,
        gridCell(i, cols, {
          baseX,
          baseY,
          cellW: CARD_W,
          cellH: CARD_H,
          gapX: CARD_GAP,
          gapY: CARD_GAP,
        }),
      ),
    );
  }

  const containerNode = {
    id: containerId,
    kind: "nodeGroup",
    x: origin.x,
    y: origin.y,
    data: {
      name,
      memberIds,
      members,
      groupColor: p.groupColor ?? "#56C7CF",
      groupLayout: "grid",
      frame: true,
      groupWidth,
      groupHeight,
      ...p.extraData,
    },
  } as CanvasNode;

  return { containerNode, memberPositions };
}
