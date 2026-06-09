import { useEffect, useRef, useState, useCallback } from "react";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import { useCanvas, type CanvasNode, type Shot } from "@/store/canvasStore";
import { CLIP_STYLES } from "@/lib/clipStyles";
import { fmtSec } from "@/lib/time";
import {
  Play,
  Pause,
  Download,
  MoreHorizontal,
  Scissors,
  Search,
  Magnet,
  Lock,
  Plus,
  Captions,
  Sparkles,
  Music,
  X,
  Maximize2,
} from "lucide-react";
import { createPortal } from "react-dom";

/* ── colour tokens from .pen ───────────────────────────────── */
const COLORS = {
  nodeBg: "#FFFFFF",
  nodeBorder: "#56C7CF",
  headerBg: "#F8FAFC",
  headerBorder: "#D8E1EC",
  editorBg: "#111827",
  trackLabelBg: "#182233",
  rulerBg: "#1F2937",
  trackRow1: "#162032",
  trackRow2: "#111827",
  trackRow3: "#162032",
  trackRow4: "#111827",
  gridLine: "#344054",
  playhead: "#F04438",
  overlayBg: "#334155",
  overlayBorder: "#64748B",
  effectBg: "#164E63",
  effectBorder: "#22D3EE",
  audioBg: "#713F12",
  audioBorder: "#FBBF24",
  audioWave: "#FDE68A",
  dropBg: "#1F2937",
  dropBorder: "#475467",
  port1: "#56C7CF",
  port2: "#7C3AED",
  port3: "#F97316",
  textPrimary: "#101828",
  textSecondary: "#667085",
  textLight: "#98A2B3",
  textWhite: "#FFFFFF",
  textTrackLabel: "#F9FAFB",
  textTrackLabelDim: "#D0D5DD",
};

/* ── Waveform bars for audio track ─────────────────────────── */
const WAVE_BARS = [
  { x: 270, h: 12, y: 16 },
  { x: 286, h: 22, y: 11 },
  { x: 302, h: 8, y: 18 },
  { x: 318, h: 28, y: 8 },
  { x: 334, h: 16, y: 14 },
  { x: 350, h: 24, y: 10 },
  { x: 366, h: 10, y: 17 },
  { x: 382, h: 20, y: 12 },
];

/* ── Dimensions ────────────────────────────────────────────── */
const NODE_W = 1800;
const HEADER_H = 58;
const EDITOR_H = 312;
const TRACK_LABEL_W = 178;
const RULER_H = 48;
const TRACK_H = 72;
const TRACKS_H = 264;
const CANVAS_W = NODE_W - 48 - TRACK_LABEL_W;
const VISIBLE_SECS = 56;
const PX_PER_SEC = CANVAS_W / VISIBLE_SECS;
const CLIP_H = 52;
const CLIP_Y = 10;

const TRACK_PAD_LEFT = 24;
const MIN_DURATION_SEC = 2;

/* ── Helpers ───────────────────────────────────────────────── */
interface LayoutClip {
  shot: Shot;
  x: number;
  w: number;
}

function layoutShots(shots: Shot[]): LayoutClip[] {
  let cursor = TRACK_PAD_LEFT;
  return shots.map((shot) => {
    const x = cursor;
    const w = shot.duration * PX_PER_SEC;
    cursor += w;
    return { shot, x, w };
  });
}

/* ── Generate ruler ticks dynamically ──────────────────────── */
function buildTicks() {
  const ticks: { label: string; x: number }[] = [];
  for (let s = 0; s <= VISIBLE_SECS; s += 8) {
    ticks.push({ label: fmtSec(s), x: s * PX_PER_SEC + 20 });
  }
  return ticks;
}

function buildGridLines() {
  const lines: number[] = [];
  for (let s = 8; s < VISIBLE_SECS; s += 8) {
    lines.push(s * PX_PER_SEC);
  }
  return lines;
}

const TICKS = buildTicks();
const GRID_LINES = buildGridLines();

/* ═══════════════════════════════════════════════════════════ */

interface DragState {
  shotId: string;
  startMouseX: number;
  originIdx: number;
  offsetX: number; // px offset from clip left edge to mouse
}

export function TimelineNode({ id, data }: { id: string; data: CanvasNode["data"] }) {
  const updateShot = useCanvas((s) => s.updateShot);
  const reorderShots = useCanvas((s) => s.reorderShots);
  const pushHistory = useCanvas((s) => s.pushHistory);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resizingShotId, setResizingShotId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false); // mouse x relative to tracks canvas
  const editorRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);
  const updateNodeInternals = useUpdateNodeInternals();

  const shots = data.shots ?? [];
  const clips = layoutShots(shots);
  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
  const connectedCount = shots.filter((s) => s.bindings.length > 0).length;

  // Update React Flow handle positions when shots change
  useEffect(() => {
    updateNodeInternals(id);
  }, [shots, id, updateNodeInternals]);

  // rAF-based playback
  useEffect(() => {
    if (!playing) return;
    let stopped = false;
    let lastTs: number | null = null;
    const tick = (ts: number) => {
      if (stopped) return;
      if (lastTs === null) lastTs = ts;
      const delta = Math.min((ts - lastTs) / 1000, 0.1);
      lastTs = ts;
      setCurrentTime((t) => {
        const next = t + delta;
        if (next >= totalDuration) { setPlaying(false); stopped = true; return 0; }
        return next;
      });
      if (!stopped) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(id); };
  }, [playing, totalDuration]);

  // Listen for external play event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tlId === id) {
        setCurrentTime(0);
        setPlaying(true);
      }
    };
    window.addEventListener("wb:play", handler);
    return () => window.removeEventListener("wb:play", handler);
  }, [id]);

  const playheadX = TRACK_LABEL_W + currentTime * PX_PER_SEC;

  /* ── Playhead drag ─────────────────────────────────────── */
  const handlePlayheadDrag = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const rect = editorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const update = (clientX: number) => {
        const relX = clientX - rect.left - TRACK_LABEL_W;
        const t = Math.max(0, Math.min(VISIBLE_SECS, relX / PX_PER_SEC));
        setCurrentTime(Math.round(t * 10) / 10);
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
    [],
  );

  /* ── Resize handler (works for both left and right edges) ── */
  const handleResize = useCallback(
    (shotId: string, edge: "left" | "right", e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizingShotId(shotId);

      const shot = shots.find((s) => s.id === shotId);
      if (!shot) return;
      const startMouseX = e.clientX;
      const startDuration = shot.duration;

      const move = (ev: PointerEvent) => {
        const deltaPx = ev.clientX - startMouseX;
        const deltaSec = deltaPx / PX_PER_SEC;

        let newDuration: number;
        if (edge === "right") {
          newDuration = Math.max(MIN_DURATION_SEC, startDuration + deltaSec);
        } else {
          newDuration = Math.max(MIN_DURATION_SEC, startDuration - deltaSec);
        }

        updateShot(id, shotId, { duration: Math.round(newDuration * 10) / 10 });
      };
      const up = () => {
        setResizingShotId(null);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [shots, id, updateShot],
  );

  /* ── Clip drag-to-reorder ─────────────────────────────── */
  const handleClipDragStart = useCallback(
    (shotId: string, e: React.PointerEvent) => {
      // Only start drag from middle area (not resize edges)
      e.stopPropagation();
      e.preventDefault();
      const tracksRect = tracksRef.current?.getBoundingClientRect();
      if (!tracksRect) return;

      const idx = shots.findIndex((s) => s.id === shotId);
      const clip = layoutShots(shots)[idx];
      if (!clip) return;

      const mouseXInTracks = e.clientX - tracksRect.left;
      const offsetX = mouseXInTracks - clip.x;

      pushHistory();

      const state: DragState = {
        shotId,
        startMouseX: e.clientX,
        originIdx: idx,
        offsetX,
      };
      setDragState(state);
      setDragCurrentX(mouseXInTracks);

      const move = (ev: PointerEvent) => {
        const mx = ev.clientX - tracksRect.left;
        setDragCurrentX(mx);
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);

        // Compute final drop index
        const mx = ev.clientX - tracksRect.left;
        const ghostCenter = mx - offsetX + clip.w / 2;
        const currentShots = useCanvas.getState().nodes.find((n) => n.id === id)?.data.shots ?? shots;
        const currentLayout = layoutShots(currentShots);
        let dropIdx = currentShots.length; // default: end
        for (let i = 0; i < currentLayout.length; i++) {
          const midX = currentLayout[i].x + currentLayout[i].w / 2;
          if (ghostCenter < midX) {
            dropIdx = i;
            break;
          }
        }

        // Build new order
        const dragIdx = currentShots.findIndex((s) => s.id === shotId);
        if (dragIdx !== -1 && dropIdx !== dragIdx && dropIdx !== dragIdx + 1) {
          const ids = currentShots.map((s) => s.id);
          const [removed] = ids.splice(dragIdx, 1);
          const insertAt = dropIdx > dragIdx ? dropIdx - 1 : dropIdx;
          ids.splice(insertAt, 0, removed);
          reorderShots(id, ids);
        }

        setDragState(null);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [shots, id, pushHistory, reorderShots],
  );

  // Compute drop indicator position during drag
  const dropIndicatorX = (() => {
    if (!dragState) return null;
    const clip = layoutShots(shots)[dragState.originIdx];
    if (!clip) return null;
    const ghostCenter = dragCurrentX - dragState.offsetX + clip.w / 2;
    const layout = layoutShots(shots);
    for (let i = 0; i < layout.length; i++) {
      if (i === dragState.originIdx) continue;
      const midX = layout[i].x + layout[i].w / 2;
      if (ghostCenter < midX) {
        return layout[i].x;
      }
    }
    // After last clip
    const last = layout[layout.length - 1];
    return last ? last.x + last.w : TRACK_PAD_LEFT;
  })();

  /* ── Compute port positions (clip centers) ─────────────── */
  const portPositions = clips.map((c) => {
    const centerInNode = 24 + TRACK_LABEL_W + c.x + c.w / 2;
    return (centerInNode / NODE_W) * 100;
  });

  /* ── Drop zone position ────────────────────────────────── */
  const lastClip = clips[clips.length - 1];
  const dropX = lastClip ? lastClip.x + lastClip.w : TRACK_PAD_LEFT;

  const portColors = [COLORS.port1, COLORS.port2, COLORS.port3];

  return (
    <div
      className="rounded-3xl overflow-hidden fade-in"
      style={{
        width: NODE_W,
        background: COLORS.nodeBg,
        border: `2px solid ${COLORS.nodeBorder}`,
        boxShadow: "0 18px 36px rgba(152,162,179,0.12)",
      }}
    >
      {/* ── Input Ports (dynamic, aligned to clip centers) ── */}
      {clips.map((c, i) => (
        <Handle
          key={`port-${c.shot.id}`}
          type="target"
          position={Position.Top}
          id={c.shot.id}
          style={{
            left: `${portPositions[i]}%`,
            background: portColors[i % portColors.length],
            border: `3px solid ${portColors[i % portColors.length]}`,
            width: 14,
            height: 14,
          }}
        />
      ))}

      {/* ── Fallback target handle when no shots ── */}
      {clips.length === 0 && (
        <Handle
          type="target"
          position={Position.Top}
          id="default-target"
          style={{
            left: "50%",
            background: COLORS.port1,
            border: `3px solid ${COLORS.port1}`,
            width: 14,
            height: 14,
          }}
        />
      )}

      {/* ── Output Port ── */}
      <Handle type="source" position={Position.Right} style={{ background: COLORS.editorBg, border: `2px solid ${COLORS.editorBg}`, width: 20, height: 20 }} />

      {/* ── Header ── */}
      <div
        className="relative flex items-center"
        style={{
          height: HEADER_H,
          padding: "0 24px",
          background: COLORS.headerBg,
          borderBottom: `1px solid ${COLORS.headerBorder}`,
          borderRadius: "18px 18px 0 0",
        }}
      >
        <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: "#ECFDFF" }}>
          <Sparkles className="w-[18px] h-[18px]" style={{ color: "#0E7490" }} />
        </div>
        <div className="ml-3">
          <div className="text-lg font-semibold" style={{ color: COLORS.textPrimary, fontFamily: "Inter, system-ui" }}>
            {data.name ?? "时间线节点 1"}
          </div>
          <div className="text-[13px]" style={{ color: COLORS.textSecondary, fontFamily: "Inter, system-ui" }}>
            {connectedCount > 0
              ? `已连接 ${connectedCount} 个视频节点 · 输出 ${fmtSec(totalDuration)} 合成片段`
              : "还没有镜头"}
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (shots.length > 0) {
                setPreviewOpen(true);
                setCurrentTime(0);
                setPlaying(true);
              }
            }}
            className="flex items-center gap-2 rounded-xl text-sm font-medium"
            style={{ height: 36, padding: "0 14px", background: COLORS.editorBg, color: COLORS.textWhite }}
          >
            <Play className="w-4 h-4" />
            <span>预览</span>
          </button>
          <button
            className="flex items-center gap-2 rounded-xl text-sm font-medium"
            style={{ height: 36, padding: "0 14px", background: COLORS.textWhite, color: COLORS.textPrimary, border: `1px solid ${COLORS.headerBorder}` }}
          >
            <Download className="w-4 h-4" />
            <span>输出</span>
          </button>
          <button
            className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: COLORS.textWhite, border: `1px solid ${COLORS.headerBorder}` }}
          >
            <MoreHorizontal className="w-4 h-4" style={{ color: COLORS.textSecondary }} />
          </button>
        </div>
      </div>

      {/* ── Timeline Editor ── */}
      <div
        ref={editorRef}
        className="relative"
        style={{ height: EDITOR_H, margin: "0 24px 24px 24px", borderRadius: 18, background: COLORS.editorBg, overflow: "hidden" }}
      >
        {/* Track Labels */}
        <div
          className="absolute left-0 top-0"
          style={{ width: TRACK_LABEL_W, height: EDITOR_H, background: COLORS.trackLabelBg, borderRadius: "18px 0 0 18px", zIndex: 10 }}
        >
          <div className="flex items-center gap-[10px]" style={{ padding: "16px 16px" }}>
            <Scissors className="w-[18px] h-[18px]" style={{ color: COLORS.textTrackLabelDim }} />
            <Search className="w-[18px] h-[18px]" style={{ color: COLORS.textTrackLabelDim }} />
            <Magnet className="w-[18px] h-[18px]" style={{ color: COLORS.port1 }} />
          </div>
          {[
            { label: "V1 主视频", color: COLORS.textTrackLabel },
            { label: "V2 叠加", color: COLORS.textTrackLabelDim },
            { label: "A1 音频", color: COLORS.textTrackLabelDim },
          ].map((t, i) => (
            <div key={i}>
              <div className="absolute text-sm font-semibold" style={{ left: 20, top: RULER_H + i * TRACK_H + 24, color: t.color, fontFamily: "Inter, system-ui" }}>
                {t.label}
              </div>
              <Lock className="absolute w-4 h-4" style={{ left: 132, top: RULER_H + i * TRACK_H + 24, color: COLORS.textSecondary }} />
            </div>
          ))}
        </div>

        {/* Time Ruler */}
        <div className="absolute" style={{ left: TRACK_LABEL_W, top: 0, width: `calc(100% - ${TRACK_LABEL_W}px)`, height: RULER_H, background: COLORS.rulerBg }}>
          {TICKS.map((tick) => (
            <span key={tick.label + tick.x} className="absolute text-xs font-medium" style={{ left: tick.x, top: 16, color: COLORS.textLight, fontFamily: "Inter, monospace" }}>
              {tick.label}
            </span>
          ))}
        </div>

        {/* Tracks Canvas */}
        <div
          ref={tracksRef}
          className="absolute"
          style={{ left: TRACK_LABEL_W, top: RULER_H, width: `calc(100% - ${TRACK_LABEL_W}px)`, height: TRACKS_H }}
        >
          {/* Track row backgrounds */}
          <div className="absolute inset-0">
            <div style={{ height: TRACK_H, background: COLORS.trackRow1 }} />
            <div style={{ height: TRACK_H, background: COLORS.trackRow2 }} />
            <div style={{ height: TRACK_H, background: COLORS.trackRow3 }} />
            <div style={{ height: 48, background: COLORS.trackRow4 }} />
          </div>

          {/* Grid lines */}
          {GRID_LINES.map((x) => (
            <div key={x} className="absolute" style={{ left: x, top: 0, width: 1, height: TRACKS_H, background: COLORS.gridLine }} />
          ))}

          {/* ── V1 Clips from data.shots ── */}
          {clips.length === 0 ? (
            /* Empty state */
            <div
              className="absolute flex items-center justify-center gap-3 rounded-xl"
              style={{
                left: TRACK_PAD_LEFT,
                top: CLIP_Y,
                width: Math.min(600, CANVAS_W - 48),
                height: CLIP_H,
                background: COLORS.dropBg,
                border: `1.5px dashed ${COLORS.dropBorder}`,
              }}
            >
              <Plus className="w-[18px] h-[18px]" style={{ color: COLORS.textLight }} />
              <span className="text-[13px] font-semibold" style={{ color: COLORS.textLight, fontFamily: "Inter, system-ui" }}>
                还没有镜头，把素材拖到这里
              </span>
            </div>
          ) : (
            <>
              {clips.map((clip) => {
                const style = CLIP_STYLES[clip.shot.color] ?? CLIP_STYLES.gray;
                const startSec = (clip.x - TRACK_PAD_LEFT) / PX_PER_SEC;
                const endSec = startSec + clip.shot.duration;
                const timeLabel = `${fmtSec(startSec)} - ${fmtSec(endSec)}`;
                const isResizing = resizingShotId === clip.shot.id;
                const isDragging = dragState?.shotId === clip.shot.id;

                return (
                  <div
                    key={clip.shot.id}
                    className="absolute rounded-xl overflow-visible select-none"
                    style={{
                      left: clip.x,
                      top: CLIP_Y,
                      width: clip.w,
                      height: CLIP_H,
                      background: style.bg,
                      border: `2px solid ${style.border}`,
                      boxShadow: isResizing ? `0 0 0 2px ${style.border}40` : undefined,
                      opacity: isDragging ? 0.35 : 1,
                      cursor: dragState ? "grabbing" : "grab",
                    }}
                    onPointerDown={(e) => {
                      // Don't start drag if near edges (resize zones = 8px each side)
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
                        style={{ background: style.border }}
                      />
                    </div>

                    {/* Right resize handle */}
                    <div
                      onPointerDown={(e) => { e.stopPropagation(); handleResize(clip.shot.id, "right", e); }}
                      className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-10 group"
                    >
                      <div
                        className="absolute right-0 top-2 bottom-2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: style.border }}
                      />
                    </div>

                    {/* Thumbnail */}
                    {clip.shot.thumbnail ? (
                      <img
                        src={clip.shot.thumbnail}
                        alt=""
                        className="absolute rounded-lg object-cover"
                        style={{ left: 10, top: 10, width: 64, height: 32 }}
                        draggable={false}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : null}
                    <div className="absolute rounded-lg" style={{ left: 10, top: 10, width: 64, height: 32, background: style.thumbBg, zIndex: -1 }} />

                    {/* Title */}
                    <span
                      className="absolute text-[13px] font-bold truncate"
                      style={{ left: 84, top: 9, right: 12, color: COLORS.textWhite, fontFamily: "Inter, system-ui", whiteSpace: "nowrap" }}
                    >
                      {clip.shot.name}
                    </span>

                    {/* Time label */}
                    <span
                      className="absolute text-[11px] font-medium"
                      style={{ left: 84, top: 29, color: style.timeColor, fontFamily: "Inter, monospace" }}
                    >
                      {timeLabel}
                    </span>

                    {/* Duration tooltip while resizing */}
                    {isResizing && (
                      <div
                        className="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-mono px-2 py-0.5 rounded whitespace-nowrap"
                        style={{ background: style.bg, color: COLORS.textWhite, border: `1px solid ${style.border}` }}
                      >
                        {clip.shot.duration.toFixed(1)}s
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Drag ghost (follows mouse) ── */}
              {dragState && (() => {
                const dragIdx = shots.findIndex((s) => s.id === dragState.shotId);
                const clip = clips[dragIdx];
                if (!clip) return null;
                const style = CLIP_STYLES[clip.shot.color] ?? CLIP_STYLES.gray;
                const ghostLeft = dragCurrentX - dragState.offsetX;
                return (
                  <div
                    className="absolute rounded-xl overflow-hidden pointer-events-none"
                    style={{
                      left: ghostLeft,
                      top: CLIP_Y,
                      width: clip.w,
                      height: CLIP_H,
                      background: style.bg,
                      border: `2px solid ${style.border}`,
                      opacity: 0.8,
                      zIndex: 30,
                      boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
                    }}
                  >
                    <div className="absolute rounded-lg" style={{ left: 10, top: 10, width: 64, height: 32, background: style.thumbBg }} />
                    {clip.shot.thumbnail && (
                      <img src={clip.shot.thumbnail} alt="" className="absolute rounded-lg object-cover" style={{ left: 10, top: 10, width: 64, height: 32 }} draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                    <span className="absolute text-[13px] font-bold truncate" style={{ left: 84, top: 9, right: 12, color: COLORS.textWhite, fontFamily: "Inter, system-ui", whiteSpace: "nowrap" }}>
                      {clip.shot.name}
                    </span>
                  </div>
                );
              })()}

              {/* ── Drop indicator line ── */}
              {dragState && dropIndicatorX !== null && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: dropIndicatorX - 1.5,
                    top: 4,
                    width: 3,
                    height: CLIP_H + 12,
                    background: COLORS.playhead,
                    borderRadius: 2,
                    zIndex: 31,
                  }}
                />
              )}

              {/* ── Drop More Zone ── */}
              <div
                className="absolute flex items-center gap-[10px] rounded-xl drop-pulse"
                style={{
                  left: dropX,
                  top: CLIP_Y,
                  width: Math.max(200, Math.min(500, CANVAS_W - dropX - 20)),
                  height: CLIP_H,
                  padding: "0 18px",
                  background: COLORS.dropBg,
                  border: `1.5px dashed ${COLORS.dropBorder}`,
                }}
              >
                <Plus className="w-[18px] h-[18px]" style={{ color: COLORS.textLight }} />
                <span className="text-[13px] font-semibold" style={{ color: COLORS.textLight, fontFamily: "Inter, system-ui" }}>
                  拖入更多视频节点继续拼接
                </span>
              </div>
            </>
          )}

          {/* ── V2 Overlay Clips ── */}
          <div
            className="absolute flex items-center gap-[10px] rounded-[10px]"
            style={{ left: 570, top: TRACK_H + 14, width: 360, height: 42, padding: "0 14px", background: COLORS.overlayBg, border: `1px solid ${COLORS.overlayBorder}` }}
          >
            <Captions className="w-[18px] h-[18px]" style={{ color: "#E2E8F0" }} />
            <span className="text-[13px] font-semibold" style={{ color: "#F8FAFC", fontFamily: "Inter, system-ui" }}>字幕 / 贴纸叠加</span>
          </div>
          <div
            className="absolute flex items-center gap-[10px] rounded-[10px]"
            style={{ left: 1120, top: TRACK_H + 14, width: 300, height: 42, padding: "0 14px", background: COLORS.effectBg, border: `1px solid ${COLORS.effectBorder}` }}
          >
            <Sparkles className="w-[18px] h-[18px]" style={{ color: "#A5F3FC" }} />
            <span className="text-[13px] font-semibold" style={{ color: "#ECFEFF", fontFamily: "Inter, system-ui" }}>画面增强</span>
          </div>

          {/* ── A1 Audio Clip ── */}
          <div
            className="absolute rounded-[10px] overflow-hidden"
            style={{ left: 24, top: TRACK_H * 2 + 14, width: Math.min(1430, CANVAS_W - 48), height: 44, background: COLORS.audioBg, border: `1px solid ${COLORS.audioBorder}` }}
          >
            <Music className="absolute w-[18px] h-[18px]" style={{ left: 14, top: 13, color: "#FEF3C7" }} />
            <span className="absolute text-[13px] font-semibold" style={{ left: 42, top: 12, color: "#FFFBEB", fontFamily: "Inter, system-ui", whiteSpace: "nowrap" }}>
              背景音乐 · 自动贴合总时长
            </span>
            {WAVE_BARS.map((bar, i) => (
              <div key={i} className="absolute rounded-sm" style={{ left: bar.x, top: bar.y, width: 3, height: bar.h, background: COLORS.audioWave }} />
            ))}
          </div>
        </div>

        {/* ── Red Playhead ── */}
        <div className="absolute top-0 pointer-events-none" style={{ left: playheadX, width: 2, height: EDITOR_H, background: COLORS.playhead, zIndex: 20 }} />
        <div
          className="absolute flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing"
          style={{ left: playheadX - 19, top: 4, width: 38, height: 22, background: COLORS.playhead, zIndex: 21 }}
          onPointerDown={handlePlayheadDrag}
        >
          <span className="text-[11px] font-bold" style={{ color: COLORS.textWhite, fontFamily: "Inter, monospace" }}>
            {fmtSec(currentTime)}
          </span>
        </div>
      </div>

      {/* ── Floating Preview Window (portal to body) ── */}
      {previewOpen && createPortal(
        <PreviewWindow
          shots={shots}
          currentTime={currentTime}
          totalDuration={totalDuration}
          playing={playing}
          timelineName={data.name ?? "时间线"}
          onClose={() => { setPreviewOpen(false); setPlaying(false); }}
          onTogglePlay={() => {
            if (!playing && currentTime >= totalDuration) setCurrentTime(0);
            setPlaying((p) => !p);
          }}
          fmtSec={fmtSec}
        />,
        document.body,
      )}
    </div>
  );
}

/* ── Preview Window Component ──────────────────────────────── */
function PreviewWindow({
  shots,
  currentTime,
  totalDuration,
  playing,
  timelineName,
  onClose,
  onTogglePlay,
  fmtSec,
}: {
  shots: Shot[];
  currentTime: number;
  totalDuration: number;
  playing: boolean;
  timelineName: string;
  onClose: () => void;
  onTogglePlay: () => void;
  fmtSec: (s: number) => string;
}) {
  // Find which shot is currently playing
  let elapsed = 0;
  let activeShot: Shot | null = null;
  for (const shot of shots) {
    if (currentTime < elapsed + shot.duration) {
      activeShot = shot;
      break;
    }
    elapsed += shot.duration;
  }
  if (!activeShot && shots.length > 0) activeShot = shots[shots.length - 1];

  const activeStyle = activeShot ? (CLIP_STYLES[activeShot.color] ?? CLIP_STYLES.gray) : CLIP_STYLES.gray;
  const progress = totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0;

  return (
    <div
      className="fixed z-50 fade-in"
      style={{
        top: 80,
        right: 32,
        width: 480,
        borderRadius: 20,
        background: "#0F172A",
        boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "12px 16px", background: "#1E293B" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#22D3EE" }} />
          <span className="text-[13px] font-semibold" style={{ color: "#F1F5F9", fontFamily: "Inter, system-ui" }}>
            {timelineName} · 预览
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg hover:bg-white/10"
            style={{ width: 28, height: 28 }}
          >
            <X className="w-4 h-4" style={{ color: "#94A3B8" }} />
          </button>
        </div>
      </div>

      {/* Video area */}
      <div className="relative" style={{ height: 270, background: "#000" }}>
        {activeShot?.thumbnail ? (
          <img
            src={activeShot.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : null}
        {/* Dark overlay with shot info */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Center play/pause button */}
        {!playing && (
          <button
            onClick={onTogglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <Play className="w-8 h-8 text-white ml-1" />
          </button>
        )}

        {/* Current shot label */}
        {activeShot && (
          <div
            className="absolute bottom-3 left-4 flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full" style={{ background: activeStyle.border }} />
            <span className="text-[12px] font-medium" style={{ color: "#E2E8F0", fontFamily: "Inter, system-ui" }}>
              {activeShot.name}
            </span>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div
        className="flex items-center gap-3"
        style={{ padding: "10px 16px", background: "#1E293B" }}
      >
        <button
          onClick={onTogglePlay}
          className="flex items-center justify-center rounded-lg hover:bg-white/10"
          style={{ width: 32, height: 32 }}
        >
          {playing ? (
            <Pause className="w-4 h-4" style={{ color: "#F1F5F9" }} />
          ) : (
            <Play className="w-4 h-4" style={{ color: "#F1F5F9" }} />
          )}
        </button>

        <span className="text-[12px] font-mono" style={{ color: "#94A3B8", minWidth: 42 }}>
          {fmtSec(currentTime)}
        </span>

        {/* Progress bar */}
        <div
          className="flex-1 h-1.5 rounded-full cursor-pointer"
          style={{ background: "#334155" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg, #22D3EE, #14B8A6)",
              transition: playing ? "width 0.1s linear" : "none",
            }}
          />
        </div>

        <span className="text-[12px] font-mono" style={{ color: "#94A3B8", minWidth: 42 }}>
          {fmtSec(totalDuration)}
        </span>
      </div>

      {/* Shot strips */}
      <div
        className="flex gap-1"
        style={{ padding: "0 16px 12px 16px" }}
      >
        {shots.map((shot) => {
          const style = CLIP_STYLES[shot.color] ?? CLIP_STYLES.gray;
          const widthPct = totalDuration > 0 ? (shot.duration / totalDuration) * 100 : 0;
          const isActive = shot.id === activeShot?.id;
          return (
            <div
              key={shot.id}
              className="rounded-sm"
              style={{
                width: `${widthPct}%`,
                height: 4,
                background: style.border,
                opacity: isActive ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
