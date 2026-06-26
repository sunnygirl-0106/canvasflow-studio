import { Handle, Position } from "@xyflow/react";
import { DemoImg } from "@/components/DemoImg";
import { memo, useMemo } from "react";
import { FolderOpen, Loader2, Play } from "lucide-react";
import { useCanvas, type CanvasNode, type GroupNodeData, type NodeKind } from "@/store/canvasStore";

// Per refactor 改动 4: the group never stores a snapshot src. The renderer
// resolves each member id to a live source on every render so regenerating
// the source image immediately propagates to the group thumbnail.
//
// Resolution order for a member id:
//   1. A canvas node with that id → use its current data.src.
//   2. A script node whose `script.assets[]` contains that id → use the
//      asset's current image. (Asset groups materialized by closeScript
//      reference asset ids, not real canvas nodes.)
//   3. Fall back to the persisted `members[]` entry for name only — never
//      render its src (would be a stale snapshot from before the refactor).
interface ResolvedMember {
  id: string;
  kind: NodeKind;
  name?: string;
  src?: string;
}

function resolveMember(
  id: string,
  nodes: CanvasNode[],
  membersFallback: GroupNodeData["members"],
): ResolvedMember {
  const node = nodes.find((n) => n.id === id);
  if (node) {
    const src = "src" in node.data ? (node.data as { src?: string }).src : undefined;
    return {
      id,
      kind: node.kind,
      name: (node.data as { name?: string }).name,
      src,
    };
  }
  for (const n of nodes) {
    if (n.kind !== "script") continue;
    const asset = n.data.script.assets?.find((a) => a.id === id);
    if (asset) {
      return { id, kind: "image", name: asset.name, src: asset.image };
    }
  }
  const fallback = membersFallback.find((m) => m.id === id);
  return { id, kind: fallback?.kind ?? "image", name: fallback?.name };
}

export const GroupNode = memo(GroupNodeImpl);

function GroupNodeImpl({ data }: { id: string; data: GroupNodeData }) {
  const nodes = useCanvas((s) => s.nodes);

  const color = data.groupColor ?? "#56C7CF";
  const w = data.groupWidth ?? 300;
  const h = data.groupHeight ?? 200;
  const executing = data.executing ?? false;

  const members = useMemo<ResolvedMember[]>(
    () => data.memberIds.map((id) => resolveMember(id, nodes, data.members ?? [])),
    [data.memberIds, data.members, nodes],
  );

  // `frame` groups (e.g. asset groups) wrap REAL member nodes that render
  // themselves on the canvas, so the group is only a labelled dashed container
  // — never a thumbnail card, which would double-render the same images.
  const frameOnly = data.frame === true;
  const isVideoGroup =
    !frameOnly && members.length > 0 && members.every((m) => m.kind === "generateVideo");
  const isImageGroup =
    !frameOnly &&
    !isVideoGroup &&
    members.length > 0 &&
    members.every((m) => m.kind === "image" && !!m.src);

  return (
    <div
      className="rounded-2xl relative"
      style={{
        width: isVideoGroup || isImageGroup ? undefined : w,
        height: isVideoGroup || isImageGroup ? undefined : h,
        background: isVideoGroup || isImageGroup ? "#FFFFFF" : `${color}10`,
        border:
          isVideoGroup || isImageGroup
            ? `2px solid ${isImageGroup ? color : "#E2E8F0"}`
            : `2px dashed ${color}`,
        boxShadow: isVideoGroup || isImageGroup ? "0 18px 36px rgba(152,162,179,0.10)" : undefined,
        pointerEvents: "all",
      }}
    >
      {/* Label badge */}
      {!isVideoGroup && !isImageGroup && (
        <div
          className="absolute flex items-center gap-1.5 rounded-full"
          style={{
            top: -14,
            left: 12,
            height: 28,
            padding: "0 10px",
            background: color,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <FolderOpen className="w-3.5 h-3.5 text-white" strokeWidth={2} />
          <span
            className="text-[12px] font-semibold text-white"
            style={{ fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            {data.name ?? "普通组"}
          </span>
          <span
            className="text-[11px] text-white/70 font-medium"
            style={{ fontFamily: "Inter, system-ui" }}
          >
            {members.length}
          </span>
        </div>
      )}

      {/* Video group: header + card grid */}
      {isVideoGroup && (
        <>
          <div style={{ padding: "14px 16px 10px" }}>
            <span
              className="text-[14px] font-semibold"
              style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
            >
              {data.name ?? "视频组"}
            </span>
          </div>
          <div className="flex flex-wrap gap-4" style={{ padding: "0 16px 16px" }}>
            {members.map((m) => (
              <div
                key={m.id}
                className="rounded-xl overflow-hidden"
                style={{
                  width: 240,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div className="flex items-center gap-1.5" style={{ padding: "8px 10px" }}>
                  <Play className="w-3 h-3" style={{ color: "#334155" }} />
                  <span className="text-[12px] font-medium" style={{ color: "#334155" }}>
                    {m.name}
                  </span>
                </div>
                {m.src ? (
                  <DemoImg
                    src={m.src}
                    alt=""
                    className="w-full"
                    style={{ height: 135, objectFit: "cover" }}
                    draggable={false}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center"
                    style={{ height: 135, background: "#F1F5F9" }}
                  >
                    <Play className="w-8 h-8" style={{ color: "#CBD5E1" }} strokeWidth={1.5} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Image/asset group: header + thumbnail grid */}
      {isImageGroup && (
        <>
          <div style={{ padding: "14px 16px 10px" }}>
            <span
              className="text-[14px] font-semibold"
              style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
            >
              {data.name ?? "资产组"}
            </span>
          </div>
          <div className="flex flex-wrap gap-3" style={{ padding: "0 16px 16px" }}>
            {members.map((m) => (
              <div
                key={m.id}
                className="rounded-xl overflow-hidden"
                style={{
                  width: 120,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                }}
              >
                {m.src && (
                  <DemoImg
                    src={m.src}
                    alt=""
                    className="w-full"
                    style={{ height: 120, objectFit: "cover" }}
                    draggable={false}
                  />
                )}
                <div style={{ padding: "6px 8px" }}>
                  <span
                    className="text-[11px] font-medium truncate block"
                    style={{ color: "#334155" }}
                  >
                    {m.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Executing overlay */}
      {executing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20">
          <div className="flex items-center gap-2 rounded-full px-4 py-2 bg-black/60">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
            <span
              className="text-[12px] text-white font-medium"
              style={{ fontFamily: "PingFang SC, Inter, system-ui" }}
            >
              执行中...
            </span>
          </div>
        </div>
      )}

      {/* Asset groups set connectable:false — they're a visual frame only; the
          real edges run from each member image to the script, not the group. */}
      {data.connectable !== false && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="group-in"
            style={{ background: isVideoGroup ? "#14B8A6" : color }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="group-out"
            style={{ background: isVideoGroup ? "#14B8A6" : color }}
          />
        </>
      )}
    </div>
  );
}
