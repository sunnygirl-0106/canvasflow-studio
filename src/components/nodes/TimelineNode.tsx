import { useEffect, useRef, useState, useCallback } from "react";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import { useCanvas, type CanvasNode } from "@/store/canvasStore";
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
} from "lucide-react";

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

/* ── Clip style definitions ────────────────────────────────── */
const CLIP_STYLES = [
  { bg: "#0E7490", border: "#67E8F9", thumbBg: "#155E75", timeColor: "#CFFAFE" },
  { bg: "#5B21B6", border: "#A78BFA", thumbBg: "#6D28D9", timeColor: "#EDE9FE" },
  { bg: "#C2410C", border: "#FDBA74", thumbBg: "#9A3412", timeColor: "#FFEDD5" },
];

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

/* ── Clip data (only width matters, x is derived) ──────────── */
interface ClipDef {
  id: string;
  title: string;
  durationSec: number; // duration in seconds
  styleIdx: number;
}

const INITIAL_CLIPS: ClipDef[] = [
  { id: "clip1", title: "视频节点 7 · 开场", durationSec: 11, styleIdx: 0 },
  { id: "clip2", title: "视频节点 7 · 主场景", durationSec: 15, styleIdx: 1 },
  { id: "clip3", title: "视频节点 7 · 收束", durationSec: 13, styleIdx: 2 },
];

const TRACK_PAD_LEFT = 24; // left padding inside tracks canvas
const MIN_DURATION_SEC = 2; // minimum clip duration

/* ── Helpers ───────────────────────────────────────────────── */
function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Compute x positions from durations — clips always sit flush */
function layoutClips(clips: ClipDef[]) {
  let cursor = TRACK_PAD_LEFT;
  return clips.map((c) => {
    const x = cursor;
    const w = c.durationSec * PX_PER_SEC;
    cursor += w;
    return { ...c, x, w };
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

export function TimelineNode({ id, data }: { id: string; data: CanvasNode["data"] }) {
  const [clipDefs, setClipDefs] = useState<ClipDef[]>(INITIAL_CLIPS);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(19);
  const [resizingClipId, setResizingClipId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const updateNodeInternals = useUpdateNodeInternals();

  // Derived: compute positions from durations (always flush)
  const clips = layoutClips(clipDefs);
  const totalDuration = clipDefs.reduce((sum, c) => sum + c.durationSec, 0);

  // Update React Flow handle positions when clips change
  useEffect(() => {
    updateNodeInternals(id);
  }, [clipDefs, id, updateNodeInternals]);

  // Playback
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setCurrentTime((t) => {
        if (t >= totalDuration) {
          setPlaying(false);
          return 0;
        }
        return t + 0.1;
      });
    }, 100);
    return () => clearInterval(iv);
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
    (clipId: string, edge: "left" | "right", e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizingClipId(clipId);

      const startMouseX = e.clientX;
      const idx = clipDefs.findIndex((c) => c.id === clipId);
      const startDuration = clipDefs[idx].durationSec;

      const move = (ev: PointerEvent) => {
        const deltaPx = ev.clientX - startMouseX;
        const deltaSec = deltaPx / PX_PER_SEC;

        let newDuration: number;
        if (edge === "right") {
          // drag right edge → duration changes directly
          newDuration = Math.max(MIN_DURATION_SEC, startDuration + deltaSec);
        } else {
          // drag left edge → shrink from left (duration decreases when dragging right)
          newDuration = Math.max(MIN_DURATION_SEC, startDuration - deltaSec);
        }

        setClipDefs((prev) =>
          prev.map((c) => (c.id === clipId ? { ...c, durationSec: Math.round(newDuration * 10) / 10 } : c)),
        );
      };
      const up = () => {
        setResizingClipId(null);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [clipDefs],
  );

  /* ── Compute port positions (clip centers) ─────────────── */
  const portPositions = clips.map((c) => {
    const centerInNode = 24 + TRACK_LABEL_W + c.x + c.w / 2;
    return (centerInNode / NODE_W) * 100;
  });

  /* ── Drop zone position ────────────────────────────────── */
  const lastClip = clips[clips.length - 1];
  const dropX = lastClip ? lastClip.x + lastClip.w : 24;

  const shots = data.shots ?? [];
  const connectedCount = shots.filter((s) => s.bindings.length > 0).length || 3;

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
      {clips.map((_, i) => (
        <Handle
          key={`port-${i + 1}`}
          type="target"
          position={Position.Top}
          id={`port-${i + 1}`}
          style={{
            left: `${portPositions[i]}%`,
            background: [COLORS.port1, COLORS.port2, COLORS.port3][i],
            border: `3px solid ${[COLORS.port1, COLORS.port2, COLORS.port3][i]}`,
            width: 14,
            height: 14,
          }}
        />
      ))}

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
            已连接 {connectedCount} 个视频节点 · 输出 {fmtSec(totalDuration)} 合成片段
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setCurrentTime(0); setPlaying((p) => !p); }}
            className="flex items-center gap-2 rounded-xl text-sm font-medium"
            style={{ height: 36, padding: "0 14px", background: COLORS.editorBg, color: COLORS.textWhite }}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{playing ? "暂停" : "预览"}</span>
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

          {/* ── V1 Clips (interactive) ── */}
          {clips.map((clip) => {
            const style = CLIP_STYLES[clip.styleIdx];
            // compute time range from position
            const startSec = (clip.x - TRACK_PAD_LEFT) / PX_PER_SEC;
            const endSec = startSec + clip.durationSec;
            const timeLabel = `${fmtSec(startSec)} - ${fmtSec(endSec)}`;
            const isResizing = resizingClipId === clip.id;

            return (
              <div
                key={clip.id}
                className="absolute rounded-xl overflow-visible select-none"
                style={{
                  left: clip.x,
                  top: CLIP_Y,
                  width: clip.w,
                  height: CLIP_H,
                  background: style.bg,
                  border: `2px solid ${style.border}`,
                  boxShadow: isResizing ? `0 0 0 2px ${style.border}40` : undefined,
                }}
              >
                {/* Left resize handle */}
                <div
                  onPointerDown={(e) => handleResize(clip.id, "left", e)}
                  className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-10 group"
                >
                  <div
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: style.border }}
                  />
                </div>

                {/* Right resize handle */}
                <div
                  onPointerDown={(e) => handleResize(clip.id, "right", e)}
                  className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-10 group"
                >
                  <div
                    className="absolute right-0 top-2 bottom-2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: style.border }}
                  />
                </div>

                {/* Thumbnail */}
                <div className="absolute rounded-lg" style={{ left: 10, top: 10, width: 64, height: 32, background: style.thumbBg }} />

                {/* Title */}
                <span
                  className="absolute text-[13px] font-bold truncate"
                  style={{ left: 84, top: 9, right: 12, color: COLORS.textWhite, fontFamily: "Inter, system-ui", whiteSpace: "nowrap" }}
                >
                  {clip.title}
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
                    {clip.durationSec.toFixed(1)}s
                  </div>
                )}
              </div>
            );
          })}

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
    </div>
  );
}
