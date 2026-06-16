import { Undo2, Redo2, Scissors, ArrowRightToLine, ArrowLeftToLine, Gauge } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";

interface Props {
  compId: string;
  currentTime: number;
  selectedClipId: string | null;
  onOpenSpeed: () => void;
  dark?: boolean;
}

export function EditorToolbar({ compId, currentTime, selectedClipId, onOpenSpeed, dark }: Props) {
  const undo = useCanvas((s) => s.undo);
  const redo = useCanvas((s) => s.redo);
  const splitClip = useCanvas((s) => s.splitClip);
  const cropClip = useCanvas((s) => s.cropClip);
  const past = useCanvas((s) => s.past);
  const future = useCanvas((s) => s.future);
  const nodes = useCanvas((s) => s.nodes);

  const comp = nodes.find((n) => n.id === compId);
  // Step 2: operate on the main video track (V1) for now.
  const shots =
    comp?.kind === "composition"
      ? (comp.data.tracks.find((t) => t.kind === "video")?.clips ?? [])
      : [];

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

  const btnClass = `flex items-center justify-center rounded-lg ${dark ? "hover:bg-white/10" : "hover:bg-black/5"} disabled:opacity-30 disabled:cursor-default`;
  const btnStyle = { width: 36, height: 36 };
  const iconStyle = { color: dark ? "#94A3B8" : "#64748B" };

  return (
    <div
      className="flex items-center gap-1 flex-shrink-0"
      style={{
        height: 40,
        padding: "0 12px",
        background: dark ? "#262637" : "#F1F5F9",
        borderTop: `1px solid ${dark ? "#333348" : "#E2E8F0"}`,
      }}
    >
      <button
        onClick={undo}
        disabled={past.length === 0}
        className={btnClass}
        style={btnStyle}
        title="撤销"
      >
        <Undo2 className="w-4 h-4" style={iconStyle} />
      </button>
      <button
        onClick={redo}
        disabled={future.length === 0}
        className={btnClass}
        style={btnStyle}
        title="前进"
      >
        <Redo2 className="w-4 h-4" style={iconStyle} />
      </button>

      <div className="w-px h-5 mx-1" style={{ background: dark ? "#404056" : "#CBD5E1" }} />

      <button
        onClick={handleSplit}
        disabled={shots.length === 0}
        className={btnClass}
        style={btnStyle}
        title="分割"
      >
        <Scissors className="w-4 h-4" style={iconStyle} />
      </button>
      <button
        onClick={handleCropRight}
        disabled={shots.length === 0}
        className={btnClass}
        style={btnStyle}
        title="向右裁剪"
      >
        <ArrowRightToLine className="w-4 h-4" style={iconStyle} />
      </button>
      <button
        onClick={handleCropLeft}
        disabled={shots.length === 0}
        className={btnClass}
        style={btnStyle}
        title="向左裁剪"
      >
        <ArrowLeftToLine className="w-4 h-4" style={iconStyle} />
      </button>

      {/* Speed — disabled when no clip selected */}
      <div className="w-px h-5 mx-1" style={{ background: dark ? "#404056" : "#CBD5E1" }} />
      <button
        onClick={onOpenSpeed}
        disabled={!selectedClipId}
        className={btnClass}
        style={btnStyle}
        title="变速"
      >
        <Gauge
          className="w-4 h-4"
          style={{
            color: selectedClipId ? (dark ? "#94A3B8" : "#64748B") : dark ? "#4A4A5C" : "#CBD5E1",
          }}
        />
      </button>
    </div>
  );
}
