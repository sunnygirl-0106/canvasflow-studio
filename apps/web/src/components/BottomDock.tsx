import { User, LayoutGrid, Minus, Plus } from "lucide-react";
import { useReactFlow, useViewport } from "@xyflow/react";

export function BottomDock() {
  const { zoomTo } = useReactFlow();
  const { zoom } = useViewport();
  const zoomPct = Math.round(zoom * 100);

  return (
    <div
      className="absolute bottom-6 left-6 z-20 flex items-center gap-1 rounded-full"
      style={{
        height: 48,
        padding: "0 10px",
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
      }}
    >
      <DockBtn>
        <User className="w-[18px] h-[18px]" style={{ color: "#475569" }} strokeWidth={1.8} />
      </DockBtn>
      <DockBtn>
        <LayoutGrid className="w-[18px] h-[18px]" style={{ color: "#475569" }} strokeWidth={1.8} />
      </DockBtn>

      <span className="mx-1 inline-block" style={{ width: 1, height: 18, background: "#E5E7EB" }} />

      <DockBtn onClick={() => zoomTo(Math.max(0.2, zoom * 0.9), { duration: 150 })}>
        <Minus className="w-[18px] h-[18px]" style={{ color: "#475569" }} strokeWidth={2} />
      </DockBtn>

      <span
        className="text-[13px] font-semibold min-w-[42px] text-center"
        style={{ color: "#0F172A", fontFamily: "Inter, system-ui" }}
      >
        {zoomPct}%
      </span>

      <DockBtn onClick={() => zoomTo(Math.min(2, zoom * 1.1), { duration: 150 })}>
        <Plus className="w-[18px] h-[18px]" style={{ color: "#475569" }} strokeWidth={2} />
      </DockBtn>
    </div>
  );
}

function DockBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
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
