import { Handle, Position } from "@xyflow/react";
import { AudioLines } from "lucide-react";
import type { AudioNodeData } from "@/store/canvasStore";

// Faux waveform bars (demo — no real audio decoding).
const BARS = [6, 12, 20, 14, 8, 16, 24, 10, 18, 9, 14, 22, 11, 7, 15, 20, 13, 8, 17, 12];

export function AudioNode({ data }: { data: AudioNodeData }) {
  const dur = data.duration ?? 0;
  return (
    <div className="group relative w-[220px] rounded-xl bg-card border border-border node-shadow overflow-visible fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 32, height: 32, background: "rgba(20,184,166,0.12)" }}
        >
          <AudioLines className="w-4 h-4" style={{ color: "#14B8A6" }} strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate text-foreground">
            {data.name ?? "音频"}
          </div>
          <div className="text-[11px] text-muted-foreground">{dur.toFixed(0)}s</div>
        </div>
      </div>

      {/* Faux waveform */}
      <div className="flex items-center gap-[3px] px-3 pb-3" style={{ height: 44 }}>
        {BARS.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{ height: h + 6, background: "rgba(20,184,166,0.45)" }}
          />
        ))}
      </div>

      {/* Output handle — connect into a composition node */}
      <Handle
        type="source"
        position={Position.Right}
        id="source-process"
        style={{ background: "#14B8A6" }}
      />
    </div>
  );
}
