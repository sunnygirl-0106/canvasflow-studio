import { useEffect } from "react";
import { Play, Pause, X } from "lucide-react";
import type { Shot } from "@/store/canvasStore";

const CLIP_BORDERS: Record<Shot["color"], string> = {
  cyan: "#67E8F9",
  purple: "#A78BFA",
  yellow: "#FDBA74",
  rose: "#FDA4AF",
  emerald: "#6EE7B7",
  gray: "#94A3B8",
};

function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface Props {
  shots: Shot[];
  currentTime: number;
  totalDuration: number;
  playing: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}

export function FullscreenPlayer({ shots, currentTime, totalDuration, playing, onTogglePlay, onClose }: Props) {
  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Find active shot
  let elapsed = 0;
  let activeShot: Shot | null = null;
  for (const shot of shots) {
    if (currentTime < elapsed + shot.duration) {
      activeShot = shot;
      break;
    }
    elapsed += shot.duration;
  }
  if (!activeShot && shots.length > 0) activeShot = shots[shots.length - 1];

  const progress = totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onClick={onTogglePlay}
    >
      {/* Video area */}
      <div className="flex-1 flex items-center justify-center relative">
        {activeShot?.thumbnail ? (
          <img
            src={activeShot.thumbnail}
            alt=""
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="text-[16px]" style={{ color: "#475569" }}>暂无画面</div>
        )}

        {/* Center play button when paused */}
        {!playing && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-10 h-10 text-white ml-1" />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className="flex items-center gap-3 flex-shrink-0"
        style={{ height: 56, padding: "0 20px", background: "rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onTogglePlay} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
          {playing ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white" />
          )}
        </button>

        <span className="text-[12px] font-mono" style={{ color: "#94A3B8", minWidth: 42 }}>
          {fmtSec(currentTime)}
        </span>

        {/* Progress bar */}
        <div className="flex-1 h-1.5 rounded-full cursor-pointer" style={{ background: "#334155" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg, #22D3EE, #14B8A6)",
              transition: playing ? "width 0.1s linear" : "none",
            }}
          />
        </div>

        <span className="text-[12px] font-mono" style={{ color: "#94A3B8", minWidth: 42 }}>
          {fmtSec(totalDuration)}
        </span>

        {/* Shot strips */}
        <div className="flex gap-0.5 mx-2">
          {shots.map((shot) => {
            const widthPct = totalDuration > 0 ? (shot.duration / totalDuration) * 100 : 0;
            const isActive = shot.id === activeShot?.id;
            return (
              <div
                key={shot.id}
                className="rounded-sm"
                style={{
                  width: Math.max(4, widthPct * 1.5),
                  height: 4,
                  background: CLIP_BORDERS[shot.color] ?? "#94A3B8",
                  opacity: isActive ? 1 : 0.4,
                }}
              />
            );
          })}
        </div>

        <button onClick={onClose} className="flex items-center justify-center rounded-lg hover:bg-white/10" style={{ width: 36, height: 36 }}>
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
