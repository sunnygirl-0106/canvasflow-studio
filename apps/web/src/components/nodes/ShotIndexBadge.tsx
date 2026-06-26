import { NODE_COLORS as COLORS } from "./nodeTheme";

/**
 * The shot-number badge shown on a storyboard member when "显示序号" is on.
 * Sits at the card's top-left corner. Shared by the image and video nodes —
 * the only storyboard-specific chrome left now that members render full-size.
 */
export function ShotIndexBadge({ label }: { label: string }) {
  return (
    <span
      className="absolute z-10 rounded px-1.5 py-0.5 text-[11px] font-medium leading-none"
      style={{
        top: -2,
        left: -2,
        background: COLORS.indexBg,
        color: COLORS.indexText,
        fontFamily: "Inter, system-ui",
      }}
    >
      {label}
    </span>
  );
}
