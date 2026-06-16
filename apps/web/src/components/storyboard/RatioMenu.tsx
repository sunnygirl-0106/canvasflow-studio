import { STORYBOARD_RATIOS, type AspectRatio } from "@/store/canvasStore";

interface RatioMenuProps {
  current: AspectRatio;
  onSelect: (ratio: AspectRatio) => void;
  onClose: () => void;
}

export function RatioMenu({ current, onSelect, onClose }: RatioMenuProps) {
  return (
    <div
      className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-50"
      style={{
        minWidth: 120,
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
      }}
    >
      {STORYBOARD_RATIOS.map((r) => (
        <button
          key={r}
          onClick={() => {
            onSelect(r);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium hover:bg-slate-50 transition-colors"
          style={{
            color: r === current ? "#0F766E" : "#0F172A",
            fontFamily: "Inter, system-ui",
            fontWeight: r === current ? 700 : 500,
          }}
        >
          {r}
          {r === current && (
            <span className="ml-auto text-[11px]" style={{ color: "#0F766E" }}>
              ✓
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
