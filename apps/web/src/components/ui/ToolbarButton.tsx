import type { ReactNode } from "react";

// Shared pill-style toolbar button + separator. Replaces the three near-identical
// ToolbarBtn/VToolbarBtn definitions in GroupToolbar and StoryboardToolbar.
// (ScriptNodeParts has its own icon+label button with a different shape.)

const PILL =
  "inline-flex items-center gap-1 rounded-full h-8 px-3 text-[13px] font-medium transition-colors";
const FONT = "PingFang SC, Inter, system-ui";

export function ToolbarButton({
  children,
  onClick,
  variant = "light",
  active,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  /** "dark" = light text on a dark toolbar, "light" = dark text on a light toolbar */
  variant?: "dark" | "light";
  active?: boolean;
  title?: string;
}) {
  const hoverBg = variant === "dark" ? "#334155" : "#F8FAFC";
  const baseColor = variant === "dark" ? "#F8FAFC" : "#334155";
  return (
    <button
      onClick={onClick}
      title={title}
      className={PILL}
      style={{
        color: active ? "#0F766E" : baseColor,
        background: active ? "#F0FDFA" : "transparent",
        fontFamily: FONT,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

export function ToolbarSep({ light }: { light?: boolean }) {
  return (
    <span
      className="inline-block"
      style={{ width: 1, height: 18, background: light ? "#E5E7EB" : "#475569" }}
    />
  );
}
