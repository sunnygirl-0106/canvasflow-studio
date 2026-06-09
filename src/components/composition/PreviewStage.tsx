import { Play } from "lucide-react";
import { clipAt, type Track } from "@/store/canvasStore";
import { CLIP_STYLES } from "@/lib/clipStyles";

interface Props {
  tracks: Track[];
  currentTime: number;
  playing: boolean;
  onTogglePlay: () => void;
  onFullscreen?: () => void;
}

export function PreviewStage({ tracks, currentTime, playing, onTogglePlay }: Props) {
  const videoTracks = tracks
    .filter((t) => t.kind === "video")
    .sort((a, b) => a.name.localeCompare(b.name));
  const v1 = videoTracks.find((t) => t.name === "V1") ?? videoTracks[0];
  const v2 = videoTracks.find((t) => t !== v1);

  const base = v1 ? clipAt(v1, currentTime) : null; // V1 underlay
  const pip = v2 ? clipAt(v2, currentTime) : null; // V2 picture-in-picture

  const style = base ? (CLIP_STYLES[base.color] ?? CLIP_STYLES.gray) : CLIP_STYLES.gray;

  return (
    <div
      className="relative flex-1 flex items-center justify-center overflow-hidden"
      style={{ background: "#000", minHeight: 300 }}
    >
      {base?.thumbnail ? (
        <img
          src={base.thumbnail}
          alt=""
          className="w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="text-[14px] font-medium" style={{ color: "#475569" }}>
          暂无画面
        </div>
      )}

      {/* V2 picture-in-picture window (decision #7) */}
      {pip?.thumbnail && (
        <div
          className="absolute overflow-hidden rounded-lg"
          style={{
            top: "5%",
            right: "4%",
            width: "28%",
            aspectRatio: "16 / 9",
            border: "2px solid rgba(255,255,255,0.85)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
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

      {/* Active clip label */}
      {base && (
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: style.border }} />
          <span
            className="text-[12px] font-medium"
            style={{ color: "#E2E8F0", fontFamily: "Inter, system-ui" }}
          >
            {base.name}
          </span>
        </div>
      )}
    </div>
  );
}
