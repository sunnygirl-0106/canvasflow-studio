import { useState } from "react";
import { STORYBOARD_PRESETS, STORYBOARD_MAX } from "@/store/canvasStore";

interface GridSizeMenuProps {
  currentRows: number;
  currentCols: number;
  onSelect: (rows: number, cols: number) => void;
  onClose: () => void;
}

export function GridSizeMenu({ currentRows, currentCols, onSelect, onClose }: GridSizeMenuProps) {
  const [customRows, setCustomRows] = useState(String(currentRows));
  const [customCols, setCustomCols] = useState(String(currentCols));

  const handleCustomApply = () => {
    const r = Math.max(1, Math.min(STORYBOARD_MAX, parseInt(customRows) || 1));
    const c = Math.max(1, Math.min(STORYBOARD_MAX, parseInt(customCols) || 1));
    onSelect(r, c);
    onClose();
  };

  return (
    <div
      className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-50"
      style={{
        minWidth: 180,
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
      }}
    >
      {/* Presets */}
      {STORYBOARD_PRESETS.map((n) => {
        const isActive = currentRows === n && currentCols === n;
        return (
          <button
            key={n}
            onClick={() => {
              onSelect(n, n);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium hover:bg-slate-50 transition-colors"
            style={{
              color: isActive ? "#0F766E" : "#0F172A",
              fontFamily: "Inter, system-ui",
              fontWeight: isActive ? 700 : 500,
            }}
          >
            {n}x{n}
            {isActive && (
              <span className="ml-auto text-[11px]" style={{ color: "#0F766E" }}>
                ✓
              </span>
            )}
          </button>
        );
      })}

      {/* Divider */}
      <div style={{ height: 1, background: "#E5E7EB", margin: "4px 0" }} />

      {/* Custom input */}
      <div className="px-3 py-2">
        <div
          className="text-[11px] font-medium mb-1.5"
          style={{ color: "#64748B", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          自定义 (上限 {STORYBOARD_MAX})
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={STORYBOARD_MAX}
            value={customRows}
            onChange={(e) => setCustomRows(e.target.value)}
            className="w-12 h-7 rounded text-center text-[13px] outline-none"
            style={{ border: "1px solid #D1D5DB", fontFamily: "Inter, system-ui" }}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <span className="text-[12px]" style={{ color: "#94A3B8" }}>
            x
          </span>
          <input
            type="number"
            min={1}
            max={STORYBOARD_MAX}
            value={customCols}
            onChange={(e) => setCustomCols(e.target.value)}
            className="w-12 h-7 rounded text-center text-[13px] outline-none"
            style={{ border: "1px solid #D1D5DB", fontFamily: "Inter, system-ui" }}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button
            onClick={handleCustomApply}
            className="h-7 px-2 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#0F766E", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            应用
          </button>
        </div>
      </div>
    </div>
  );
}
