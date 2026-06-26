import type { ReactNode } from "react";

// Shared dropdown shell + row. Replaces the copy-pasted panel/button markup in
// RatioMenu, StitchMenu and GridSizeMenu.

const ROW =
  "w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium hover:bg-slate-50 transition-colors";

export function MenuPanel({
  minWidth = 120,
  className = "absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-50",
  children,
}: {
  minWidth?: number;
  /** Override positioning — e.g. GridSizeMenu nests the panel inside a flex wrapper. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        minWidth,
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
      }}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  active,
  onClick,
  onMouseEnter,
  fontFamily = "Inter, system-ui",
  children,
}: {
  active?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  fontFamily?: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={ROW}
      style={{
        color: active ? "#0F766E" : "#0F172A",
        fontFamily,
        fontWeight: active ? 700 : 500,
      }}
    >
      {children}
    </button>
  );
}
