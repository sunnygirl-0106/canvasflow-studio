import { useCallback, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useCanvas, type Shot } from "@/store/canvasStore";

/* ── Clip colour tokens ──────────────────────────────────── */
const CLIP_STYLES: Record<Shot["color"], { bg: string; border: string; thumbBg: string; timeColor: string }> = {
  cyan: { bg: "#0E7490", border: "#67E8F9", thumbBg: "#155E75", timeColor: "#CFFAFE" },
  purple: { bg: "#5B21B6", border: "#A78BFA", thumbBg: "#6D28D9", timeColor: "#EDE9FE" },
  yellow: { bg: "#C2410C", border: "#FDBA74", thumbBg: "#9A3412", timeColor: "#FFEDD5" },
  rose: { bg: "#9F1239", border: "#FDA4AF", thumbBg: "#881337", timeColor: "#FFE4E6" },
  emerald: { bg: "#047857", border: "#6EE7B7", thumbBg: "#065F46", timeColor: "#D1FAE5" },
  gray: { bg: "#475569", border: "#94A3B8", thumbBg: "#334155", timeColor: "#E2E8F0" },
};

/* ── Dimensions ───────────────────────────────────────────── */
const RULER_H = 36;
const TRACK_H = 64;
const CLIP_H = 48;
const CLIP_Y = 8;
const TRACK_PAD_LEFT = 16;
const MIN_DURATION_SEC = 0.5;

/* ── Helpers ──────────────────────────────────────────────── */
export function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface LayoutClip {
  shot: Shot;
  x: number;
  w: number;
}

function layoutShots(shots: Shot[], pxPerSec: number): LayoutClip[] {
  let cursor = TRACK_PAD_LEFT;
  return shots.map((shot) => {
    const x = cursor;
    const w = shot.duration * pxPerSec;
    cursor += w;
    return { shot, x, w };
  });
}

function buildTicks(pxPerSec: number, totalWidth: number) {
  const interval = pxPerSec >= 40 ? 4 : pxPerSec >= 20 ? 8 : 16;
  const ticks: { label: string; x: number }[] = [];
  const maxSec = totalWidth / pxPerSec;
  for (let s = 0; s <= maxSec; s += interval) {
    ticks.push({ label: fmtSec(s), x: s * pxPerSec + TRACK_PAD_LEFT });
  }
  return ticks;
}

function buildGridLines(pxPerSec: number, totalWidth: number) {
  const interval = pxPerSec >= 40 ? 4 : pxPerSec >= 20 ? 8 : 16;
  const lines: number[] = [];
  const maxSec = totalWidth / pxPerSec;
  for (let s = interval; s < maxSec; s += interval) {
    lines.push(s * pxPerSec + TRACK_PAD_LEFT);
  }
  return lines;
}

/* ── Drag state ───────────────────────────────────────────── */
interface DragState {
  shotId: string;
  startMouseX: number;
  originIdx: number;
  offsetX: number;
}

/* ── Component ────────────────────────────────────────────── */
interface Props {
  compId: string;
  shots: Shot[];
  currentTime: number;
  pxPerSec: number;
  selectedClipId: string | null;
  onSeek: (t: number) => void;
}

export function TrackTimeline({ compId, shots, currentTime, pxPerSec, selectedClipId, onSeek }: Props) {
  const updateShot = useCanvas((s) => s.updateShot);
  const reorderShots = useCanvas((s) => s.reorderShots);
  const pushHistory = useCanvas((s) => s.pushHistory);
  const selectClip = useCanvas((s) => s.selectClip);

  const tracksRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizingShotId, setResizingShotId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState(0);

  const clips = layoutShots(shots, pxPerSec);
  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
  const lastClip = clips[clips.length - 1];
  const contentWidth = lastClip ? lastClip.x + lastClip.w + 200 : 600;

  const ticks = buildTicks(pxPerSec, contentWidth);
  const gridLines = buildGridLines(pxPerSec, contentWidth);

  const playheadX = TRACK_PAD_LEFT + currentTime * pxPerSec;

  /* ── Playhead drag ─────────────────────────────────────── */
  const handlePlayheadDrag = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const update = (clientX: number) => {
        const rect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        const relX = clientX - rect.left + scrollLeft - TRACK_PAD_LEFT;
        const t = Math.max(0, relX / pxPerSec);
        onSeek(Math.round(t * 10) / 10);
      };
      update(e.clientX);

      const move = (ev: PointerEvent) => update(ev.clientX);
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [pxPerSec, onSeek],
  );

  /* ── Ruler click to seek ─────────────────────────────── */
  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const relX = e.clientX - rect.left + scrollLeft - TRACK_PAD_LEFT;
      const t = Math.max(0, relX / pxPerSec);
      onSeek(Math.round(t * 10) / 10);
    },
    [pxPerSec, onSeek],
  );

  /* ── Resize handler ──────────────────────────────────── */
  const handleResize = useCallback(
    (shotId: string, edge: "left" | "right", e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizingShotId(shotId);

      const shot = shots.find((s) => s.id === shotId);
      if (!shot) return;
      const startMouseX = e.clientX;
      const startDuration = shot.duration;

      pushHistory();

      const move = (ev: PointerEvent) => {
        const deltaPx = ev.clientX - startMouseX;
        const deltaSec = deltaPx / pxPerSec;
        let newDuration: number;
        if (edge === "right") {
          newDuration = Math.max(MIN_DURATION_SEC, startDuration + deltaSec);
        } else {
          newDuration = Math.max(MIN_DURATION_SEC, startDuration - deltaSec);
        }
        updateShot(compId, shotId, { duration: Math.round(newDuration * 10) / 10 });
      };
      const up = () => {
        setResizingShotId(null);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [shots, compId, pxPerSec, updateShot, pushHistory],
  );

  /* ── Clip drag-to-reorder ─────────────────────────────── */
  const handleClipDragStart = useCallback(
    (shotId: string, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const idx = shots.findIndex((s) => s.id === shotId);
      const clip = layoutShots(shots, pxPerSec)[idx];
      if (!clip) return;

      const rect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const mouseXInTracks = e.clientX - rect.left + scrollLeft;
      const offsetX = mouseXInTracks - clip.x;

      pushHistory();

      const state: DragState = { shotId, startMouseX: e.clientX, originIdx: idx, offsetX };
      setDragState(state);
      setDragCurrentX(mouseXInTracks);

      const move = (ev: PointerEvent) => {
        const mx = ev.clientX - rect.left + container.scrollLeft;
        setDragCurrentX(mx);
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);

        const mx = ev.clientX - rect.left + container.scrollLeft;
        const ghostCenter = mx - offsetX + clip.w / 2;
        const currentShots = useCanvas.getState().nodes.find((n) => n.id === compId)?.data.shots ?? shots;
        const currentLayout = layoutShots(currentShots, pxPerSec);
        let dropIdx = currentShots.length;
        for (let i = 0; i < currentLayout.length; i++) {
          const midX = currentLayout[i].x + currentLayout[i].w / 2;
          if (ghostCenter < midX) {
            dropIdx = i;
            break;
          }
        }

        const dragIdx = currentShots.findIndex((s) => s.id === shotId);
        if (dragIdx !== -1 && dropIdx !== dragIdx && dropIdx !== dragIdx + 1) {
          const ids = currentShots.map((s) => s.id);
          const [removed] = ids.splice(dragIdx, 1);
          const insertAt = dropIdx > dragIdx ? dropIdx - 1 : dropIdx;
          ids.splice(insertAt, 0, removed);
          reorderShots(compId, ids);
        }

        setDragState(null);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [shots, compId, pxPerSec, pushHistory, reorderShots],
  );

  // Drop indicator position
  const dropIndicatorX = (() => {
    if (!dragState) return null;
    const clip = layoutShots(shots, pxPerSec)[dragState.originIdx];
    if (!clip) return null;
    const ghostCenter = dragCurrentX - dragState.offsetX + clip.w / 2;
    const layout = layoutShots(shots, pxPerSec);
    for (let i = 0; i < layout.length; i++) {
      if (i === dragState.originIdx) continue;
      const midX = layout[i].x + layout[i].w / 2;
      if (ghostCenter < midX) return layout[i].x;
    }
    const last = layout[layout.length - 1];
    return last ? last.x + last.w : TRACK_PAD_LEFT;
  })();

  return (
    <div
      ref={containerRef}
      className="flex-shrink-0 overflow-x-auto overflow-y-hidden relative"
      style={{
        background: "#111827",
        borderTop: "1px solid #1F2937",
      }}
    >
      <div style={{ width: contentWidth, minWidth: "100%", position: "relative" }}>
        {/* Ruler */}
        <div
          className="relative cursor-pointer"
          style={{ height: RULER_H, background: "#1F2937" }}
          onClick={handleRulerClick}
        >
          {ticks.map((tick, i) => (
            <span
              key={i}
              className="absolute text-[10px] font-medium select-none"
              style={{ left: tick.x, top: 12, color: "#64748B", fontFamily: "Inter, monospace" }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        {/* Track */}
        <div
          ref={tracksRef}
          className="relative"
          style={{ height: TRACK_H, background: "#162032" }}
          onClick={(e) => {
            // Click on empty area deselects
            if (e.target === e.currentTarget) selectClip(null);
          }}
        >
          {/* Grid lines */}
          {gridLines.map((x, i) => (
            <div key={i} className="absolute" style={{ left: x, top: 0, width: 1, height: TRACK_H, background: "#1F2937" }} />
          ))}

          {/* Clips */}
          {clips.length === 0 ? (
            <div
              className="absolute flex items-center justify-center gap-2 rounded-lg"
              style={{
                left: TRACK_PAD_LEFT,
                top: CLIP_Y,
                width: 400,
                height: CLIP_H,
                background: "#1F2937",
                border: "1.5px dashed #475467",
              }}
            >
              <Plus className="w-4 h-4" style={{ color: "#64748B" }} />
              <span className="text-[12px] font-medium" style={{ color: "#64748B", fontFamily: "PingFang SC, Inter, system-ui" }}>
                还没有片段，把素材拖到这里
              </span>
            </div>
          ) : (
            <>
              {clips.map((clip) => {
                const cs = CLIP_STYLES[clip.shot.color] ?? CLIP_STYLES.gray;
                const isResizing = resizingShotId === clip.shot.id;
                const isDragging = dragState?.shotId === clip.shot.id;
                const isSelected = selectedClipId === clip.shot.id;

                return (
                  <div
                    key={clip.shot.id}
                    className="absolute rounded-lg overflow-visible select-none"
                    style={{
                      left: clip.x,
                      top: CLIP_Y,
                      width: clip.w,
                      height: CLIP_H,
                      background: cs.bg,
                      border: `2px solid ${isSelected ? "#FFFFFF" : cs.border}`,
                      boxShadow: isSelected
                        ? "0 0 0 2px rgba(255,255,255,0.3)"
                        : isResizing
                          ? `0 0 0 2px ${cs.border}40`
                          : undefined,
                      opacity: isDragging ? 0.35 : 1,
                      cursor: dragState ? "grabbing" : "grab",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectClip(clip.shot.id);
                    }}
                    onPointerDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relX = e.clientX - rect.left;
                      if (relX < 10 || relX > rect.width - 10) return;
                      handleClipDragStart(clip.shot.id, e);
                    }}
                  >
                    {/* Left resize handle */}
                    <div
                      onPointerDown={(e) => { e.stopPropagation(); handleResize(clip.shot.id, "left", e); }}
                      className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-10 group"
                    >
                      <div
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: cs.border }}
                      />
                    </div>

                    {/* Right resize handle */}
                    <div
                      onPointerDown={(e) => { e.stopPropagation(); handleResize(clip.shot.id, "right", e); }}
                      className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-10 group"
                    >
                      <div
                        className="absolute right-0 top-2 bottom-2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: cs.border }}
                      />
                    </div>

                    {/* Thumbnail */}
                    {clip.shot.thumbnail && (
                      <img
                        src={clip.shot.thumbnail}
                        alt=""
                        className="absolute rounded object-cover"
                        style={{ left: 8, top: 6, width: 48, height: 28 }}
                        draggable={false}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <div className="absolute rounded" style={{ left: 8, top: 6, width: 48, height: 28, background: cs.thumbBg, zIndex: -1 }} />

                    {/* Name + duration */}
                    <span
                      className="absolute text-[11px] font-bold truncate"
                      style={{ left: 64, top: 6, right: 10, color: "#FFFFFF", fontFamily: "Inter, system-ui", whiteSpace: "nowrap" }}
                    >
                      {clip.shot.name}
                    </span>
                    <span
                      className="absolute text-[10px] font-medium"
                      style={{ left: 64, top: 24, color: cs.timeColor, fontFamily: "Inter, monospace" }}
                    >
                      {clip.shot.duration.toFixed(1)}s
                    </span>

                    {/* Resize tooltip */}
                    {isResizing && (
                      <div
                        className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono px-2 py-0.5 rounded whitespace-nowrap"
                        style={{ background: cs.bg, color: "#FFFFFF", border: `1px solid ${cs.border}` }}
                      >
                        {clip.shot.duration.toFixed(1)}s
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Drag ghost */}
              {dragState && (() => {
                const dragIdx = shots.findIndex((s) => s.id === dragState.shotId);
                const clip = clips[dragIdx];
                if (!clip) return null;
                const cs = CLIP_STYLES[clip.shot.color] ?? CLIP_STYLES.gray;
                const ghostLeft = dragCurrentX - dragState.offsetX;
                return (
                  <div
                    className="absolute rounded-lg overflow-hidden pointer-events-none"
                    style={{
                      left: ghostLeft,
                      top: CLIP_Y,
                      width: clip.w,
                      height: CLIP_H,
                      background: cs.bg,
                      border: `2px solid ${cs.border}`,
                      opacity: 0.8,
                      zIndex: 30,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    }}
                  >
                    <div className="absolute rounded" style={{ left: 8, top: 6, width: 48, height: 28, background: cs.thumbBg }} />
                    {clip.shot.thumbnail && (
                      <img src={clip.shot.thumbnail} alt="" className="absolute rounded object-cover" style={{ left: 8, top: 6, width: 48, height: 28 }} draggable={false} />
                    )}
                    <span className="absolute text-[11px] font-bold truncate" style={{ left: 64, top: 6, right: 10, color: "#FFFFFF", fontFamily: "Inter, system-ui" }}>
                      {clip.shot.name}
                    </span>
                  </div>
                );
              })()}

              {/* Drop indicator */}
              {dragState && dropIndicatorX !== null && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: dropIndicatorX - 1.5,
                    top: 4,
                    width: 3,
                    height: CLIP_H + 8,
                    background: "#F04438",
                    borderRadius: 2,
                    zIndex: 31,
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Playhead line */}
        <div
          className="absolute top-0 pointer-events-none"
          style={{ left: playheadX, width: 2, height: RULER_H + TRACK_H, background: "#F04438", zIndex: 20 }}
        />
        {/* Playhead handle */}
        <div
          className="absolute flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing"
          style={{ left: playheadX - 16, top: 2, width: 32, height: 18, background: "#F04438", zIndex: 21 }}
          onPointerDown={handlePlayheadDrag}
        >
          <span className="text-[9px] font-bold" style={{ color: "#FFFFFF", fontFamily: "Inter, monospace" }}>
            {fmtSec(currentTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
