import { useEffect, useRef, useState } from "react";
import { Film, X, ArrowDown } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";

const AUTO_HIDE_MS = 16000;

/**
 * Coach mark shown every time a new composition node is created.
 */
export function CompositionCoachToast() {
  // Narrow selector: a number that only changes when a composition is
  // added/removed — so dragging unrelated nodes no longer re-renders the toast
  // (was subscribing to the entire nodes array).
  const compCount = useCanvas((s) =>
    s.nodes.reduce((c, n) => c + (n.kind === "composition" ? 1 : 0), 0),
  );
  const seenIdsRef = useRef<Set<string> | null>(null);
  const [visibleFor, setVisibleFor] = useState<string | null>(null);

  // Lazy-init: snapshot pre-existing composition ids so they don't trigger the coach
  if (seenIdsRef.current === null) {
    seenIdsRef.current = new Set(
      useCanvas
        .getState()
        .nodes.filter((n) => n.kind === "composition")
        .map((n) => n.id),
    );
  }

  // Watch for newly-added compositions (fires when the count changes).
  useEffect(() => {
    const seen = seenIdsRef.current!;
    const newComp = useCanvas
      .getState()
      .nodes.find((n) => n.kind === "composition" && !seen.has(n.id));
    if (newComp) {
      seen.add(newComp.id);
      setVisibleFor(newComp.id);
    }
  }, [compCount]);

  // Auto-hide after timeout
  useEffect(() => {
    if (!visibleFor) return;
    const t = setTimeout(() => setVisibleFor(null), AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [visibleFor]);

  if (!visibleFor) return null;

  const dismissOnce = () => setVisibleFor(null);

  return (
    <div
      className="absolute z-40 fade-in"
      style={{
        left: "50%",
        top: 84, // sits just under the header
        transform: "translateX(-50%)",
      }}
    >
      <div
        className="flex items-start gap-3 rounded-2xl"
        style={{
          width: 380,
          padding: "14px 14px 14px 16px",
          background: "#0F172A",
          color: "#FFFFFF",
          boxShadow: "0 18px 40px rgba(15,23,42,0.25)",
        }}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
          }}
        >
          <Film className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[14px] font-semibold"
              style={{ fontFamily: "PingFang SC, Inter, system-ui" }}
            >
              视频合成已创建
            </span>
            <span
              className="text-[10px] font-bold rounded px-1.5 py-0.5"
              style={{ background: "#1E293B", color: "#5EEAD4" }}
            >
              Beta
            </span>
          </div>
          <div
            className="text-[12.5px] mt-1.5 leading-snug"
            style={{ color: "#CBD5E1", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            从视频节点右侧拖一根线到合成节点左侧的
            <ArrowDown className="inline-block mx-0.5 w-3 h-3 align-text-bottom" />
            端口，就能替换或新增分镜。
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={dismissOnce}
              className="text-[12px] font-semibold rounded-full px-3 py-1"
              style={{
                background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
                color: "#FFFFFF",
                fontFamily: "PingFang SC, Inter, system-ui",
              }}
            >
              知道了
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={dismissOnce}
          className="rounded-full hover:bg-white/10 flex-shrink-0"
          style={{
            width: 24,
            height: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="dismiss"
        >
          <X className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
