import { autoGrid, fillCells, reflow, stitchToDataURL } from "@/lib/storyboard";
import {
  type CanvasNode,
  type ImageNode,
  type Edge,
  type NodeKind,
  type AspectRatio,
  type SetState,
  type GetState,
  DEFAULT_RATIO,
  STORYBOARD_MAX,
} from "./types";

export function createStoryboardSlice(set: SetState, get: GetState) {
  return {
    mergeToStoryboard: (nodeIds: string[]) => {
      const { nodes } = get();
      const mediaKinds: NodeKind[] = ["image", "generateImage", "generateVideo"];
      const picked = nodes
        .filter(
          (n): n is Extract<CanvasNode, { kind: "image" | "generateImage" | "generateVideo" }> =>
            nodeIds.includes(n.id) && mediaKinds.includes(n.kind),
        )
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

    setStoryboardRatio: (id: string, ratio: AspectRatio) => {
      get().pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id && n.kind === "storyboard"
            ? { ...n, data: { ...n.data, storyboard: { ...n.data.storyboard, ratio } } }
            : n,
        ),
      }));
    },

    setStoryboardGrid: (id: string, rows: number, cols: number) => {
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      rows = clamp(rows, 1, STORYBOARD_MAX);
      cols = clamp(cols, 1, STORYBOARD_MAX);
      get().pushHistory();
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return;
      const sb = sbNode.data.storyboard;

      const { cells: newCells, overflow } = reflow(sb, rows, cols);

      const overflowNodes: CanvasNode[] = overflow.map((o, i) => ({
        id: `image-overflow-${Date.now()}-${i}`,
        kind: "image" as const,
        x: sbNode.x + 400 + i * 260,
        y: sbNode.y,
        data: { src: o.src, name: o.name ?? "溢出图片" },
      }));

      set((s) => ({
        nodes: [
          ...s.nodes.map((n) =>
            n.id === id && n.kind === "storyboard"
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

    clearStoryboard: (id: string) => {
      get().pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) => {
          if (n.id !== id || n.kind !== "storyboard") return n;
          const sb = n.data.storyboard;
          const clearedCells = sb.cells.map((c) => ({
            ...c,
            src: undefined,
            sourceNodeId: undefined,
            name: undefined,
          }));
          return { ...n, data: { ...n.data, storyboard: { ...sb, cells: clearedCells } } };
        }),
        edges: (() => {
          const sbn = s.nodes.find((n) => n.id === id);
          const cells = sbn?.kind === "storyboard" ? sbn.data.storyboard.cells : [];
          const sourceIds = new Set(cells.map((c) => c.sourceNodeId).filter(Boolean) as string[]);
          return s.edges.filter((e) => !sourceIds.has(e.from) && !sourceIds.has(e.to));
        })(),
      }));
    },

    convertStoryboardToGroup: (id: string) => {
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return null;
      const sb = sbNode.data.storyboard;

      get().pushHistory();
      const ts = Date.now();
      const PAD = 24;
      const filled = sb.cells.filter((c) => c.src);
      const cols = sb.cols;
      const newImageNodes: ImageNode[] = filled.map((c, i) => ({
        id: c.sourceNodeId ?? `image-${ts}-${i}`,
        kind: "image" as const,
        x: sbNode.x + PAD + (i % cols) * 260,
        y: sbNode.y + PAD + Math.floor(i / cols) * 180,
        data: { src: c.src, name: c.name ?? "图片" },
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
          // `src` omitted — renderer reads live from member nodes.
          members: newImageNodes.map((n) => ({
            id: n.id,
            kind: n.kind as NodeKind,
            name: n.data.name,
          })),
          groupColor: "#56C7CF",
          groupLayout: "grid" as const,
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

    ungroupStoryboard: (id: string) => {
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return;
      const sb = sbNode.data.storyboard;

      get().pushHistory();
      const ts = Date.now();
      const filled = sb.cells.filter((c) => c.src);
      const newImageNodes: ImageNode[] = filled.map((c, i) => ({
        id: c.sourceNodeId ?? `image-${ts}-${i}`,
        kind: "image" as const,
        x: sbNode.x + (i % sb.cols) * 260,
        y: sbNode.y + Math.floor(i / sb.cols) * 180,
        data: { src: c.src, name: c.name ?? "图片" },
      }));

      set((s) => ({
        nodes: [...s.nodes.filter((n) => n.id !== id), ...newImageNodes],
        edges: s.edges.filter((e) => e.from !== id && e.to !== id),
        selectedId: null,
      }));
    },

    reorderStoryboardCells: (id: string, fromIdx: number, toIdx: number) => {
      get().pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) => {
          if (n.id !== id || n.kind !== "storyboard") return n;
          const sb = n.data.storyboard;
          const cells = [...sb.cells];
          const [moved] = cells.splice(fromIdx, 1);
          cells.splice(toIdx, 0, moved);
          const updated = cells.map((c, i) => ({
            ...c,
            row: Math.floor(i / sb.cols) + 1,
            col: (i % sb.cols) + 1,
          }));
          return { ...n, data: { ...n.data, storyboard: { ...sb, cells: updated } } };
        }),
      }));
    },

    duplicateStoryboard: (id: string) => {
      const { nodes, edges } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return null;

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

    stitchStoryboard: async (id: string, resolution: "2K" | "4K") => {
      const { nodes } = get();
      const sbNode = nodes.find((n) => n.id === id);
      if (!sbNode || sbNode.kind !== "storyboard") return null;
      const sb = sbNode.data.storyboard;

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
  };
}
