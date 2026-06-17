import { autoGrid, fillCells } from "@/lib/storyboard";
import { gridCell } from "@/lib/gridLayout";
import {
  type CanvasNode,
  type NodeKind,
  type SetState,
  type GetState,
  DEFAULT_RATIO,
} from "./types";

// Transient "executing" spinner timers keyed by group id — stored so a repeated
// execute (or a removed group) cancels the prior one instead of leaking it.
const groupExecTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function createGroupSlice(set: SetState, get: GetState) {
  return {
    createGroup: (nodeIds: string[]) => {
      const { nodes } = get();
      const mediaKinds: NodeKind[] = ["image", "generateImage", "generateVideo"];
      const picked = nodes.filter(
        (n): n is Extract<CanvasNode, { kind: "image" | "generateImage" | "generateVideo" }> =>
          nodeIds.includes(n.id) && mediaKinds.includes(n.kind),
      );
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
          // `src` intentionally omitted — renderer reads live from member nodes.
          members: picked.map((n) => ({
            id: n.id,
            kind: n.kind,
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

      // Members fall into two categories:
      //  1. Real canvas nodes (e.g. a 普通组 created from existing image nodes)
      //     — they already live on the canvas, so ungrouping just drops the
      //     frame and leaves them in place.
      //  2. Virtual members (asset groups materialized from a script node) —
      //     their ids point at `script.assets[]`, NOT at real nodes. If we only
      //     remove the group frame, nothing is left behind and the thumbnails
      //     vanish. So we materialize those into real `image` nodes here.
      const memberIds = groupNode.data.memberIds ?? [];
      const fallback = groupNode.data.members ?? [];

      const virtualMembers = memberIds
        .filter((mid) => !nodes.some((n) => n.id === mid))
        .map((mid) => {
          // Look the id up in any script node's assets to recover its live src.
          let src: string | undefined;
          let name: string | undefined;
          for (const n of nodes) {
            if (n.kind !== "script") continue;
            const asset = n.data.script.assets?.find((a) => a.id === mid);
            if (asset) {
              src = asset.image;
              name = asset.name;
              break;
            }
          }
          if (name === undefined) {
            name = fallback.find((m) => m.id === mid)?.name;
          }
          return { id: mid, src, name };
        });

      // Lay the newly-materialized image nodes out in a grid anchored at the
      // group's frame, matching the visual order they had inside the group.
      const NODE_W = 240;
      const NODE_H = 160;
      const GAP = 20;
      const PAD = 24;
      const cols = Math.max(1, Math.ceil(Math.sqrt(virtualMembers.length)));
      const baseX = groupNode.x + PAD;
      const baseY = groupNode.y + PAD;
      const ts = Date.now();

      const newNodes: CanvasNode[] = virtualMembers.map((m, i) => {
        const { x, y } = gridCell(i, cols, {
          baseX,
          baseY,
          cellW: NODE_W,
          cellH: NODE_H,
          gapX: GAP,
          gapY: GAP,
        });
        return {
          id: `img-${ts}-${i}`,
          kind: "image",
          x,
          y,
          data: {
            name: m.name ?? `资产 ${i + 1}`,
            src: m.src,
          },
        };
      });

      // For an asset group, ungrouping is a deliberate "break the link" gesture:
      // its real member image nodes stay on the canvas but become independent —
      // we strip their asset back-references and flag the script as detached so
      // the reconcile (materializeAssetGroups) won't auto-rebuild the group when
      // assets are regenerated.
      const sourceScriptId = groupNode.data.sourceScriptId;
      const memberIdSet = new Set(memberIds);

      set((s) => ({
        nodes: s.nodes
          .filter((n) => n.id !== id)
          .map((n) => {
            if (sourceScriptId && n.id === sourceScriptId && n.kind === "script") {
              return {
                ...n,
                data: { ...n.data, script: { ...n.data.script, assetGroupDetached: true } },
              };
            }
            if (
              sourceScriptId &&
              memberIdSet.has(n.id) &&
              n.kind === "image" &&
              n.data.assetScriptId === sourceScriptId
            ) {
              const data = { ...n.data };
              delete (data as { assetScriptId?: string }).assetScriptId;
              delete (data as { assetId?: string }).assetId;
              return { ...n, data };
            }
            return n;
          })
          .concat(newNodes),
        edges: s.edges.filter((e) => e.from !== id && e.to !== id),
        selectedId: null,
      }));
    },

    setGroupColor: (id: string, color: string) => {
      get().pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id && n.kind === "nodeGroup"
            ? { ...n, data: { ...n.data, groupColor: color } }
            : n,
        ),
      }));
    },

    setGroupLayout: (id: string, layout: "grid" | "horizontal" | "vertical") => {
      const { nodes } = get();
      const groupNode = nodes.find((n) => n.id === id);
      if (!groupNode || groupNode.kind !== "nodeGroup") return;

      get().pushHistory();
      const memberIds = groupNode.data.memberIds;
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
        posMap.set(
          mid,
          gridCell(i, cols, {
            baseX,
            baseY,
            cellW: NODE_W,
            cellH: NODE_H,
            gapX: GAP_X,
            gapY: GAP_Y,
          }),
        );
      });

      const frameW = cols * NODE_W + (cols - 1) * GAP_X + PAD * 2;
      const frameH = rows * NODE_H + (rows - 1) * GAP_Y + PAD * 2;

      set((s) => ({
        nodes: s.nodes.map((n) => {
          if (n.id === id && n.kind === "nodeGroup") {
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
      const memberIds = new Set(groupNode.data.memberIds);
      const liveMembers = nodes.filter((n) => memberIds.has(n.id));
      const ts = Date.now();
      const sbId = `storyboard-${ts}`;
      const { rows, cols } = autoGrid(liveMembers.length);
      const cells = fillCells(
        liveMembers.map((n) => ({
          src: ("src" in n.data ? (n.data as { src?: string }).src : undefined) ?? "",
          sourceNodeId: n.id,
          name: n.data.name,
        })),
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
      // Transient visual flag only (mock "running" spinner) — deliberately NOT
      // pushed to history, since it isn't a persistent canvas mutation.
      const prev = groupExecTimers.get(id);
      if (prev) clearTimeout(prev);
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id && n.kind === "nodeGroup"
            ? { ...n, data: { ...n.data, executing: true } }
            : n,
        ),
      }));
      const timer = setTimeout(() => {
        groupExecTimers.delete(id);
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id && n.kind === "nodeGroup"
              ? { ...n, data: { ...n.data, executing: false } }
              : n,
          ),
        }));
      }, 2000);
      groupExecTimers.set(id, timer);
    },
  };
}
