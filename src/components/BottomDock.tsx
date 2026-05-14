import { LayoutGrid, MapPin, MousePointer2, Minus, Plus } from "lucide-react";
import { useState } from "react";

export function BottomDock() {
  const [zoom, setZoom] = useState(100);

  return (
    <div
      className="absolute bottom-6 left-6 z-20 flex items-center gap-4 rounded-[18px]"
      style={{
        height: 58,
        padding: "0 18px",
        background: "#FFFFFFE8",
        border: "1px solid #D8E1EC",
        boxShadow: "0 12px 30px rgba(152,162,179,0.1)",
      }}
    >
      <LayoutGrid className="w-[18px] h-[18px]" style={{ color: "#667085" }} />
      <MapPin className="w-[18px] h-[18px]" style={{ color: "#667085" }} />
      <MousePointer2 className="w-[18px] h-[18px]" style={{ color: "#667085" }} />

      <button onClick={() => setZoom((z) => Math.max(25, z - 10))}>
        <Minus className="w-[18px] h-[18px]" style={{ color: "#667085" }} />
      </button>

      <span className="text-base font-semibold min-w-[40px] text-center" style={{ color: "#344054", fontFamily: "Inter, monospace" }}>
        {zoom}%
      </span>

      <button onClick={() => setZoom((z) => Math.min(200, z + 10))}>
        <Plus className="w-[18px] h-[18px]" style={{ color: "#667085" }} />
      </button>
    </div>
  );
}
