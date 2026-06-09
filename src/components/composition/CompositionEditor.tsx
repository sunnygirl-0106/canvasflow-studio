import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCanvas, compDuration } from "@/store/canvasStore";
import { EditorTopBar } from "./EditorTopBar";
import { PreviewStage } from "./PreviewStage";
import { TrackTimeline } from "./TrackTimeline";
import { EditorToolbar } from "./EditorToolbar";
import { PlaybackControls } from "./PlaybackControls";
import { SpeedPanel } from "./SpeedPanel";
import { ZoomControls } from "./ZoomControls";
import { FullscreenPlayer } from "./FullscreenPlayer";

const DEFAULT_PX_PER_SEC = 60;

export function CompositionEditor() {
  const editorCompId = useCanvas((s) => s.editorCompId);
  const editorMode = useCanvas((s) => s.editorMode);
  const selectedClipId = useCanvas((s) => s.selectedClipId);
  const nodes = useCanvas((s) => s.nodes);

  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(DEFAULT_PX_PER_SEC);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  const comp = nodes.find((n) => n.id === editorCompId);
  const tracks = comp?.data.tracks ?? [];
  // Step 2: render only the main video track (V1); multi-track wiring comes later.
  const v1 = tracks.find((t) => t.kind === "video");
  const shots = v1?.clips ?? [];
  const totalDuration = compDuration(tracks);

  // rAF-based playback — no timing drift
  useEffect(() => {
    if (!playing) return;
    let stopped = false;
    let lastTs: number | null = null;

    const tick = (ts: number) => {
      if (stopped) return;
      if (lastTs === null) lastTs = ts;
      // Cap delta to 100ms to avoid huge jumps on tab re-focus
      const delta = Math.min((ts - lastTs) / 1000, 0.1);
      lastTs = ts;

      setCurrentTime((t) => {
        const next = t + delta;
        if (next >= totalDuration) {
          setPlaying(false);
          stopped = true;
          return 0;
        }
        return next;
      });

      if (!stopped) requestAnimationFrame(tick);
    };

    const id = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(id);
    };
  }, [playing, totalDuration]);

  // Reset when opening a different composition
  useEffect(() => {
    setCurrentTime(0);
    setPlaying(false);
    setPxPerSec(DEFAULT_PX_PER_SEC);
    setSpeedOpen(false);
    setFullscreenOpen(false);
  }, [editorCompId]);

  // Close speed panel when clip deselected
  useEffect(() => {
    if (!selectedClipId) setSpeedOpen(false);
  }, [selectedClipId]);

  const handleTogglePlay = () => {
    if (!playing && currentTime >= totalDuration) setCurrentTime(0);
    setPlaying((p) => !p);
  };

  const handleSeek = (t: number) => {
    setCurrentTime(t);
    setPlaying(false);
  };

  if (!editorCompId || !comp) return null;

  const isFull = editorMode === "full";

  // Fullscreen player overlay
  if (fullscreenOpen) {
    return createPortal(
      <FullscreenPlayer
        tracks={tracks}
        currentTime={currentTime}
        totalDuration={totalDuration}
        playing={playing}
        onTogglePlay={handleTogglePlay}
        onClose={() => {
          setFullscreenOpen(false);
          setPlaying(false);
        }}
      />,
      document.body,
    );
  }

  const editor = (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{
        background: isFull ? "#0F172A" : "transparent",
        pointerEvents: isFull ? "auto" : "none",
      }}
    >
      {isFull && (
        <>
          <EditorTopBar
            compName={comp.data.name ?? "视频合成"}
            shotCount={shots.length}
            totalDuration={totalDuration}
          />
          <PreviewStage
            tracks={tracks}
            currentTime={currentTime}
            playing={playing}
            onTogglePlay={handleTogglePlay}
            onFullscreen={() => {
              setFullscreenOpen(true);
              setCurrentTime(0);
              setPlaying(true);
            }}
          />
        </>
      )}

      {/* Bottom panel: toolbar + track + zoom */}
      <div
        className="mt-auto flex flex-col"
        style={{
          pointerEvents: "auto",
          background: "#111827",
          borderTop: isFull ? "none" : "1px solid #334155",
          boxShadow: isFull ? "none" : "0 -8px 24px rgba(0,0,0,0.3)",
        }}
      >
        {/* Toolbar row */}
        <div className="flex items-center justify-between" style={{ background: "#1E293B" }}>
          <div className="relative flex-shrink-0">
            <EditorToolbar
              compId={editorCompId}
              currentTime={currentTime}
              selectedClipId={selectedClipId}
              onOpenSpeed={() => setSpeedOpen((o) => !o)}
            />
            {speedOpen && selectedClipId && (
              <SpeedPanel
                compId={editorCompId}
                clipId={selectedClipId}
                onClose={() => setSpeedOpen(false)}
              />
            )}
          </div>
          <div className="flex-1 flex justify-center">
            <PlaybackControls
              currentTime={currentTime}
              totalDuration={totalDuration}
              playing={playing}
              onTogglePlay={handleTogglePlay}
              onFullscreen={() => {
                setFullscreenOpen(true);
                setCurrentTime(0);
                setPlaying(true);
              }}
            />
          </div>
          <div className="flex-shrink-0">
            <ZoomControls pxPerSec={pxPerSec} onZoom={setPxPerSec} />
          </div>
        </div>

        {/* Track */}
        <TrackTimeline
          compId={editorCompId}
          tracks={tracks}
          currentTime={currentTime}
          pxPerSec={pxPerSec}
          selectedClipId={selectedClipId}
          onSeek={handleSeek}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
        />
      </div>
    </div>
  );

  return createPortal(editor, document.body);
}
