import { ArrowDown, ArrowRight } from "lucide-react";

/**
 * Visual hint that surfaces on parent :hover (via Tailwind `group`):
 *  - A soft pulsing halo around the source handle
 *  - A tooltip pill that reads "拖到时间轴" with an arrow
 *
 * Pure cosmetic + pointer-events:none — never intercepts the actual drag.
 * The parent node must have the `group` class (and ideally `relative`).
 */
export function NodeHandleHint({
  text = "拖到时间轴",
  delayMs = 220,
  position = "right",
}: {
  text?: string;
  delayMs?: number;
  position?: "right" | "bottom";
}) {
  if (position === "bottom") {
    return (
      <>
        {/* Pulse halo around the bottom-edge handle */}
        <div
          className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translate(-50%, 50%)",
            zIndex: 1,
            transitionDelay: `${delayMs}ms`,
          }}
        >
          <div className="handle-pulse" />
        </div>

        {/* Tooltip pill */}
        <div
          className="pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
          style={{
            position: "absolute",
            left: "50%",
            top: "calc(100% + 16px)",
            transform: "translateX(-50%)",
            zIndex: 2,
            transitionDelay: `${delayMs}ms`,
          }}
        >
          <div
            className="flex items-center gap-1 rounded-full whitespace-nowrap"
            style={{
              padding: "5px 10px 5px 12px",
              background: "#0F172A",
              color: "#FFFFFF",
              boxShadow: "0 6px 16px rgba(15,23,42,0.20)",
            }}
          >
            <span
              className="text-[11px] font-semibold"
              style={{ fontFamily: "PingFang SC, Inter, system-ui" }}
            >
              {text}
            </span>
            <ArrowDown className="w-3 h-3" strokeWidth={2.4} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Pulse halo around the right-edge handle */}
      <div
        className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translate(50%, -50%)",
          zIndex: 1,
          transitionDelay: `${delayMs}ms`,
        }}
      >
        <div className="handle-pulse" />
      </div>

      {/* Tooltip pill */}
      <div
        className="pointer-events-none opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
        style={{
          position: "absolute",
          left: "calc(100% + 16px)",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 2,
          transitionDelay: `${delayMs}ms`,
        }}
      >
        <div
          className="flex items-center gap-1 rounded-full whitespace-nowrap"
          style={{
            padding: "5px 10px 5px 12px",
            background: "#0F172A",
            color: "#FFFFFF",
            boxShadow: "0 6px 16px rgba(15,23,42,0.20)",
          }}
        >
          <span
            className="text-[11px] font-semibold"
            style={{ fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            {text}
          </span>
          <ArrowRight className="w-3 h-3" strokeWidth={2.4} />
        </div>
      </div>
    </>
  );
}
