import { Download, X, ChevronDown } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";

interface Props {
  compName: string;
  shotCount: number;
  totalDuration: number;
}

function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function EditorTopBar({ compName, shotCount, totalDuration }: Props) {
  const closeComposition = useCanvas((s) => s.closeComposition);
  const setExport = useCanvas((s) => s.setExport);

  return (
    <div
      className="flex items-center justify-between flex-shrink-0"
      style={{
        height: 56,
        padding: "0 20px",
        background: "#1E293B",
        borderBottom: "1px solid #334155",
      }}
    >
      {/* Left: title + info */}
      <div className="flex items-center gap-3">
        <span
          className="text-[15px] font-semibold"
          style={{ color: "#F1F5F9", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {compName}
        </span>
        <span
          className="text-[12px] font-medium"
          style={{ color: "#64748B", fontFamily: "Inter, system-ui" }}
        >
          {shotCount} 段 · {fmtSec(totalDuration)}
        </span>
      </div>

      {/* Right: export + close */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExport("fcpxml")}
          className="flex items-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors hover:bg-white/10"
          style={{
            height: 34,
            padding: "0 12px",
            color: "#F1F5F9",
            background: "#334155",
          }}
        >
          <Download className="w-3.5 h-3.5" />
          导出
          <ChevronDown className="w-3 h-3 ml-0.5" style={{ color: "#64748B" }} />
        </button>
        <button
          onClick={closeComposition}
          className="flex items-center justify-center rounded-lg hover:bg-white/10"
          style={{ width: 34, height: 34 }}
        >
          <X className="w-4 h-4" style={{ color: "#94A3B8" }} />
        </button>
      </div>
    </div>
  );
}
