import { Play } from "lucide-react";
import type { Shot } from "@/store/canvasStore";

const CLIP_STYLES: Record<Shot["color"], { border: string }> = {
  cyan: { border: "#67E8F9" },
  purple: { border: "#A78BFA" },
  yellow: { border: "#FDBA74" },
  rose: { border: "#FDA4AF" },
  emerald: { border: "#6EE7B7" },
  gray: { border: "#94A3B8" },
};

interface Props {
  shots: Shot[];
  currentTime: number;
  playing: boolean;
  onTogglePlay: () => void;
  onFullscreen?: () => void;
}

export function PreviewStage({ shots, currentTime, playing, onTogglePlay, onFullscreen }: Props) {
  // Find which shot is at currentTime
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

  const style = activeShot ? (CLIP_STYLES[activeShot.color] ?? CLIP_STYLES.gray) : CLIP_STYLES.gray;

  return (
    <div
      className="relative flex-1 flex items-center justify-center overflow-hidden"
      style={{ background: "#000", minHeight: 300 }}
    >
      {activeShot?.thumbnail ? (
        <img
          src={activeShot.thumbnail}
          alt=""
          className="w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="text-[14px] font-medium" style={{ color: "#475569" }}>
          暂无画面
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Center play/pause */}
      {!playing && (
        <button
          onClick={onTogglePlay}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <Play className="w-8 h-8 text-white ml-1" />
        </button>
      )}

      {/* Active shot label */}
      {activeShot && (
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: style.border }} />
          <span className="text-[12px] font-medium" style={{ color: "#E2E8F0", fontFamily: "Inter, system-ui" }}>
            {activeShot.name}
          </span>
        </div>
      )}

    </div>
  );
}
