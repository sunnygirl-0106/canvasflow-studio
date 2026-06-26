import { autoGrid, stitchToDataURL } from "@/lib/storyboard";
import {
  storyboardMemberPos,
  storyboardSize,
  buildContainer,
  remapEdges,
  snapshotMembers,
  SB_UNGROUP_CELL_W,
  SB_UNGROUP_CELL_H,
} from "@/lib/container";
import { gridCell } from "@/lib/gridLayout";
import {
  type CanvasNode,
  type Edge,
  type NodeKind,
  type AspectRatio,
  type SetState,
  type GetState,
  DEFAULT_RATIO,
  STORYBOARD_MAX,
} from "./types";

const MEDIA_KINDS: NodeKind[] = ["image", "generateImage", "generateVideo"];

/** Read a node's live image/video src, if any. */
function nodeSrc(n: CanvasNode): string | undefined {
  return "src" in n.data ? (n.data as { src?: string }).src : undefined;
}

export function createStoryboardSlice(set: SetState, get: GetState) {
  return {
    mergeToStoryboard: (nodeIds: string[]) => {
      const { nodes } = get();
      const picked = nodes
        .filter(
          (n): n is Extract<CanvasNode, { kind: "image" | "generateImage" | "generateVideo" }> =>
            nodeIds.includes(n.id) && MEDIA_KINDS.includes(n.kind),
        )
        .sort((a, b) => a.y - b.y || a.x - b.x);
      if (picked.length < 2) return null;

      get().pushHistory();

      const ts = Date.now();
      const sbId = `storyboard-${ts}`;
      const { rows, cols } = autoGrid(picked.length);

      const maxX = Math.max(...picked.map((n) => n.x));
      const minY = Math.min(...picked.map((n) => n.y));
      const maxY = Math.max(...picked.map((n) => n.y));
      const sbX = maxX + 400;
      const sbY = (minY + maxY) / 2;

      const memberIds = picked.map((n) => n.id);

      // Snap each member into its grid slot (absolute coords).
      const { containerNode: sbNode, memberPositions: posById } = buildContainer({
        mode: "storyboard",
        containerId: sbId,
        name: `分镜组 ${nodes.filter((n) => n.kind === "storyboard").length + 1}`,
        memberIds,
        origin: { x: sbX, y: sbY },
        nodes,
        ratio: DEFAULT_RATIO,
        rows,
        cols,
      });

      set((s) => ({
        // Container prepended → painted behind its (kept) real members.
        nodes: [
          sbNode,
          ...s.nodes.map((n) => {
            const p = posById.get(n.id);
            return p ? { ...n, x: p.x, y: p.y } : n;
          }),
        ],
        selectedId: sbId,
        panelOpen: false,
      }));
      return sbId;
    },

    setStoryboardRatio: (id: string, ratio: AspectRatio) => {
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return;
      get().pushHistory();
      const sb = sbNode.data.storyboard;
      const posById = new Map<string, { x: number; y: number }>();
      sb.memberIds.forEach((mid, i) =>
        posById.set(mid, storyboardMemberPos(sbNode.x, sbNode.y, i, sb.cols, ratio)),
      );
      set((s) => ({
        nodes: s.nodes.map((n) => {
          if (n.id === id && n.kind === "storyboard")
            return { ...n, data: { ...n.data, storyboard: { ...n.data.storyboard, ratio } } };
          const p = posById.get(n.id);
          return p ? { ...n, x: p.x, y: p.y } : n;
        }),
      }));
    },

    setStoryboardGrid: (id: string, rows: number, cols: number) => {
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      rows = clamp(rows, 1, STORYBOARD_MAX);
      cols = clamp(cols, 1, STORYBOARD_MAX);
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return;
      get().pushHistory();
      const sb = sbNode.data.storyboard;
      const ratio = sb.ratio;

      const capacity = rows * cols;
      const keep = sb.memberIds.slice(0, capacity);
      const overflow = sb.memberIds.slice(capacity);

      const posById = new Map<string, { x: number; y: number }>();
      keep.forEach((mid, i) =>
        posById.set(mid, storyboardMemberPos(sbNode.x, sbNode.y, i, cols, ratio)),
      );
      // Overflow members are evicted: spill them to the right of the container
      // as free nodes (removed from memberIds below).
      const { width } = storyboardSize(rows, cols, ratio);
      overflow.forEach((mid, i) =>
        posById.set(mid, { x: sbNode.x + width + 80 + i * 280, y: sbNode.y }),
      );

      set((s) => ({
        nodes: s.nodes.map((n) => {
          if (n.id === id && n.kind === "storyboard")
            return {
              ...n,
              data: {
                ...n.data,
                storyboard: {
                  ...n.data.storyboard,
                  rows,
                  cols,
                  memberIds: keep,
                  members: snapshotMembers(keep, s.nodes),
                },
              },
            };
          const p = posById.get(n.id);
          return p ? { ...n, x: p.x, y: p.y } : n;
        }),
      }));
    },

    toggleStoryboardIndex: (id: string) => {
      get().pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id && n.kind === "storyboard"
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

    // 「清空」= delete the member nodes (undo-recoverable), then empty memberIds.
    clearStoryboard: (id: string) => {
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return;
      get().pushHistory();
      const memberSet = new Set(sbNode.data.storyboard.memberIds);
      set((s) => ({
        nodes: s.nodes
          .filter((n) => !memberSet.has(n.id))
          .map((n) =>
            n.id === id && n.kind === "storyboard"
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    storyboard: { ...n.data.storyboard, memberIds: [], members: [] },
                  },
                }
              : n,
          ),
        edges: s.edges.filter((e) => !memberSet.has(e.from) && !memberSet.has(e.to)),
      }));
    },

    // 转普通组: members are already real nodes — swap the container to a frame
    // group (no node recreation) and re-space members to card spacing (slot
    // spacing is too tight for full cards). `frame: true` keeps GroupNode a
    // dashed container so it never double-renders thumbnails.
    convertStoryboardToGroup: (id: string) => {
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return null;
      const sb = sbNode.data.storyboard;

      get().pushHistory();
      const ts = Date.now();
      const groupId = `group-${ts}`;

      const { containerNode: groupNode, memberPositions: posById } = buildContainer({
        mode: "cardGroup",
        containerId: groupId,
        name: sbNode.data.name ?? "普通组",
        memberIds: [...sb.memberIds],
        origin: { x: sbNode.x, y: sbNode.y },
        nodes,
        cols: Math.max(1, sb.cols),
        groupColor: "#56C7CF",
      });

      set((s) => ({
        nodes: [
          groupNode,
          ...s.nodes
            .filter((n) => n.id !== id)
            .map((n) => {
              const p = posById.get(n.id);
              return p ? { ...n, x: p.x, y: p.y } : n;
            }),
        ],
        edges: remapEdges(s.edges, new Map([[id, groupId]])),
        selectedId: groupId,
      }));
      return groupId;
    },

    // 解组: drop the container; members stay as real nodes. Re-space them to a
    // comfortable grid so full cards don't overlap at slot spacing.
    ungroupStoryboard: (id: string) => {
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return;
      const sb = sbNode.data.storyboard;
      get().pushHistory();

      const cols = Math.max(1, sb.cols);
      const posById = new Map<string, { x: number; y: number }>();
      sb.memberIds.forEach((mid, i) =>
        posById.set(
          mid,
          gridCell(i, cols, {
            baseX: sbNode.x,
            baseY: sbNode.y,
            cellW: SB_UNGROUP_CELL_W,
            cellH: SB_UNGROUP_CELL_H,
          }),
        ),
      );

      set((s) => ({
        nodes: s.nodes
          .filter((n) => n.id !== id)
          .map((n) => {
            const p = posById.get(n.id);
            return p ? { ...n, x: p.x, y: p.y } : n;
          }),
        edges: s.edges.filter((e) => e.from !== id && e.to !== id),
        selectedId: null,
      }));
    },

    // Append slot: create a new image node and add it as the next member.
    // `opts.src` fills it immediately (from upload / history); otherwise empty.
    addStoryboardMember: (id: string, opts?: { src?: string }) => {
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return null;
      const sb = sbNode.data.storyboard;
      if (sb.memberIds.length >= sb.rows * sb.cols) return null; // grid full
      get().pushHistory();
      const ts = Date.now();
      const memId = `gimg-sb-${ts}`;
      const idx = sb.memberIds.length;
      const pos = storyboardMemberPos(sbNode.x, sbNode.y, idx, sb.cols, sb.ratio);
      const src = opts?.src;
      const memberNode: CanvasNode = {
        id: memId,
        kind: "generateImage",
        x: pos.x,
        y: pos.y,
        data: { name: `分镜 ${idx + 1}`, status: src ? "ready" : "empty", ...(src ? { src } : {}) },
      };
      const memberIds = [...sb.memberIds, memId];
      set((s) => ({
        nodes: [
          ...s.nodes.map((n) =>
            n.id === id && n.kind === "storyboard"
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    storyboard: {
                      ...n.data.storyboard,
                      memberIds,
                      members: snapshotMembers(memberIds, [...s.nodes, memberNode]),
                    },
                  },
                }
              : n,
          ),
          memberNode,
        ],
        selectedId: memId,
      }));
      return memId;
    },

    reorderStoryboardMembers: (id: string, fromIdx: number, toIdx: number) => {
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return;
      get().pushHistory();
      const sb = sbNode.data.storyboard;
      const memberIds = [...sb.memberIds];
      if (fromIdx < 0 || fromIdx >= memberIds.length) return;
      const [moved] = memberIds.splice(fromIdx, 1);
      memberIds.splice(toIdx, 0, moved);

      const posById = new Map<string, { x: number; y: number }>();
      memberIds.forEach((mid, i) =>
        posById.set(mid, storyboardMemberPos(sbNode.x, sbNode.y, i, sb.cols, sb.ratio)),
      );

      set((s) => ({
        nodes: s.nodes.map((n) => {
          if (n.id === id && n.kind === "storyboard")
            return {
              ...n,
              data: {
                ...n.data,
                storyboard: {
                  ...n.data.storyboard,
                  memberIds,
                  members: snapshotMembers(memberIds, s.nodes),
                },
              },
            };
          const p = posById.get(n.id);
          return p ? { ...n, x: p.x, y: p.y } : n;
        }),
      }));
    },

    duplicateStoryboard: (id: string) => {
      const { nodes, edges } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return null;
      const sb = sbNode.data.storyboard;

      get().pushHistory();
      const ts = Date.now();
      const newId = `storyboard-dup-${ts}`;
      const OFFSET = 60;

      // Deep-copy each member real node with a fresh id.
      const idMap = new Map<string, string>();
      const dupMembers: CanvasNode[] = [];
      sb.memberIds.forEach((mid, i) => {
        const orig = nodes.find((n) => n.id === mid);
        if (!orig) return;
        const newMid = `${mid}-dup-${ts}-${i}`;
        idMap.set(mid, newMid);
        dupMembers.push({
          ...orig,
          id: newMid,
          x: orig.x + OFFSET,
          y: orig.y + OFFSET,
          data: { ...orig.data },
        } as CanvasNode);
      });

      const newMemberIds = sb.memberIds.map((mid) => idMap.get(mid)).filter(Boolean) as string[];

      const dupNode: CanvasNode = {
        ...sbNode,
        id: newId,
        x: sbNode.x + OFFSET,
        y: sbNode.y + OFFSET,
        data: {
          ...sbNode.data,
          name: `${sbNode.data.name ?? "分镜组"} 副本`,
          storyboard: {
            ...sb,
            memberIds: newMemberIds,
            members: snapshotMembers(newMemberIds, dupMembers),
          },
        },
      };

      // Remap edges among container + duplicated members. The id map covers the
      // container (id → newId) plus every member; remapEdges rewrites endpoints,
      // then each cloned edge gets a fresh id.
      const fullMap = new Map(idMap);
      fullMap.set(id, newId);
      const touchesDup = (nid: string) => fullMap.has(nid);
      const newEdges: Edge[] = remapEdges(
        edges.filter((e) => touchesDup(e.from) || touchesDup(e.to)),
        fullMap,
      ).map((e, i) => ({ ...e, id: `e-dup-${ts}-${i}` }));

      set((s) => ({
        // Container before its duplicated members.
        nodes: [...s.nodes, dupNode, ...dupMembers],
        edges: [...s.edges, ...newEdges],
        selectedId: newId,
      }));
      return newId;
    },

    stitchStoryboard: async (id: string, resolution: "2K" | "4K") => {
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return null;
      const sb = sbNode.data.storyboard;

      // Resolve live src from the real member nodes, in order.
      const items = sb.memberIds.map((mid, idx) => {
        const n = nodes.find((x) => x.id === mid);
        return { src: n ? nodeSrc(n) : undefined, idx };
      });

      const {
        dataURL,
        width: imgW,
        height: imgH,
      } = await stitchToDataURL(
        items,
        { rows: sb.rows, cols: sb.cols, ratio: sb.ratio, showIndex: sb.showIndex },
        resolution,
      );

      get().pushHistory();
      const ts = Date.now();
      const imgId = `image-stitch-${ts}`;
      // Place the result beside the storyboard (to its right), not below.
      const { width: sbWidth } = storyboardSize(sb.rows, sb.cols, sb.ratio);
      const imgNode: CanvasNode = {
        id: imgId,
        kind: "image",
        x: sbNode.x + sbWidth + 80,
        y: sbNode.y,
        data: {
          src: dataURL,
          name: `分镜拼接-${resolution.toLowerCase()}`,
          width: imgW,
          height: imgH,
        },
      };

      set((s) => ({
        nodes: [...s.nodes, imgNode],
        selectedId: imgId,
      }));
      return imgId;
    },
  };
}
