import { LayoutGrid, Maximize, MousePointer2, Minus, Plus } from "lucide-react";
import { useState } from "react";

export function BottomDock() {
  const [zoom, setZoom] = useState(100);

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full"
      style={{
        height: 48,
        padding: "0 10px",
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
      }}
    >
      <DockBtn>
        <LayoutGrid className="w-[18px] h-[18px]" style={{ color: "#475569" }} strokeWidth={1.8} />
      </DockBtn>
      <DockBtn>
        <Maximize className="w-[18px] h-[18px]" style={{ color: "#475569" }} strokeWidth={1.8} />
      </DockBtn>
      <DockBtn>
        <MousePointer2 className="w-[18px] h-[18px]" style={{ color: "#475569" }} strokeWidth={1.8} />
      </DockBtn>

      {/* Divider */}
      <span
        className="mx-1 inline-block"
        style={{ width: 1, height: 18, background: "#E5E7EB" }}
      />

      <DockBtn onClick={() => setZoom((z) => Math.max(25, z - 10))}>
        <Minus className="w-[18px] h-[18px]" style={{ color: "#475569" }} strokeWidth={2} />
      </DockBtn>

      <span
        className="text-[13px] font-semibold min-w-[42px] text-center"
        style={{ color: "#0F172A", fontFamily: "Inter, system-ui" }}
      >
        {zoom}%
      </span>

      <DockBtn onClick={() => setZoom((z) => Math.min(200, z + 10))}>
        <Plus className="w-[18px] h-[18px]" style={{ color: "#475569" }} strokeWidth={2} />
      </DockBtn>
    </div>
  );
}

function DockBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-full hover:bg-slate-100"
      style={{ width: 32, height: 32 }}
    >
      {children}
    </button>
  );
}
