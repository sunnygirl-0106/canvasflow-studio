import { ZoomIn, ZoomOut, Minimize2, Maximize2, X } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";

const MIN_PX = 10;
const MAX_PX = 200;

interface Props {
  pxPerSec: number;
  onZoom: (next: number) => void;
}

export function ZoomControls({ pxPerSec, onZoom }: Props) {
  const editorMode = useCanvas((s) => s.editorMode);
  const setEditorMode = useCanvas((s) => s.setEditorMode);
  const closeComposition = useCanvas((s) => s.closeComposition);

  const isFull = editorMode === "full";

  const zoomOut = () => onZoom(Math.max(MIN_PX, pxPerSec * 0.8));
  const zoomIn = () => onZoom(Math.min(MAX_PX, pxPerSec * 1.25));

  // Normalize pxPerSec to 0-1 range for slider
  const sliderValue = (Math.log(pxPerSec) - Math.log(MIN_PX)) / (Math.log(MAX_PX) - Math.log(MIN_PX));
  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    const px = Math.exp(Math.log(MIN_PX) + v * (Math.log(MAX_PX) - Math.log(MIN_PX)));
    onZoom(Math.round(px * 100) / 100);
  };

  const btnClass = "flex items-center justify-center rounded-lg hover:bg-white/10";
  const btnStyle = { width: 32, height: 32 };
  const iconStyle = { color: "#94A3B8" };

  return (
    <div
      className="flex items-center gap-1 flex-shrink-0"
      style={{ padding: "0 8px" }}
    >
      <button onClick={zoomOut} className={btnClass} style={btnStyle} title="缩小">
        <ZoomOut className="w-4 h-4" style={iconStyle} />
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={sliderValue}
        onChange={handleSlider}
        className="zoom-slider"
        style={{
          width: 80,
          height: 4,
          appearance: "none",
          WebkitAppearance: "none",
          background: `linear-gradient(to right, #64748B 0%, #64748B ${sliderValue * 100}%, #334155 ${sliderValue * 100}%, #334155 100%)`,
          borderRadius: 2,
          outline: "none",
          cursor: "pointer",
        }}
        title={`${Math.round(pxPerSec)}px/s`}
      />

      <button onClick={zoomIn} className={btnClass} style={btnStyle} title="放大">
        <ZoomIn className="w-4 h-4" style={iconStyle} />
      </button>

      <div className="w-px h-5 mx-1" style={{ background: "#334155" }} />

      {isFull ? (
        <button onClick={() => setEditorMode("collapsed")} className={btnClass} style={btnStyle} title="收缩">
          <Minimize2 className="w-4 h-4" style={iconStyle} />
        </button>
      ) : (
        <>
          <button onClick={() => setEditorMode("full")} className={btnClass} style={btnStyle} title="展开预览">
            <Maximize2 className="w-4 h-4" style={iconStyle} />
          </button>
          <button onClick={closeComposition} className={btnClass} style={btnStyle} title="退出剪辑">
            <X className="w-4 h-4" style={iconStyle} />
          </button>
        </>
      )}
    </div>
  );
}
