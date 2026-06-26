import { Handle, Position } from "@xyflow/react";
import { DemoImg } from "@/components/DemoImg";
import { memo } from "react";
import { Scissors, Play } from "lucide-react";
import { useCanvas, type CompositionNodeData } from "@/store/canvasStore";
import { NODE_COLORS as COLORS } from "./nodeTheme";

export const CompositionNode = memo(CompositionNodeImpl);

function CompositionNodeImpl({ id, data }: { id: string; data: CompositionNodeData }) {
  const openComposition = useCanvas((s) => s.openComposition);
  // Step 2: summarize from the main video track (V1); richer track summary comes later.
  const shots = (data.tracks ?? []).find((t) => t.kind === "video")?.clips ?? [];
  const thumbnail = shots[0]?.thumbnail;

  return (
    <div
      className="fade-in group relative rounded-2xl overflow-visible"
      style={{
        width: 320,
        background: "#FFFFFF",
        border: `2px solid ${COLORS.border}`,
        boxShadow: "0 18px 36px rgba(152,162,179,0.10)",
      }}
    >
      {/* Input handle — left */}
      <Handle
        type="target"
        position={Position.Left}
        id="comp-in"
        style={{ background: COLORS.handle }}
      />

      {/* Header */}
      <div className="flex items-center gap-2" style={{ padding: "14px 16px 10px" }}>
        <Scissors
          className="w-[16px] h-[16px] flex-shrink-0"
          style={{ color: COLORS.headerText }}
          strokeWidth={1.8}
        />
        <span
          className="text-[14px] font-semibold truncate"
          style={{ color: COLORS.headerText, fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {data.name ?? "视频合成"}
        </span>
        <span
          className="ml-auto text-[11px] font-medium"
          style={{ color: COLORS.subtitleText, fontFamily: "Inter, system-ui" }}
        >
          {shots.length} 段
        </span>
      </div>

      {/* Thumbnail / placeholder */}
      <div style={{ padding: "0 16px" }}>
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center"
          style={{
            height: 120,
            background: thumbnail ? undefined : "#F1F5F9",
          }}
        >
          {thumbnail ? (
            <DemoImg src={thumbnail} alt="" className="w-full h-full object-cover" draggable={false} />
          ) : (
            <Play className="w-8 h-8" style={{ color: "#CBD5E1" }} />
          )}
        </div>
      </div>

      {/* Open button */}
      <div style={{ padding: "12px 16px 14px" }}>
        <button
          onClick={() => openComposition(id)}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            height: 36,
            background: COLORS.btnBg,
            fontFamily: "PingFang SC, Inter, system-ui",
          }}
        >
          <Scissors className="w-3.5 h-3.5" strokeWidth={2.2} />
          打开视频合成
        </button>
      </div>

      {/* Output handle — right */}
      <Handle
        type="source"
        position={Position.Right}
        id="source-process"
        style={{ background: COLORS.handle }}
      />
    </div>
  );
}
