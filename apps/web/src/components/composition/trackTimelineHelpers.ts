import type { Track, Clip } from "@/store/canvasStore";
import { clipEnd } from "@canvasflow/shared";
import { fmtSec } from "@/lib/time";

/* ── Dimensions ───────────────────────────────────────────── */
export const RULER_H = 28;
export const TRACK_H = 68;
export const CLIP_H = 52;
export const CLIP_Y = 8;
export const TRACK_PAD_LEFT = 16;
export const SIDEBAR_W = 84;
export const MIN_DURATION_SEC = 0.5;
export const TRACKS_MAX_H = 3 * TRACK_H + 8;
export const SNAP_PX = 8;

// Faux waveform pattern for audio clips (demo — no real decoding).
export const WAVE = [4, 9, 14, 7, 18, 11, 22, 8, 13, 19, 6, 15, 24, 10, 17, 5, 12, 20, 9, 16];

/* ── Helpers ──────────────────────────────────────────────── */
export const clipX = (c: Clip, pxPerSec: number) => TRACK_PAD_LEFT + c.startSec * pxPerSec;
export const clipW = (c: Clip, pxPerSec: number) => c.duration * pxPerSec;
export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Video tracks first (V1, V2…), then audio tracks (A1, A2…). */
export function orderTracks(tracks: Track[]): Track[] {
  const vids = tracks
    .filter((t) => t.kind === "video")
    .sort((a, b) => a.name.localeCompare(b.name));
  const auds = tracks
    .filter((t) => t.kind === "audio")
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...vids, ...auds];
}

export function findClipById(tracks: Track[], id: string): Clip | null {
  for (const t of tracks) {
    const c = t.clips.find((c) => c.id === id);
    if (c) return c;
  }
  return null;
}

/**
 * Snap a desired start so `clip` fits a free slot on `track` (same-track no overlap).
 * Returns the nearest non-overlapping start, or null if nothing fits.
 */
export function findFreeStart(track: Track, clip: Clip, desired: number): number | null {
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
  gaps.push([cursor, Infinity]);

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

export function buildTicks(pxPerSec: number, totalWidth: number) {
  const interval = pxPerSec >= 40 ? 4 : pxPerSec >= 20 ? 8 : 16;
  const ticks: { label: string; x: number }[] = [];
  const maxSec = totalWidth / pxPerSec;
  for (let s = 0; s <= maxSec; s += interval) {
    ticks.push({ label: fmtSec(s), x: s * pxPerSec + TRACK_PAD_LEFT });
  }
  return ticks;
}

export function buildSubTicks(pxPerSec: number, totalWidth: number) {
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

export function buildGridLines(pxPerSec: number, totalWidth: number) {
  const interval = pxPerSec >= 40 ? 4 : pxPerSec >= 20 ? 8 : 16;
  const lines: number[] = [];
  const maxSec = totalWidth / pxPerSec;
  for (let s = interval; s < maxSec; s += interval) {
    lines.push(s * pxPerSec + TRACK_PAD_LEFT);
  }
  return lines;
}

/* ── Drag state types ───────────────────────────────────────── */
export interface DragState {
  clipId: string;
  sourceTrackId: string;
  offsetX: number;
}
export interface DragPos {
  laneX: number;
  contentY: number;
}

export type DropDecision =
  | { action: "move"; trackId: string; startSec: number; previewIdx: number }
  | { action: "createV2"; startSec: number; previewIdx: number }
  | { action: "createAudio"; startSec: number; previewIdx: number }
  | {
      action: "reject";
      reason: "max-video" | "nofit";
      startSec: number;
      previewIdx: number;
    };
