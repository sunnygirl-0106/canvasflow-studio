import { X } from "lucide-react";
import { useCanvas, type Shot } from "@/store/canvasStore";

const PRESETS = [0.5, 1, 2, 3, 4];

interface Props {
  compId: string;
  clipId: string;
  onClose: () => void;
}

export function SpeedPanel({ compId, clipId, onClose }: Props) {
  const nodes = useCanvas((s) => s.nodes);
  const setClipSpeed = useCanvas((s) => s.setClipSpeed);

  const comp = nodes.find((n) => n.id === compId);
  const shot = comp?.data.shots?.find((s) => s.id === clipId);
  if (!shot) return null;

  const speed = shot.speed;
  const duration = shot.duration;

  const handleSpeedChange = (v: number) => {
    const clamped = Math.max(0.1, Math.min(10, v));
    setClipSpeed(compId, clipId, clamped);
  };

  const handleDurationChange = (newDur: number) => {
    if (newDur <= 0 || shot.baseDuration <= 0) return;
    const newSpeed = shot.baseDuration / newDur;
    handleSpeedChange(newSpeed);
  };

  return (
    <div
      className="absolute bottom-full mb-2 left-0 rounded-xl fade-in"
      style={{
        width: 280,
        padding: 16,
        background: "#1E293B",
        border: "1px solid #334155",
        boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold" style={{ color: "#F1F5F9", fontFamily: "PingFang SC, Inter, system-ui" }}>
          变速
        </span>
        <button onClick={onClose} className="flex items-center justify-center rounded hover:bg-white/10" style={{ width: 24, height: 24 }}>
          <X className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
        </button>
      </div>

      {/* Speed presets */}
      <div className="flex gap-1.5 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => handleSpeedChange(p)}
            className="flex-1 rounded-md text-[12px] font-semibold transition-colors"
            style={{
              height: 30,
              background: Math.abs(speed - p) < 0.01 ? "#14B8A6" : "#334155",
              color: Math.abs(speed - p) < 0.01 ? "#FFFFFF" : "#94A3B8",
              fontFamily: "Inter, system-ui",
            }}
          >
            {p}x
          </button>
        ))}
      </div>

      {/* Speed slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px]" style={{ color: "#64748B" }}>倍速</span>
          <span className="text-[12px] font-mono font-semibold" style={{ color: "#F1F5F9" }}>{speed.toFixed(2)}x</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.05}
          value={speed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          className="w-full accent-teal-500"
          style={{ height: 4 }}
        />
      </div>

      {/* Duration slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px]" style={{ color: "#64748B" }}>时长</span>
          <span className="text-[12px] font-mono font-semibold" style={{ color: "#F1F5F9" }}>{duration.toFixed(1)}s</span>
        </div>
        <input
          type="range"
          min={shot.baseDuration / 4}
          max={shot.baseDuration / 0.5}
          step={0.1}
          value={duration}
          onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
          className="w-full accent-teal-500"
          style={{ height: 4 }}
        />
      </div>
    </div>
  );
}
