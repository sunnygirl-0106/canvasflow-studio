import { useCallback, useMemo, useRef, useState } from "react";
import { Plus, Volume2, VolumeX, Play, Music } from "lucide-react";
import {
  useCanvas,
  compDuration,
  clipEnd,
  MAX_VIDEO_TRACKS,
  type Track,
  type Clip,
} from "@/store/canvasStore";
import { CLIP_STYLES } from "@/lib/clipStyles";
import { fmtSec, fmtTimecode } from "@/lib/time";

/* ── Dimensions ───────────────────────────────────────────── */
const RULER_H = 28;
const TRACK_H = 68;
const CLIP_H = 52;
const CLIP_Y = 8;
const TRACK_PAD_LEFT = 16;
const SIDEBAR_W = 84;
const MIN_DURATION_SEC = 0.5;
const TRACKS_MAX_H = 3 * TRACK_H + 8; // vertical scroll kicks in beyond this
const SNAP_PX = 8; // edge/playhead snap threshold

// Faux waveform pattern for audio clips (demo — no real decoding).
const WAVE = [4, 9, 14, 7, 18, 11, 22, 8, 13, 19, 6, 15, 24, 10, 17, 5, 12, 20, 9, 16];

/* ── Helpers ──────────────────────────────────────────────── */
const clipX = (c: Clip, pxPerSec: number) => TRACK_PAD_LEFT + c.startSec * pxPerSec;
const clipW = (c: Clip, pxPerSec: number) => c.duration * pxPerSec;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Video tracks first (V1, V2…), then audio tracks (A1, A2…). */
function orderTracks(tracks: Track[]): Track[] {
  const vids = tracks
    .filter((t) => t.kind === "video")
    .sort((a, b) => a.name.localeCompare(b.name));
  const auds = tracks
    .filter((t) => t.kind === "audio")
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...vids, ...auds];
}

function findClipById(tracks: Track[], id: string): Clip | null {
  for (const t of tracks) {
    const c = t.clips.find((c) => c.id === id);
    if (c) return c;
  }
  return null;
}

/**
 * Snap a desired start so `clip` fits a free slot on `track` (decision #5: same-track
 * no overlap). Returns the nearest non-overlapping start, or null if nothing fits.
 */
function findFreeStart(track: Track, clip: Clip, desired: number): number | null {
  const dur = clip.duration;
  const others = track.clips
    .filter((c) => c.id !== clip.id)
    .sort((a, b) => a.startSec - b.startSec);
  const free = (s: number) =>
    s >= -1e-6 && others.every((o) => s + dur <= o.startSec + 1e-6 || s >= clipEnd(o) - 1e-6);
  if (free(desired)) return Math.max(0, round1(desired));

  const gaps: [number, number][] = [];
  let cursor = 0;
  for (const o of others) {
    if (o.startSec - cursor >= dur - 1e-6) gaps.push([cursor, o.startSec]);
    cursor = Math.max(cursor, clipEnd(o));
  }
  gaps.push([cursor, Infinity]); // open gap after the last clip

  let best: number | null = null;
  let bestDist = Infinity;
  for (const [gs, ge] of gaps) {
    const maxStart = ge === Infinity ? Infinity : ge - dur;
    if (maxStart < gs - 1e-6) continue;
    const cand =
      ge === Infinity ? Math.max(desired, gs) : Math.min(Math.max(desired, gs), maxStart);
    const d = Math.abs(cand - desired);
    if (d < bestDist) {
      bestDist = d;
      best = Math.max(0, round1(cand));
    }
  }
  return best;
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

function buildSubTicks(pxPerSec: number, totalWidth: number) {
  const ticks: { x: number }[] = [];
  const maxSec = totalWidth / pxPerSec;
  const interval = pxPerSec >= 40 ? 4 : pxPerSec >= 20 ? 8 : 16;
  for (let s = 0; s <= maxSec; s += 1) {
    if (s % interval !== 0) {
      ticks.push({ x: s * pxPerSec + TRACK_PAD_LEFT });
    }
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
  clipId: string;
  sourceTrackId: string;
  offsetX: number; // pointer offset within clip, in lane coords (px)
}
interface DragPos {
  laneX: number; // px, sidebar-relative
  contentY: number; // px, content-relative (0 = ruler top)
}

/** Where a dragged clip would land. */
type DropDecision =
  | { action: "move"; trackId: string; startSec: number; previewIdx: number }
  | { action: "createV2"; startSec: number; previewIdx: number }
  | { action: "createAudio"; startSec: number; previewIdx: number }
  | {
      action: "reject";
      reason: "max-video" | "nofit";
      startSec: number;
      previewIdx: number;
    };

/* ── Component ────────────────────────────────────────────── */
interface Props {
  compId: string;
  tracks: Track[];
  currentTime: number;
  pxPerSec: number;
  selectedClipId: string | null;
  onSeek: (t: number) => void;
  muted: boolean;
  onToggleMute: () => void;
  dark?: boolean;
}

export function TrackTimeline({
  compId,
  tracks,
  currentTime,
  pxPerSec,
  selectedClipId,
  onSeek,
  muted,
  onToggleMute,
  dark,
}: Props) {
  const updateClip = useCanvas((s) => s.updateClip);
  const moveClip = useCanvas((s) => s.moveClip);
  const addVideoTrack = useCanvas((s) => s.addVideoTrack);
  const addAudioTrack = useCanvas((s) => s.addAudioTrack);
  const toggleClipMute = useCanvas((s) => s.toggleClipMute);
  const pushHistory = useCanvas((s) => s.pushHistory);
  const selectClip = useCanvas((s) => s.selectClip);

  const containerRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resizingClipId, setResizingClipId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState<DragPos | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /* ── Derived layout ──────────────────────────────────────── */
  const ordered = useMemo(() => orderTracks(tracks), [tracks]);
  const videoTrackCount = useMemo(() => tracks.filter((t) => t.kind === "video").length, [tracks]);

  const contentWidth = useMemo(() => {
    const dur = compDuration(tracks);
    return Math.max(dur * pxPerSec + 200, 600);
  }, [tracks, pxPerSec]);

  const ticks = useMemo(() => buildTicks(pxPerSec, contentWidth), [pxPerSec, contentWidth]);
  const subTicks = useMemo(() => buildSubTicks(pxPerSec, contentWidth), [pxPerSec, contentWidth]);
  const gridLines = useMemo(() => buildGridLines(pxPerSec, contentWidth), [pxPerSec, contentWidth]);

  const isDraggingAudio = dragState
    ? findClipById(tracks, dragState.clipId)?.clipKind === "audio"
    : false;
  const tracksTotalH = ordered.length * TRACK_H + (isDraggingAudio ? TRACK_H : 0);
  const playheadX = SIDEBAR_W + TRACK_PAD_LEFT + currentTime * pxPerSec;

  /** Detect gaps in video tracks */
  const hasVideoGap = useMemo(() => {
    for (const t of tracks) {
      if (t.kind !== "video" || t.clips.length < 2) continue;
      const sorted = [...t.clips].sort((a, b) => a.startSec - b.startSec);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startSec > clipEnd(sorted[i - 1]) + 0.05) return true;
      }
    }
    return false;
  }, [tracks]);

  /* ── Pointer → timeline coordinates ──────────────────────── */
  const laneXFromEvent = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    return clientX - rect.left + container.scrollLeft - SIDEBAR_W;
  }, []);
  const contentYFromEvent = useCallback((clientY: number) => {
    const container = containerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    return clientY - rect.top + container.scrollTop;
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  /* ── Snap a raw second value to 0 / playhead / clip edges ── */
  const snapStart = useCallback(
    (raw: number, target: Track | undefined, clipId: string) => {
      const desired = round1(raw);
      const cands = [0, currentTime];
      if (target) {
        for (const o of target.clips) {
          if (o.id === clipId) continue;
          cands.push(o.startSec, clipEnd(o));
        }
      }
      let best = desired;
      let bestPx = SNAP_PX;
      for (const c of cands) {
        const dpx = Math.abs(c - desired) * pxPerSec;
        if (dpx < bestPx) {
          bestPx = dpx;
          best = c;
        }
      }
      return round1(best);
    },
    [currentTime, pxPerSec],
  );

  /* ── Resolve a drop: target track (by y) + start (by x) ──── */
  const computeDrop = useCallback(
    (clip: Clip, laneX: number, contentY: number, offsetX: number): DropDecision => {
      const rawStart = (laneX - offsetX - TRACK_PAD_LEFT) / pxPerSec;
      const hoverIdx = Math.floor((contentY - RULER_H) / TRACK_H);
      const target = hoverIdx >= 0 && hoverIdx < ordered.length ? ordered[hoverIdx] : undefined;
      const clampHover = Math.min(Math.max(hoverIdx, 0), Math.max(ordered.length - 1, 0));

      if (clip.clipKind === "video") {
        if (target && target.kind === "video") {
          const start = snapStart(rawStart, target, clip.id);
          const s = findFreeStart(target, clip, Math.max(0, start));
          if (s == null)
            return {
              action: "reject",
              reason: "nofit",
              startSec: Math.max(0, start),
              previewIdx: hoverIdx,
            };
          return {
            action: "move",
            trackId: target.id,
            startSec: s,
            previewIdx: hoverIdx,
          };
        }
        // not over a video track → auto-create V2 (decision #3) if there is room
        if (videoTrackCount < MAX_VIDEO_TRACKS) {
          return {
            action: "createV2",
            startSec: Math.max(0, snapStart(rawStart, undefined, clip.id)),
            previewIdx: videoTrackCount,
          };
        }
        return {
          action: "reject",
          reason: "max-video",
          startSec: Math.max(0, round1(rawStart)),
          previewIdx: clampHover,
        };
      }

      // audio clip
      if (target && target.kind === "audio") {
        const start = snapStart(rawStart, target, clip.id);
        const s = findFreeStart(target, clip, Math.max(0, start));
        if (s == null)
          return {
            action: "reject",
            reason: "nofit",
            startSec: Math.max(0, start),
            previewIdx: hoverIdx,
          };
        return {
          action: "move",
          trackId: target.id,
          startSec: s,
          previewIdx: hoverIdx,
        };
      }
      // below all tracks or over a video track → auto-create a new audio track
      return {
        action: "createAudio",
        startSec: Math.max(0, snapStart(rawStart, undefined, clip.id)),
        previewIdx: ordered.length,
      } as DropDecision;
    },
    [ordered, videoTrackCount, pxPerSec, snapStart],
  );

  /* ── Playhead drag ─────────────────────────────────────── */
  const handlePlayheadDrag = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const update = (clientX: number) => {
        const relX = laneXFromEvent(clientX) - TRACK_PAD_LEFT;
        const t = Math.max(0, relX / pxPerSec);
        onSeek(round1(t));
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
    [pxPerSec, onSeek, laneXFromEvent],
  );

  /* ── Ruler click to seek ─────────────────────────────── */
  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const relX = laneXFromEvent(e.clientX) - TRACK_PAD_LEFT;
      const t = Math.max(0, relX / pxPerSec);
      onSeek(round1(t));
    },
    [pxPerSec, onSeek, laneXFromEvent],
  );

  /* ── Resize (edge trim → duration) ───────────────────── */
  const handleResize = useCallback(
    (clip: Clip, edge: "left" | "right", e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizingClipId(clip.id);

      const startMouseX = e.clientX;
      const startDuration = clip.duration;
      pushHistory();

      const move = (ev: PointerEvent) => {
        const deltaSec = (ev.clientX - startMouseX) / pxPerSec;
        const newDuration =
          edge === "right"
            ? Math.max(MIN_DURATION_SEC, startDuration + deltaSec)
            : Math.max(MIN_DURATION_SEC, startDuration - deltaSec);
        updateClip(compId, clip.id, { duration: round1(newDuration) });
      };
      const up = () => {
        setResizingClipId(null);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [compId, pxPerSec, updateClip, pushHistory],
  );

  /* ── Clip drag (2D: cross-track + auto-create V2) ───────── */
  const handleClipDragStart = useCallback(
    (track: Track, clip: Clip, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const laneX = laneXFromEvent(e.clientX);
      const contentY = contentYFromEvent(e.clientY);
      const offsetX = laneX - clipX(clip, pxPerSec);
      setDragState({ clipId: clip.id, sourceTrackId: track.id, offsetX });
      setDragPos({ laneX, contentY });

      const move = (ev: PointerEvent) =>
        setDragPos({ laneX: laneXFromEvent(ev.clientX), contentY: contentYFromEvent(ev.clientY) });

      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);

        const lx = laneXFromEvent(ev.clientX);
        const cy = contentYFromEvent(ev.clientY);
        const freshTracks =
          useCanvas.getState().nodes.find((n) => n.id === compId)?.data.tracks ?? [];
        const fresh = findClipById(freshTracks, clip.id) ?? clip;
        const dec = computeDrop(fresh, lx, cy, offsetX);

        if (dec.action === "move") {
          const sameSpot =
            dec.trackId === track.id && Math.abs(dec.startSec - fresh.startSec) < 0.05;
          if (!sameSpot) moveClip(compId, fresh.id, dec.trackId, dec.startSec);
        } else if (dec.action === "createV2") {
          addVideoTrack(compId);
          const v2 = (
            useCanvas.getState().nodes.find((n) => n.id === compId)?.data.tracks ?? []
          ).find((t) => t.kind === "video" && t.name === "V2");
          if (v2) moveClip(compId, fresh.id, v2.id, dec.startSec);
        } else if (dec.action === "createAudio") {
          addAudioTrack(compId);
          const freshTracks2 =
            useCanvas.getState().nodes.find((n) => n.id === compId)?.data.tracks ?? [];
          const newAudio = freshTracks2
            .filter((t) => t.kind === "audio")
            .sort((a, b) => b.name.localeCompare(a.name))[0];
          if (newAudio) moveClip(compId, fresh.id, newAudio.id, dec.startSec);
        } else {
          showToast(
            dec.reason === "max-video"
              ? `视频轨最多 ${MAX_VIDEO_TRACKS} 条`
              : "该轨没有空位",
          );
        }

        setDragState(null);
        setDragPos(null);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [
      compId,
      pxPerSec,
      laneXFromEvent,
      contentYFromEvent,
      computeDrop,
      moveClip,
      addVideoTrack,
      showToast,
    ],
  );

  /* ── Live drop preview (ghost + indicator) ───────────── */
  const livePreview = useMemo(() => {
    if (!dragState || !dragPos) return null;
    // Read latest tracks from store to avoid re-running on every tracks change
    const freshTracks =
      useCanvas.getState().nodes.find((n) => n.id === compId)?.data.tracks ?? [];
    const clip = findClipById(freshTracks, dragState.clipId);
    if (!clip) return null;
    const dec = computeDrop(clip, dragPos.laneX, dragPos.contentY, dragState.offsetX);
    return { clip, dec };
  }, [dragState, dragPos, compId, computeDrop]);

  /* ── Render a single clip ────────────────────────────── */
  const renderClip = (track: Track, clip: Clip) => {
    const cs = CLIP_STYLES[clip.color] ?? CLIP_STYLES.gray;
    const isResizing = resizingClipId === clip.id;
    const isDragging = dragState?.clipId === clip.id;
    const isSelected = selectedClipId === clip.id;
    const isAudio = clip.clipKind === "audio";
    const isMuted = isAudio && clip.muted === true;
    const x = clipX(clip, pxPerSec);
    const w = clipW(clip, pxPerSec);
    const barCount = Math.max(6, Math.floor((w - 12) / 5));

    return (
      <div
        key={clip.id}
        className="absolute rounded-lg overflow-visible select-none"
        style={{
          left: x,
          top: CLIP_Y,
          width: w,
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
          selectClip(clip.id);
        }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = e.clientX - rect.left;
          if (relX < 10 || relX > rect.width - 10) return;
          handleClipDragStart(track, clip, e);
        }}
      >
        {/* Left resize handle */}
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            handleResize(clip, "left", e);
          }}
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-10 group"
        >
          <div
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: cs.border }}
          />
        </div>

        {/* Right resize handle */}
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            handleResize(clip, "right", e);
          }}
          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-10 group"
        >
          <div
            className="absolute right-0 top-2 bottom-2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: cs.border }}
          />
        </div>

        {/* Body: audio → waveform, video → tiled thumbnails */}
        {isAudio ? (
          <div
            className="absolute flex items-center gap-[2px] overflow-hidden rounded-md px-1.5"
            style={{ left: 0, right: 0, top: 20, bottom: 4, opacity: isMuted ? 0.3 : 0.85 }}
          >
            {Array.from({ length: barCount }).map((_, bi) => (
              <div
                key={bi}
                className="flex-1 rounded-full"
                style={{ height: WAVE[bi % WAVE.length] + 4, background: cs.border }}
              />
            ))}
          </div>
        ) : clip.thumbnail ? (
          <div className="absolute inset-0 overflow-hidden rounded-md" style={{ top: 20 }}>
            <div className="flex h-full" style={{ opacity: 0.35 }}>
              {Array.from({ length: Math.max(1, Math.ceil(w / 60)) }).map((_, ti) => (
                <img
                  key={ti}
                  src={clip.thumbnail!}
                  alt=""
                  className="h-full object-cover flex-shrink-0"
                  style={{ width: 60 }}
                  draggable={false}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className="absolute inset-0 rounded-md"
            style={{ top: 20, background: cs.thumbBg, opacity: 0.4 }}
          />
        )}

        {/* Name + timecode label */}
        <span
          className="absolute text-[10px] font-bold truncate"
          style={{
            left: 8,
            top: 4,
            right: isAudio ? 24 : 10,
            color: "#FFFFFF",
            whiteSpace: "nowrap",
            zIndex: 2,
          }}
        >
          {clip.name}{" "}
          <span style={{ fontWeight: 500, color: cs.timeColor, fontFamily: "Inter, monospace" }}>
            {fmtTimecode(clip.duration)}
          </span>
        </span>

        {/* Audio: two-state mute toggle (decision #6) */}
        {isAudio && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleClipMute(compId, clip.id);
            }}
            className="absolute flex items-center justify-center rounded hover:bg-black/20"
            style={{ right: 3, top: 3, width: 18, height: 18, zIndex: 3 }}
            title={isMuted ? "取消静音" : "设为无声"}
          >
            {isMuted ? (
              <VolumeX className="w-3 h-3" style={{ color: "#FCA5A5" }} />
            ) : (
              <Volume2 className="w-3 h-3" style={{ color: "#FFFFFF" }} />
            )}
          </button>
        )}

        {/* Resize tooltip */}
        {isResizing && (
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono px-2 py-0.5 rounded whitespace-nowrap"
            style={{ background: cs.bg, color: "#FFFFFF", border: `1px solid ${cs.border}` }}
          >
            {clip.duration.toFixed(1)}s
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex-shrink-0" style={{ borderTop: `1px solid ${dark ? "#333348" : "#E2E8F0"}` }}>
      {/* constraint toast */}
      {toast && (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-[12px] font-medium pointer-events-none fade-in"
          style={{
            top: 8,
            zIndex: 50,
            background: "#FEF2F2",
            color: "#991B1B",
            border: "1px solid #FECACA",
            boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          }}
        >
          {toast}
        </div>
      )}

      <div
        ref={containerRef}
        className="relative overflow-auto"
        style={{ maxHeight: RULER_H + TRACKS_MAX_H, background: dark ? "#1E1E2E" : "#FFFFFF" }}
      >
        <div
          style={{
            width: SIDEBAR_W + contentWidth,
            position: "relative",
            height: RULER_H + tracksTotalH,
          }}
        >
          {/* ── Ruler row (sticky top) ── */}
          <div className="flex sticky top-0" style={{ height: RULER_H, zIndex: 30 }}>
            {/* corner */}
            <div
              className="sticky left-0 flex items-center justify-center flex-shrink-0"
              style={{
                width: SIDEBAR_W,
                height: RULER_H,
                background: dark ? "#222235" : "#F8FAFC",
                zIndex: 40,
                borderRight: `1px solid ${dark ? "#333348" : "#E2E8F0"}`,
              }}
            >
              {hasVideoGap ? (
                <span className="text-[10px] font-semibold" style={{ color: dark ? "#FBBF24" : "#F59E0B" }}>
                  有视频空隙
                </span>
              ) : (
                <button
                  onClick={onToggleMute}
                  className={`flex items-center justify-center rounded ${dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                  style={{ width: 26, height: 22 }}
                  title={muted ? "取消静音" : "全局静音"}
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4" style={{ color: "#EF4444" }} />
                  ) : (
                    <Volume2 className="w-4 h-4" style={{ color: dark ? "#94A3B8" : "#64748B" }} />
                  )}
                </button>
              )}
            </div>
            {/* ruler ticks */}
            <div
              className="relative cursor-pointer flex-shrink-0"
              style={{ width: contentWidth, height: RULER_H, background: dark ? "#262637" : "#F1F5F9" }}
              onClick={handleRulerClick}
            >
              {ticks.map((tick, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] font-medium select-none"
                  style={{
                    left: tick.x,
                    top: 12,
                    color: dark ? "#8B95A8" : "#64748B",
                    fontFamily: "Inter, monospace",
                  }}
                >
                  {tick.label}
                </span>
              ))}
              {subTicks.map((st, i) => (
                <div
                  key={`sub-${i}`}
                  className="absolute"
                  style={{ left: st.x, bottom: 0, width: 1, height: 8, background: dark ? "#404056" : "#CBD5E1" }}
                />
              ))}
              {ticks.map((tick, i) => (
                <div
                  key={`major-${i}`}
                  className="absolute"
                  style={{ left: tick.x, bottom: 0, width: 1, height: 14, background: dark ? "#6B7280" : "#94A3B8" }}
                />
              ))}
            </div>
          </div>

          {/* ── Track rows ── */}
          {ordered.map((track) => {
            const isVideo = track.kind === "video";
            return (
              <div key={track.id} className="flex" style={{ height: TRACK_H }}>
                {/* track head (sticky left) */}
                <div
                  className="sticky left-0 flex flex-col items-center justify-center gap-1 flex-shrink-0"
                  style={{
                    width: SIDEBAR_W,
                    height: TRACK_H,
                    background: dark ? "#222235" : "#F8FAFC",
                    borderRight: `1px solid ${dark ? "#333348" : "#E2E8F0"}`,
                    borderTop: `1px solid ${dark ? "#333348" : "#E2E8F0"}`,
                    zIndex: 20,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {isVideo ? (
                      <Play className="w-4 h-4" style={{ color: "#93C5FD" }} />
                    ) : (
                      <Music className="w-4 h-4" style={{ color: "#6EE7B7" }} />
                    )}
                    <button
                      onClick={onToggleMute}
                      className={`flex items-center justify-center rounded ${dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                      style={{ width: 22, height: 22 }}
                      title={muted ? "取消静音" : "静音"}
                    >
                      {muted ? (
                        <VolumeX className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" style={{ color: dark ? "#8B95A8" : "#94A3B8" }} />
                      )}
                    </button>
                  </div>
                </div>

                {/* lane */}
                <div
                  className="relative flex-shrink-0"
                  style={{
                    width: contentWidth,
                    height: TRACK_H,
                    background: dark
                      ? (isVideo ? "#1E1E2E" : "#1C1E2B")
                      : (isVideo ? "#FAFBFD" : "#F5F9FC"),
                    borderTop: `1px solid ${dark ? "#333348" : "#E2E8F0"}`,
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) selectClip(null);
                  }}
                >
                  {/* grid lines */}
                  {gridLines.map((x, i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{ left: x, top: 0, width: 1, height: TRACK_H, background: dark ? "#2A2A3C" : "#F1F5F9" }}
                    />
                  ))}

                  {/* empty placeholder */}
                  {track.clips.length === 0 && (
                    <div
                      className="absolute flex items-center justify-center gap-2 rounded-lg"
                      style={{
                        left: TRACK_PAD_LEFT,
                        top: CLIP_Y,
                        width: 360,
                        height: CLIP_H,
                        background: dark ? "#262637" : "#F1F5F9",
                        border: `1.5px dashed ${dark ? "#404056" : "#CBD5E1"}`,
                      }}
                    >
                      <Plus className="w-4 h-4" style={{ color: dark ? "#6B7280" : "#64748B" }} />
                      <span className="text-[12px] font-medium" style={{ color: dark ? "#6B7280" : "#64748B" }}>
                        把素材拖到这里
                      </span>
                    </div>
                  )}

                  {/* clips */}
                  {track.clips.map((clip) => renderClip(track, clip))}
                </div>
              </div>
            );
          })}

          {/* ── Live drop preview (target highlight + ghost + line) ── */}
          {livePreview &&
            (() => {
              const { clip, dec } = livePreview;
              const ok = dec.action !== "reject";
              const cs = CLIP_STYLES[clip.color] ?? CLIP_STYLES.gray;
              const laneTop = RULER_H + dec.previewIdx * TRACK_H;
              const left = SIDEBAR_W + TRACK_PAD_LEFT + dec.startSec * pxPerSec;
              const w = clipW(clip, pxPerSec);
              return (
                <>
                  {/* target lane highlight */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: SIDEBAR_W,
                      top: laneTop,
                      width: contentWidth,
                      height: TRACK_H,
                      background: ok ? "rgba(86,199,207,0.08)" : "rgba(240,68,56,0.08)",
                      zIndex: 24,
                    }}
                  />
                  {/* drop line */}
                  {ok && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: left - 1,
                        top: laneTop + 4,
                        width: 2,
                        height: CLIP_H + 8,
                        background: "#F04438",
                        borderRadius: 2,
                        zIndex: 39,
                      }}
                    />
                  )}
                  {/* ghost */}
                  <div
                    className="absolute pointer-events-none rounded-lg overflow-hidden"
                    style={{
                      left,
                      top: laneTop + CLIP_Y,
                      width: w,
                      height: CLIP_H,
                      background: cs.bg,
                      border: `2px solid ${ok ? cs.border : "#F04438"}`,
                      opacity: 0.85,
                      zIndex: 38,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    }}
                  >
                    <span
                      className="absolute text-[10px] font-bold truncate"
                      style={{ left: 8, top: 4, right: 8, color: "#FFFFFF" }}
                    >
                      {clip.name}
                    </span>
                    {dec.action === "createV2" && (
                      <span
                        className="absolute text-[9px] font-semibold"
                        style={{ left: 8, bottom: 4, color: "#BFDBFE" }}
                      >
                        + 新建视频轨 V2
                      </span>
                    )}
                    {dec.action === "createAudio" && (
                      <span
                        className="absolute text-[9px] font-semibold"
                        style={{ left: 8, bottom: 4, color: "#6EE7B7" }}
                      >
                        + 新建音频轨
                      </span>
                    )}
                    {!ok && (
                      <span
                        className="absolute text-[9px] font-semibold"
                        style={{ left: 8, bottom: 4, color: "#FCA5A5" }}
                      >
                        {dec.reason === "max-video" ? "已满 2 轨" : "无空位"}
                      </span>
                    )}
                  </div>
                </>
              );
            })()}

          {/* ── Playhead (spans ruler + all tracks) ── */}
          {/* Vertical line */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: playheadX,
              top: RULER_H,
              width: 1,
              height: ordered.length * TRACK_H,
              background: dark ? "#E2E8F0" : "#334155",
              opacity: 0.7,
              zIndex: 35,
            }}
          />
          {/* Top handle: triangle + line */}
          <div
            className="absolute cursor-grab active:cursor-grabbing"
            style={{
              left: playheadX - 6,
              top: 0,
              width: 12,
              height: RULER_H + ordered.length * TRACK_H,
              zIndex: 36,
            }}
            onPointerDown={handlePlayheadDrag}
          >
            {/* Triangle indicator */}
            <svg
              width="12"
              height={RULER_H}
              viewBox={`0 0 12 ${RULER_H}`}
              className="pointer-events-none"
            >
              <path
                d={`M1,2 L11,2 L11,${RULER_H - 8} L7,${RULER_H} L5,${RULER_H} L1,${RULER_H - 8} Z`}
                fill={dark ? "#E2E8F0" : "#334155"}
                fillOpacity="0.9"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
