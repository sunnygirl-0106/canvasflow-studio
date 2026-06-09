import { Handle, Position } from "@xyflow/react";
import { FolderOpen, Loader2 } from "lucide-react";
import type { CanvasNode } from "@/store/canvasStore";

export function GroupNode({ id, data }: { id: string; data: CanvasNode["data"] }) {
  const color = data.groupColor ?? "#56C7CF";
  const w = data.groupWidth ?? 300;
  const h = data.groupHeight ?? 200;
  const members = data.members ?? [];
  const executing = data.executing ?? false;

  return (
    <div
      className="rounded-2xl relative"
      style={{
        width: w,
        height: h,
        background: `${color}10`,
        border: `2px dashed ${color}`,
        pointerEvents: "all",
      }}
    >
      {/* Label badge */}
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

      {/* Executing overlay */}
      {executing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20">
          <div className="flex items-center gap-2 rounded-full px-4 py-2 bg-black/60">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
            <span className="text-[12px] text-white font-medium" style={{ fontFamily: "PingFang SC, Inter, system-ui" }}>
              执行中...
            </span>
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="group-in" style={{ background: color }} />
      <Handle type="source" position={Position.Right} id="group-out" style={{ background: color }} />
    </div>
  );
}
