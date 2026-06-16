import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Play } from "lucide-react";
import { clipAt, clipEnd, type Track, type Clip } from "@/store/canvasStore";

interface Props {
  tracks: Track[];
  currentTime: number;
  playing: boolean;
  onTogglePlay: () => void;
  onFullscreen?: () => void;
}

/* ── Constants ─────────────────────────────────────────── */
const HANDLE_SIZE = 10;
const BORDER_COLOR = "#7DD3FC";
const CANVAS_ASPECT = 16 / 9;

/** 8 handle positions: 4 corners + 4 midpoints */
const HANDLES: { key: string; xPct: number; yPct: number; cursor: string }[] = [
  { key: "nw", xPct: 0, yPct: 0, cursor: "nwse-resize" },
  { key: "n", xPct: 50, yPct: 0, cursor: "ns-resize" },
  { key: "ne", xPct: 100, yPct: 0, cursor: "nesw-resize" },
  { key: "w", xPct: 0, yPct: 50, cursor: "ew-resize" },
  { key: "e", xPct: 100, yPct: 50, cursor: "ew-resize" },
  { key: "sw", xPct: 0, yPct: 100, cursor: "nesw-resize" },
  { key: "s", xPct: 50, yPct: 100, cursor: "ns-resize" },
  { key: "se", xPct: 100, yPct: 100, cursor: "nwse-resize" },
];

/** Video rect in percentage of canvas (0–100) */
interface VideoRect {
  x: number; // left %
  y: number; // top %
  w: number; // width %
  h: number; // height %
}

const DEFAULT_RECT: VideoRect = { x: 0, y: 0, w: 100, h: 100 };

/* ── Helpers ───────────────────────────────────────────── */

function clipAtOrLast(track: Track, t: number): Clip | null {
  const current = clipAt(track, t);
  if (current) return current;
  let best: Clip | null = null;
  let bestEnd = -1;
  for (const c of track.clips) {
    const end = clipEnd(c);
    if (end <= t + 0.01 && end > bestEnd) {
      bestEnd = end;
      best = c;
    }
  }
  return best;
}

/* ── Component ─────────────────────────────────────────── */

export function PreviewStage({ tracks, currentTime, playing, onTogglePlay }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(false);
  const [videoRect, setVideoRect] = useState<VideoRect>(DEFAULT_RECT);
  const dragRef = useRef<{
    kind: "move" | string; // "move" or handle key like "nw","se"...
    startX: number;
    startY: number;
    startRect: VideoRect;
  } | null>(null);

  const videoTracks = useMemo(
    () => tracks.filter((t) => t.kind === "video").sort((a, b) => a.name.localeCompare(b.name)),
    [tracks],
  );

  const displayClip = useMemo(() => {
    for (const vt of videoTracks) {
      const c = clipAt(vt, currentTime);
      if (c) return c;
    }
    let best: Clip | null = null;
    let bestEnd = -1;
    for (const vt of videoTracks) {
      const c = clipAtOrLast(vt, currentTime);
      if (c) {
        const end = clipEnd(c);
        if (end > bestEnd) {
          bestEnd = end;
          best = c;
        }
      }
    }
    return best;
  }, [videoTracks, currentTime]);

  const thumbnail = displayClip?.thumbnail;
  const half = HANDLE_SIZE / 2;

  /* ── Drag / resize logic ─────────────────────────────── */
  const startDrag = useCallback(
    (kind: string, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      dragRef.current = {
        kind,
        startX: e.clientX,
        startY: e.clientY,
        startRect: { ...videoRect },
      };
    },
    [videoRect],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;
      const s = drag.startRect;

      if (drag.kind === "move") {
        setVideoRect({ ...s, x: s.x + dxPct, y: s.y + dyPct });
        return;
      }

      // Resize by handle
      const k = drag.kind;
      let { x, y, w, h } = s;

      // Horizontal
      if (k.includes("w")) {
        const newX = s.x + dxPct;
        const newW = s.w - dxPct;
        if (newW > 5) {
          x = newX;
          w = newW;
        }
      } else if (k.includes("e")) {
        const newW = s.w + dxPct;
        if (newW > 5) {
          w = newW;
        }
      }

      // Vertical
      if (k.includes("n")) {
        const newY = s.y + dyPct;
        const newH = s.h - dyPct;
        if (newH > 5) {
          y = newY;
          h = newH;
        }
      } else if (k.includes("s")) {
        const newH = s.h + dyPct;
        if (newH > 5) {
          h = newH;
        }
      }

      setVideoRect({ x, y, w, h });
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div
      className="relative flex-1 flex items-center justify-center overflow-hidden"
      style={{ background: "#000000", minHeight: 300 }}
      onClick={() => setSelected(false)}
    >
      {/* Fixed-aspect canvas area (dark background = the "canvas") */}
      <div
        ref={canvasRef}
        className="relative"
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          aspectRatio: `${CANVAS_ASPECT}`,
          background: "#1E1E1E",
          overflow: "hidden",
        }}
      >
        {thumbnail ? (
          <>
            {/* Video layer — positioned by videoRect */}
            <div
              className="absolute"
              style={{
                left: `${videoRect.x}%`,
                top: `${videoRect.y}%`,
                width: `${videoRect.w}%`,
                height: `${videoRect.h}%`,
                cursor: selected ? "move" : "default",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(true);
              }}
              onPointerDown={(e) => {
                if (!selected) return;
                startDrag("move", e);
              }}
            >
              <img
                src={thumbnail}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />

              {/* Selection border + 8 handles */}
              {selected && (
                <div
                  className="absolute inset-0"
                  style={{ border: `2px solid ${BORDER_COLOR}`, pointerEvents: "none" }}
                >
                  {HANDLES.map((h) => (
                    <div
                      key={h.key}
                      style={{
                        position: "absolute",
                        left: `${h.xPct}%`,
                        top: `${h.yPct}%`,
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        marginLeft: -half,
                        marginTop: -half,
                        borderRadius: 2,
                        background: "#FFFFFF",
                        border: `2px solid ${BORDER_COLOR}`,
                        cursor: h.cursor,
                        pointerEvents: "auto",
                        zIndex: 2,
                      }}
                      onPointerDown={(e) => startDrag(h.key, e)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Center play button */}
            {!playing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePlay();
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(4px)",
                  zIndex: 5,
                }}
              >
                <Play className="w-6 h-6 ml-0.5" style={{ color: "#334155" }} />
              </button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[14px] font-medium" style={{ color: "#64748B" }}>
              暂无画面
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
