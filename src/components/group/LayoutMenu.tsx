import { Grid3X3, ArrowRight, ArrowDown, Check } from "lucide-react";
import type { CanvasNode } from "@/store/canvasStore";

type Layout = NonNullable<CanvasNode["data"]["groupLayout"]>;

const OPTIONS: { value: Layout; label: string; icon: typeof Grid3X3 }[] = [
  { value: "grid", label: "宫格排列", icon: Grid3X3 },
  { value: "horizontal", label: "水平排列", icon: ArrowRight },
  { value: "vertical", label: "垂直排列", icon: ArrowDown },
];

export function LayoutMenu({
  current,
  onSelect,
}: {
  current: Layout;
  onSelect: (layout: Layout) => void;
}) {
  return (
    <div
      className="absolute top-full left-0 mt-2 rounded-xl z-50 overflow-hidden"
      style={{
        minWidth: 150,
        background: "#1E293B",
        border: "1px solid #334155",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium transition-colors"
            style={{
              color: active ? "#56C7CF" : "#F8FAFC",
              background: active ? "#334155" : "transparent",
              fontFamily: "PingFang SC, Inter, system-ui",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = "#334155";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
          >
            <Icon className="w-4 h-4" strokeWidth={1.8} />
            <span className="flex-1 text-left">{opt.label}</span>
            {active && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
          </button>
        );
      })}
    </div>
  );
}
