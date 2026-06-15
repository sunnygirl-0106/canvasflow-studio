import { autoGrid, fillCells } from "@/lib/storyboard";
import {
  type CanvasNode,
  type NodeKind,
  type SetState,
  type GetState,
  DEFAULT_RATIO,
} from "./types";

export function createGroupSlice(set: SetState, get: GetState) {
  return {
    createGroup: (nodeIds: string[]) => {
      const { nodes } = get();
      const mediaKinds: NodeKind[] = ["image", "generateImage", "generateVideo"];
      const picked = nodes.filter((n) => nodeIds.includes(n.id) && mediaKinds.includes(n.kind));
      if (picked.length < 2) return null;

      get().pushHistory();
      const ts = Date.now();
      const groupId = `group-${ts}`;

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
          members: picked.map((n) => ({
            id: n.id,
            kind: n.kind,
            src: n.data.src,
            name: n.data.name,
          })),
          groupColor: "#56C7CF",
          groupLayout: "grid",
          groupWidth: maxX - minX + PAD * 2,
          groupHeight: maxY - minY + PAD * 2,
        },
      };

      set((s) => ({
        nodes: [groupNode, ...s.nodes],
        selectedId: groupId,
        panelOpen: false,
      }));
      return groupId;
    },

    ungroupGroup: (id: string) => {
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

    setGroupColor: (id: string, color: string) => {
      get().pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, groupColor: color } } : n,
        ),
      }));
    },

    setGroupLayout: (id: string, layout: "grid" | "horizontal" | "vertical") => {
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
        layout === "horizontal"
          ? memberIds.length
          : layout === "vertical"
            ? 1
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
            return {
              ...n,
              data: { ...n.data, groupLayout: layout, groupWidth: frameW, groupHeight: frameH },
            };
          }
          const pos = posMap.get(n.id);
          if (pos) return { ...n, x: pos.x, y: pos.y };
          return n;
        }),
      }));
    },

    convertGroupToStoryboard: (id: string) => {
      const { nodes } = get();
      const groupNode = nodes.find((n) => n.id === id);
      if (!groupNode || groupNode.kind !== "nodeGroup") return null;

      get().pushHistory();
      const memberIds = new Set((groupNode.data.memberIds ?? []) as string[]);
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

      set((s) => ({
        nodes: [...s.nodes.filter((n) => n.id !== id && !memberIds.has(n.id)), sbNode],
        edges: s.edges.filter(
          (e) => e.from !== id && e.to !== id && !memberIds.has(e.from) && !memberIds.has(e.to),
        ),
        selectedId: sbId,
      }));
      return sbId;
    },

    executeGroup: (id: string) => {
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
  };
}
