import { useEffect, useRef, useState, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
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
  Blend,
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
  // clip colours
  clip1Bg: "#0E7490",
  clip1Border: "#67E8F9",
  clip1Thumb: "#155E75",
  clip1Time: "#CFFAFE",
  clip2Bg: "#5B21B6",
  clip2Border: "#A78BFA",
  clip2Thumb: "#6D28D9",
  clip2Time: "#EDE9FE",
  clip3Bg: "#C2410C",
  clip3Border: "#FDBA74",
  clip3Thumb: "#9A3412",
  clip3Time: "#FFEDD5",
  // overlay
  overlayBg: "#334155",
  overlayBorder: "#64748B",
  effectBg: "#164E63",
  effectBorder: "#22D3EE",
  // audio
  audioBg: "#713F12",
  audioBorder: "#FBBF24",
  audioWave: "#FDE68A",
  // drop zone
  dropBg: "#1F2937",
  dropBorder: "#475467",
  // transition
  transitionBg: "#FFFFFF",
  transitionBorder: "#D0D5DD",
  // ports
  port1: "#56C7CF",
  port2: "#7C3AED",
  port3: "#F97316",
  // text
  textPrimary: "#101828",
  textSecondary: "#667085",
  textLight: "#98A2B3",
  textWhite: "#FFFFFF",
  textTrackLabel: "#F9FAFB",
  textTrackLabelDim: "#D0D5DD",
};

/* ── Time ruler ticks ──────────────────────────────────────── */
const TICKS = [
  { label: "00:00", x: 20 },
  { label: "00:08", x: 310 },
  { label: "00:16", x: 610 },
  { label: "00:24", x: 910 },
  { label: "00:32", x: 1210 },
  { label: "00:40", x: 1510 },
];

const GRID_LINES = [350, 650, 950, 1250, 1550];

/* ── Video clips on V1 ─────────────────────────────────────── */
const V1_CLIPS = [
  {
    id: "clip1",
    title: "视频节点 7 · 开场",
    time: "00:00 - 00:11",
    x: 24,
    w: 420,
    bg: COLORS.clip1Bg,
    border: COLORS.clip1Border,
    thumbBg: COLORS.clip1Thumb,
    timeColor: COLORS.clip1Time,
  },
  {
    id: "clip2",
    title: "视频节点 7 · 主场景",
    time: "00:11 - 00:26",
    x: 460,
    w: 560,
    bg: COLORS.clip2Bg,
    border: COLORS.clip2Border,
    thumbBg: COLORS.clip2Thumb,
    timeColor: COLORS.clip2Time,
  },
  {
    id: "clip3",
    title: "视频节点 7 · 收束",
    time: "00:26 - 00:39",
    x: 1040,
    w: 490,
    bg: COLORS.clip3Bg,
    border: COLORS.clip3Border,
    thumbBg: COLORS.clip3Thumb,
    timeColor: COLORS.clip3Time,
  },
];

const TRANSITIONS = [
  { x: 428, y: 20 },
  { x: 1008, y: 20 },
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

/* ── Dimensions from design ────────────────────────────────── */
const NODE_W = 1800;
const HEADER_H = 58;
const EDITOR_H = 312;
const TRACK_LABEL_W = 178;
const RULER_H = 48;
const TRACK_H = 72;
const TRACKS_H = 264;
const CANVAS_W = NODE_W - 48 - TRACK_LABEL_W; // tracks canvas width

export function TimelineNode({ id, data }: { id: string; data: CanvasNode["data"] }) {
  const totalDuration = 46; // 00:46
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(19); // 00:19 default
  const [draggingHead, setDraggingHead] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const pxPerSec = CANVAS_W / 56; // 56 seconds visible range

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

  const playheadX = TRACK_LABEL_W + currentTime * pxPerSec;

  const fmtSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handlePlayheadDrag = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setDraggingHead(true);
      const rect = editorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const update = (clientX: number) => {
        const relX = clientX - rect.left - TRACK_LABEL_W;
        const t = Math.max(0, Math.min(totalDuration, relX / pxPerSec));
        setCurrentTime(Math.round(t * 10) / 10);
      };

      update(e.clientX);

      const move = (ev: PointerEvent) => update(ev.clientX);
      const up = () => {
        setDraggingHead(false);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [pxPerSec, totalDuration],
  );

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
      {/* ── Input Ports ── */}
      <Handle type="target" position={Position.Top} id="port-1" style={{ left: "20%", background: COLORS.port1, border: `3px solid ${COLORS.port1}`, width: 14, height: 14 }} />
      <Handle type="target" position={Position.Top} id="port-2" style={{ left: "50%", background: COLORS.port2, border: `3px solid ${COLORS.port2}`, width: 14, height: 14 }} />
      <Handle type="target" position={Position.Top} id="port-3" style={{ left: "80%", background: COLORS.port3, border: `3px solid ${COLORS.port3}`, width: 14, height: 14 }} />

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
        {/* Icon */}
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 36, height: 36, background: "#ECFDFF" }}
        >
          <Sparkles className="w-[18px] h-[18px]" style={{ color: "#0E7490" }} />
        </div>

        {/* Title + Subtitle */}
        <div className="ml-3">
          <div className="text-lg font-semibold" style={{ color: COLORS.textPrimary, fontFamily: "Inter, system-ui" }}>
            {data.name ?? "时间线节点 1"}
          </div>
          <div className="text-[13px]" style={{ color: COLORS.textSecondary, fontFamily: "Inter, system-ui" }}>
            已连接 {connectedCount} 个视频节点 · 输出 {fmtSec(totalDuration)} 合成片段
          </div>
        </div>

        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCurrentTime(0);
              setPlaying((p) => !p);
            }}
            className="flex items-center gap-2 rounded-xl text-sm font-medium"
            style={{
              height: 36,
              padding: "0 14px",
              background: COLORS.editorBg,
              color: COLORS.textWhite,
            }}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{playing ? "暂停" : "预览"}</span>
          </button>

          <button
            className="flex items-center gap-2 rounded-xl text-sm font-medium"
            style={{
              height: 36,
              padding: "0 14px",
              background: COLORS.textWhite,
              color: COLORS.textPrimary,
              border: `1px solid ${COLORS.headerBorder}`,
            }}
          >
            <Download className="w-4 h-4" />
            <span>输出</span>
          </button>

          <button
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 36,
              height: 36,
              background: COLORS.textWhite,
              border: `1px solid ${COLORS.headerBorder}`,
            }}
          >
            <MoreHorizontal className="w-4 h-4" style={{ color: COLORS.textSecondary }} />
          </button>
        </div>
      </div>

      {/* ── Timeline Editor ── */}
      <div
        ref={editorRef}
        className="relative"
        style={{
          height: EDITOR_H,
          margin: "0 24px 24px 24px",
          borderRadius: 18,
          background: COLORS.editorBg,
          overflow: "hidden",
        }}
      >
        {/* Track Labels */}
        <div
          className="absolute left-0 top-0"
          style={{
            width: TRACK_LABEL_W,
            height: EDITOR_H,
            background: COLORS.trackLabelBg,
            borderRadius: "18px 0 0 18px",
            zIndex: 10,
          }}
        >
          {/* Tools row */}
          <div className="flex items-center gap-[10px]" style={{ padding: "16px 16px" }}>
            <Scissors className="w-[18px] h-[18px]" style={{ color: COLORS.textTrackLabelDim }} />
            <Search className="w-[18px] h-[18px]" style={{ color: COLORS.textTrackLabelDim }} />
            <Magnet className="w-[18px] h-[18px]" style={{ color: COLORS.port1 }} />
          </div>

          {/* Track labels */}
          {[
            { label: "V1 主视频", y: 72, color: COLORS.textTrackLabel },
            { label: "V2 叠加", y: 143, color: COLORS.textTrackLabelDim },
            { label: "A1 音频", y: 143 + 71, color: COLORS.textTrackLabelDim },
          ].map((t, i) => (
            <div key={i}>
              <div
                className="absolute text-sm font-semibold"
                style={{
                  left: 20,
                  top: RULER_H + i * TRACK_H + 24,
                  color: t.color,
                  fontFamily: "Inter, system-ui",
                }}
              >
                {t.label}
              </div>
              <Lock
                className="absolute w-4 h-4"
                style={{
                  left: 132,
                  top: RULER_H + i * TRACK_H + 24,
                  color: COLORS.textSecondary,
                }}
              />
            </div>
          ))}
        </div>

        {/* Time Ruler */}
        <div
          className="absolute"
          style={{
            left: TRACK_LABEL_W,
            top: 0,
            width: `calc(100% - ${TRACK_LABEL_W}px)`,
            height: RULER_H,
            background: COLORS.rulerBg,
          }}
        >
          {TICKS.map((tick) => (
            <span
              key={tick.label}
              className="absolute text-xs font-medium"
              style={{
                left: tick.x,
                top: 16,
                color: COLORS.textLight,
                fontFamily: "Inter, monospace",
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        {/* Tracks Canvas */}
        <div
          className="absolute"
          style={{
            left: TRACK_LABEL_W,
            top: RULER_H,
            width: `calc(100% - ${TRACK_LABEL_W}px)`,
            height: TRACKS_H,
          }}
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
            <div
              key={x}
              className="absolute"
              style={{
                left: x,
                top: 0,
                width: 1,
                height: TRACKS_H,
                background: COLORS.gridLine,
              }}
            />
          ))}

          {/* ── V1 Clips ── */}
          {V1_CLIPS.map((clip) => (
            <div
              key={clip.id}
              className="absolute rounded-xl overflow-hidden"
              style={{
                left: clip.x,
                top: 10,
                width: clip.w,
                height: 52,
                background: clip.bg,
                border: `2px solid ${clip.border}`,
              }}
            >
              {/* Thumbnail */}
              <div
                className="absolute rounded-lg"
                style={{
                  left: 10,
                  top: 10,
                  width: 64,
                  height: 32,
                  background: clip.thumbBg,
                }}
              />
              {/* Title */}
              <span
                className="absolute text-[13px] font-bold"
                style={{
                  left: 84,
                  top: 9,
                  color: COLORS.textWhite,
                  fontFamily: "Inter, system-ui",
                  whiteSpace: "nowrap",
                }}
              >
                {clip.title}
              </span>
              {/* Time */}
              <span
                className="absolute text-[11px] font-medium"
                style={{
                  left: 84,
                  top: 29,
                  color: clip.timeColor,
                  fontFamily: "Inter, monospace",
                }}
              >
                {clip.time}
              </span>
            </div>
          ))}

          {/* ── Transitions ── */}
          {TRANSITIONS.map((tr, i) => (
            <div
              key={i}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                left: tr.x,
                top: tr.y,
                width: 32,
                height: 32,
                background: COLORS.transitionBg,
                border: `1px solid ${COLORS.transitionBorder}`,
                zIndex: 5,
              }}
            >
              <Blend className="w-4 h-4" style={{ color: "#344054" }} />
            </div>
          ))}

          {/* ── Drop More Zone ── */}
          <div
            className="absolute flex items-center gap-[10px] rounded-xl"
            style={{
              left: 1560,
              top: 10,
              width: Math.min(500, CANVAS_W - 1560 - 20),
              height: 52,
              padding: "0 18px",
              background: COLORS.dropBg,
              border: `1px solid ${COLORS.dropBorder}`,
            }}
          >
            <Plus className="w-[18px] h-[18px]" style={{ color: COLORS.textLight }} />
            <span
              className="text-[13px] font-semibold"
              style={{ color: COLORS.textLight, fontFamily: "Inter, system-ui" }}
            >
              拖入更多视频节点继续拼接
            </span>
          </div>

          {/* ── V2 Overlay Clips ── */}
          <div
            className="absolute flex items-center gap-[10px] rounded-[10px]"
            style={{
              left: 570,
              top: TRACK_H + 14,
              width: 360,
              height: 42,
              padding: "0 14px",
              background: COLORS.overlayBg,
              border: `1px solid ${COLORS.overlayBorder}`,
            }}
          >
            <Captions className="w-[18px] h-[18px]" style={{ color: "#E2E8F0" }} />
            <span className="text-[13px] font-semibold" style={{ color: "#F8FAFC", fontFamily: "Inter, system-ui" }}>
              字幕 / 贴纸叠加
            </span>
          </div>

          <div
            className="absolute flex items-center gap-[10px] rounded-[10px]"
            style={{
              left: 1120,
              top: TRACK_H + 14,
              width: 300,
              height: 42,
              padding: "0 14px",
              background: COLORS.effectBg,
              border: `1px solid ${COLORS.effectBorder}`,
            }}
          >
            <Sparkles className="w-[18px] h-[18px]" style={{ color: "#A5F3FC" }} />
            <span className="text-[13px] font-semibold" style={{ color: "#ECFEFF", fontFamily: "Inter, system-ui" }}>
              画面增强
            </span>
          </div>

          {/* ── A1 Audio Clip ── */}
          <div
            className="absolute rounded-[10px] overflow-hidden"
            style={{
              left: 24,
              top: TRACK_H * 2 + 14,
              width: Math.min(1430, CANVAS_W - 48),
              height: 44,
              background: COLORS.audioBg,
              border: `1px solid ${COLORS.audioBorder}`,
            }}
          >
            <Music
              className="absolute w-[18px] h-[18px]"
              style={{ left: 14, top: 13, color: "#FEF3C7" }}
            />
            <span
              className="absolute text-[13px] font-semibold"
              style={{
                left: 42,
                top: 12,
                color: "#FFFBEB",
                fontFamily: "Inter, system-ui",
                whiteSpace: "nowrap",
              }}
            >
              背景音乐 · 自动贴合总时长
            </span>
            {/* Waveform bars */}
            {WAVE_BARS.map((bar, i) => (
              <div
                key={i}
                className="absolute rounded-sm"
                style={{
                  left: bar.x,
                  top: bar.y,
                  width: 3,
                  height: bar.h,
                  background: COLORS.audioWave,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Red Playhead ── */}
        <div
          className="absolute top-0 pointer-events-none"
          style={{
            left: playheadX,
            width: 2,
            height: EDITOR_H,
            background: COLORS.playhead,
            zIndex: 20,
          }}
        />
        {/* Playhead knob */}
        <div
          className="absolute flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing"
          style={{
            left: playheadX - 19,
            top: 4,
            width: 38,
            height: 22,
            background: COLORS.playhead,
            zIndex: 21,
          }}
          onPointerDown={handlePlayheadDrag}
        >
          <span
            className="text-[11px] font-bold"
            style={{ color: COLORS.textWhite, fontFamily: "Inter, monospace" }}
          >
            {fmtSec(currentTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
