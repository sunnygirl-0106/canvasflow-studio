import { placeholderImage } from "@canvasflow/shared";
import { autoGrid } from "@/lib/storyboard";
import { gridCell } from "@/lib/gridLayout";
import { buildContainer, remapEdges, CARD_W, CARD_H, CARD_GAP, CARD_PAD } from "@/lib/container";
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

      // A 打组 is a FRAME container: member nodes stay REAL and full-size, we
      // only tidy their layout into a neat grid (messy → 整齐). Never a thumbnail
      // card — that would shrink the images. Keep the visual order (row-major by
      // current position) so tidying feels predictable.
      const ordered = [...picked].sort((a, b) => a.y - b.y || a.x - b.x);
      const minX = Math.min(...picked.map((n) => n.x));
      const minY = Math.min(...picked.map((n) => n.y));

      // `src` intentionally omitted — renderer reads live from member nodes.
      const { containerNode: groupNode, memberPositions: posById } = buildContainer({
        mode: "cardGroup",
        containerId: groupId,
        name: `普通组 ${nodes.filter((n) => n.kind === "nodeGroup").length + 1}`,
        memberIds: ordered.map((n) => n.id),
        // Container origin is members' top-left minus the frame padding.
        origin: { x: minX - CARD_PAD, y: minY - CARD_PAD },
        nodes,
        groupColor: "#56C7CF",
      });

      set((s) => ({
        // Container prepended → painted behind its (repositioned) real members.
        nodes: [
          groupNode,
          ...s.nodes.map((n) => {
            const p = posById.get(n.id);
            return p ? { ...n, x: p.x, y: p.y } : n;
          }),
        ],
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
      const cols = Math.max(1, Math.ceil(Math.sqrt(virtualMembers.length)));
      const baseX = groupNode.x + CARD_PAD;
      const baseY = groupNode.y + CARD_PAD;
      const ts = Date.now();

      const newNodes: CanvasNode[] = virtualMembers.map((m, i) => {
        const { x, y } = gridCell(i, cols, {
          baseX,
          baseY,
          cellW: CARD_W,
          cellH: CARD_H,
          gapX: CARD_GAP,
          gapY: CARD_GAP,
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
      const baseX = groupNode.x + CARD_PAD;
      const baseY = groupNode.y + CARD_PAD;

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
            cellW: CARD_W,
            cellH: CARD_H,
            gapX: CARD_GAP,
            gapY: CARD_GAP,
          }),
        );
      });

      const frameW = cols * CARD_W + (cols - 1) * CARD_GAP + CARD_PAD * 2;
      const frameH = rows * CARD_H + (rows - 1) * CARD_GAP + CARD_PAD * 2;

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
      // Members are already real nodes — keep them and snap into storyboard
      // slots; only the container changes (group → storyboard). No recreation.
      const orderedIds = groupNode.data.memberIds.filter((mid) => nodes.some((n) => n.id === mid));
      const ts = Date.now();
      const sbId = `storyboard-${ts}`;
      const { rows, cols } = autoGrid(orderedIds.length);

      const { containerNode: sbNode, memberPositions: posById } = buildContainer({
        mode: "storyboard",
        containerId: sbId,
        name: groupNode.data.name ?? "分镜组",
        memberIds: orderedIds,
        origin: { x: groupNode.x, y: groupNode.y },
        nodes,
        ratio: DEFAULT_RATIO,
        rows,
        cols,
      });

      set((s) => ({
        // Container prepended → behind its (kept, repositioned) members.
        nodes: [
          sbNode,
          ...s.nodes
            .filter((n) => n.id !== id)
            .map((n) => {
              const p = posById.get(n.id);
              return p ? { ...n, x: p.x, y: p.y } : n;
            }),
        ],
        edges: remapEdges(s.edges, new Map([[id, sbId]])),
        selectedId: sbId,
      }));
      return sbId;
    },

    executeGroup: (id: string) => {
      const { nodes } = get();
      const group = nodes.find((n) => n.id === id);
      if (!group || group.kind !== "nodeGroup") return;

      // Cancel any in-flight run for this group before (re)starting.
      const prev = groupExecTimers.get(id);
      if (prev) clearInterval(prev);

      // Real, generatable member nodes (image/video) on the canvas. Frame
      // groups (asset/storyboard/video) wrap real nodes; legacy card groups
      // with virtual members resolve to none → fall back to a spinner-only run.
      const genKinds: NodeKind[] = ["generateImage", "generateVideo"];
      const memberIds = new Set(
        group.data.memberIds.filter((mid) =>
          nodes.some((n) => n.id === mid && genKinds.includes(n.kind)),
        ),
      );

      // Mark the group executing and each member as generating.
      set((s) => ({
        nodes: s.nodes.map((n) => {
          if (n.id === id && n.kind === "nodeGroup")
            return { ...n, data: { ...n.data, executing: true } };
          if (memberIds.has(n.id))
            return { ...n, data: { ...n.data, status: "generating", progress: 0 } } as CanvasNode;
          return n;
        }),
      }));

      const finishGroup = () => {
        groupExecTimers.delete(id);
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id && n.kind === "nodeGroup"
              ? { ...n, data: { ...n.data, executing: false } }
              : n,
          ),
        }));
      };

      // No real members → keep the old 2s spinner-only behavior.
      if (memberIds.size === 0) {
        const t = setTimeout(finishGroup, 2000);
        groupExecTimers.set(id, t);
        return;
      }

      // Same mock-generation flow as the image/video nodes (see useMockGenerate):
      // animate progress 0→1, then drop in a placeholder cover and mark ready.
      const TOTAL_MS = 2400;
      const seedFor = new Map<string, string>(
        [...memberIds].map((mid) => [mid, `${mid}-${Math.random().toString(36).slice(2, 8)}`]),
      );
      const start = performance.now();
      const timer = setInterval(() => {
        const p = Math.min(1, (performance.now() - start) / TOTAL_MS);
        if (p >= 1) {
          clearInterval(timer);
          set((s) => ({
            nodes: s.nodes.map((n) => {
              if (n.id === id && n.kind === "nodeGroup")
                return { ...n, data: { ...n.data, executing: false } };
              if (!memberIds.has(n.id)) return n;
              const seed = seedFor.get(n.id);
              const src =
                n.kind === "generateVideo"
                  ? placeholderImage(String(seed), 640, 360)
                  : placeholderImage(String(seed), 640, 400);
              return { ...n, data: { ...n.data, status: "ready", progress: 1, src } } as CanvasNode;
            }),
          }));
          groupExecTimers.delete(id);
          return;
        }
        set((s) => ({
          nodes: s.nodes.map((n) =>
            memberIds.has(n.id) ? ({ ...n, data: { ...n.data, progress: p } } as CanvasNode) : n,
          ),
        }));
      }, 120);
      groupExecTimers.set(id, timer);
    },
  };
}
