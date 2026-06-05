import { Play, Pause, Scan } from "lucide-react";
import { fmtSec } from "./TrackTimeline";

interface Props {
  currentTime: number;
  totalDuration: number;
  playing: boolean;
  onTogglePlay: () => void;
  onFullscreen: () => void;
}

export function PlaybackControls({ currentTime, totalDuration, playing, onTogglePlay, onFullscreen }: Props) {
  const btnClass = "flex items-center justify-center rounded-lg hover:bg-white/10";
  const btnStyle = { width: 36, height: 36 };

  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[13px] font-medium select-none"
        style={{ color: "#94A3B8", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", minWidth: 40, textAlign: "right" }}
      >
        {fmtSec(currentTime)}
      </span>

      <button onClick={onTogglePlay} className={btnClass} style={btnStyle} title={playing ? "暂停" : "播放"}>
        {playing ? (
          <Pause className="w-5 h-5" style={{ color: "#E2E8F0" }} />
        ) : (
          <Play className="w-5 h-5 ml-0.5" style={{ color: "#E2E8F0" }} />
        )}
      </button>

      <span
        className="text-[13px] font-medium select-none"
        style={{ color: "#64748B", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", minWidth: 40 }}
      >
        {fmtSec(totalDuration)}
      </span>

      <button onClick={onFullscreen} className={btnClass} style={btnStyle} title="全屏预览">
        <Scan className="w-4 h-4" style={{ color: "#94A3B8" }} />
      </button>
    </div>
  );
}
