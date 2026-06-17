import { Play, Pause, X } from "lucide-react";
import { clipAt, type Track } from "@/store/canvasStore";
import { CLIP_STYLES } from "@/lib/clipStyles";
import { fmtSec } from "@/lib/time";
import { useEscape } from "@/lib/useDismiss";

interface Props {
  tracks: Track[];
  currentTime: number;
  totalDuration: number;
  playing: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}

export function FullscreenPlayer({
  tracks,
  currentTime,
  totalDuration,
  playing,
  onTogglePlay,
  onClose,
}: Props) {
  useEscape(onClose);

  const videoTracks = tracks
    .filter((t) => t.kind === "video")
    .sort((a, b) => a.name.localeCompare(b.name));
  const v1 = videoTracks.find((t) => t.name === "V1") ?? videoTracks[0];
  const v2 = videoTracks.find((t) => t !== v1);

  const base = v1 ? clipAt(v1, currentTime) : null;
  const pip = v2 ? clipAt(v2, currentTime) : null;
  const strips = v1?.clips ?? [];

  const progress = totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={onTogglePlay}>
      {/* Video area */}
      <div className="flex-1 min-h-0 flex items-center justify-center relative overflow-hidden">
        {base?.thumbnail ? (
          <img
            src={base.thumbnail}
            alt=""
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="text-[16px]" style={{ color: "#475569" }}>
            暂无画面
          </div>
        )}

        {/* V2 picture-in-picture window (decision #7) */}
        {pip?.thumbnail && (
          <div
            className="absolute overflow-hidden rounded-lg"
            style={{
              top: "6%",
              right: "5%",
              width: "26%",
              aspectRatio: "16 / 9",
              border: "2px solid rgba(255,255,255,0.85)",
              boxShadow: "0 8px 28px rgba(0,0,0,0.6)",
            }}
          >
            <img
              src={pip.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}

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
        <button
          onClick={onTogglePlay}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36 }}
        >
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

        {/* V1 clip strips */}
        <div className="flex gap-0.5 mx-2">
          {strips.map((clip) => {
            const widthPct = totalDuration > 0 ? (clip.duration / totalDuration) * 100 : 0;
            const isActive = clip.id === base?.id;
            return (
              <div
                key={clip.id}
                className="rounded-sm"
                style={{
                  width: Math.max(4, widthPct * 1.5),
                  height: 4,
                  background: CLIP_STYLES[clip.color]?.border ?? "#94A3B8",
                  opacity: isActive ? 1 : 0.4,
                }}
              />
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg hover:bg-white/10"
          style={{ width: 36, height: 36 }}
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
