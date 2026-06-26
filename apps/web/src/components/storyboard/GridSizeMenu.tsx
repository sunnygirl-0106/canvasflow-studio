import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { STORYBOARD_PRESETS, STORYBOARD_MAX } from "@/store/canvasStore";
import { MenuPanel, MenuItem } from "@/components/ui/Menu";

interface GridSizeMenuProps {
  currentRows: number;
  currentCols: number;
  onSelect: (rows: number, cols: number) => void;
  onClose: () => void;
}

// Visual grid cell metrics (the 自定义宫格 picker).
const CELL = 30;
const GAP = 6;
// Picker shows at least a 5×5 grid (matches the design), then grows toward the
// max as the pointer approaches the right/bottom edge — Office-style.
const BASE = 5;

export function GridSizeMenu({ currentRows, currentCols, onSelect, onClose }: GridSizeMenuProps) {
  const [customOpen, setCustomOpen] = useState(false);
  // Hovered size in the visual picker (1-based, cols × rows). Defaults to the
  // current selection so the picker opens reflecting the active grid.
  const [hover, setHover] = useState<{ cols: number; rows: number }>({
    cols: currentCols,
    rows: currentRows,
  });

  const colsShown = Math.min(STORYBOARD_MAX, Math.max(BASE, hover.cols + 1));
  const rowsShown = Math.min(STORYBOARD_MAX, Math.max(BASE, hover.rows + 1));

  return (
    <div className="absolute top-full left-0 mt-1 flex items-start gap-2 z-50">
      {/* Main menu: square presets + 自定义 */}
      <MenuPanel minWidth={160} className="rounded-lg overflow-hidden">
        {STORYBOARD_PRESETS.map((n) => {
          const isActive = !customOpen && currentRows === n && currentCols === n;
          return (
            <MenuItem
              key={n}
              active={isActive}
              onClick={() => {
                onSelect(n, n);
                onClose();
              }}
              onMouseEnter={() => setCustomOpen(false)}
            >
              {n}×{n}
              {isActive && (
                <span className="ml-auto text-[11px]" style={{ color: "#0F766E" }}>
                  ✓
                </span>
              )}
            </MenuItem>
          );
        })}

        {/* Divider */}
        <div style={{ height: 1, background: "#E5E7EB", margin: "4px 0" }} />

        {/* 自定义 — opens the visual grid picker to the right */}
        <MenuItem
          active={customOpen}
          fontFamily="PingFang SC, Inter, system-ui"
          onMouseEnter={() => setCustomOpen(true)}
          onClick={() => setCustomOpen(true)}
        >
          自定义
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        </MenuItem>
      </MenuPanel>

      {/* Visual grid picker flyout */}
      {customOpen && (
        <div
          className="rounded-2xl"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            boxShadow: "0 12px 32px rgba(15,23,42,0.14)",
            padding: 16,
          }}
          onMouseEnter={() => setCustomOpen(true)}
          onMouseLeave={() => setHover({ cols: currentCols, rows: currentRows })}
        >
          <div
            className="flex items-center justify-between mb-3"
            style={{ minWidth: colsShown * CELL + (colsShown - 1) * GAP }}
          >
            <span
              className="text-[14px] font-medium"
              style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
            >
              自定义宫格
            </span>
            <span
              className="text-[14px] font-semibold"
              style={{ color: "#0F172A", fontFamily: "Inter, system-ui" }}
            >
              {hover.cols} x {hover.rows}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${colsShown}, ${CELL}px)`,
              gap: GAP,
            }}
          >
            {Array.from({ length: rowsShown * colsShown }, (_, i) => {
              const c = (i % colsShown) + 1;
              const r = Math.floor(i / colsShown) + 1;
              const active = c <= hover.cols && r <= hover.rows;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHover({ cols: c, rows: r })}
                  onClick={() => {
                    onSelect(r, c);
                    onClose();
                  }}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 8,
                    cursor: "pointer",
                    background: active ? "#AECBFA" : "#F1F2F4",
                    transition: "background 120ms",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
