import { Undo2, Redo2, Scissors, ArrowRightToLine, ArrowLeftToLine, Gauge } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";

interface Props {
  compId: string;
  currentTime: number;
  selectedClipId: string | null;
  onOpenSpeed: () => void;
}

export function EditorToolbar({ compId, currentTime, selectedClipId, onOpenSpeed }: Props) {
  const undo = useCanvas((s) => s.undo);
  const redo = useCanvas((s) => s.redo);
  const splitClip = useCanvas((s) => s.splitClip);
  const cropClip = useCanvas((s) => s.cropClip);
  const past = useCanvas((s) => s.past);
  const future = useCanvas((s) => s.future);
  const nodes = useCanvas((s) => s.nodes);

  const comp = nodes.find((n) => n.id === compId);
  const shots = comp?.data.shots ?? [];

  // Find which clip the playhead is in + relative offset
  const getPlayheadClip = () => {
    let elapsed = 0;
    for (const shot of shots) {
      if (currentTime < elapsed + shot.duration) {
        return { shot, offset: currentTime - elapsed };
      }
      elapsed += shot.duration;
    }
    return null;
  };

  const handleSplit = () => {
    const info = getPlayheadClip();
    if (!info) return;
    splitClip(compId, info.shot.id, info.offset);
  };

  const handleCropRight = () => {
    const info = getPlayheadClip();
    if (!info) return;
    cropClip(compId, info.shot.id, "right", info.offset);
  };

  const handleCropLeft = () => {
    const info = getPlayheadClip();
    if (!info) return;
    cropClip(compId, info.shot.id, "left", info.offset);
  };

  const btnClass = "flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-default";
  const btnStyle = { width: 36, height: 36 };
  const iconStyle = { color: "#CBD5E1" };

  return (
    <div
      className="flex items-center gap-1 flex-shrink-0"
      style={{
        height: 40,
        padding: "0 12px",
        background: "#1E293B",
        borderTop: "1px solid #334155",
      }}
    >
      <button onClick={undo} disabled={past.length === 0} className={btnClass} style={btnStyle} title="撤销">
        <Undo2 className="w-4 h-4" style={iconStyle} />
      </button>
      <button onClick={redo} disabled={future.length === 0} className={btnClass} style={btnStyle} title="前进">
        <Redo2 className="w-4 h-4" style={iconStyle} />
      </button>

      <div className="w-px h-5 mx-1" style={{ background: "#334155" }} />

      <button onClick={handleSplit} disabled={shots.length === 0} className={btnClass} style={btnStyle} title="分割">
        <Scissors className="w-4 h-4" style={iconStyle} />
      </button>
      <button onClick={handleCropRight} disabled={shots.length === 0} className={btnClass} style={btnStyle} title="向右裁剪">
        <ArrowRightToLine className="w-4 h-4" style={iconStyle} />
      </button>
      <button onClick={handleCropLeft} disabled={shots.length === 0} className={btnClass} style={btnStyle} title="向左裁剪">
        <ArrowLeftToLine className="w-4 h-4" style={iconStyle} />
      </button>

      {/* Speed — disabled when no clip selected */}
      <div className="w-px h-5 mx-1" style={{ background: "#334155" }} />
      <button onClick={onOpenSpeed} disabled={!selectedClipId} className={btnClass} style={btnStyle} title="变速">
        <Gauge className="w-4 h-4" style={{ color: selectedClipId ? "#94A3B8" : "#475569" }} />
      </button>
    </div>
  );
}
