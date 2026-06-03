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
