import { Handle, Position } from "@xyflow/react";
import { FolderOpen, Loader2, Play } from "lucide-react";
import type { GroupNodeData } from "@/store/canvasStore";

export function GroupNode({ data }: { id: string; data: GroupNodeData }) {
  const color = data.groupColor ?? "#56C7CF";
  const w = data.groupWidth ?? 300;
  const h = data.groupHeight ?? 200;
  const members = data.members ?? [];
  const executing = data.executing ?? false;
  const isVideoGroup = members.length > 0 && members.every((m) => m.kind === "generateVideo");
  const isImageGroup =
    !isVideoGroup && members.length > 0 && members.every((m) => m.kind === "image" && m.src);

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
                  <img
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
                  <img
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
    </div>
  );
}
