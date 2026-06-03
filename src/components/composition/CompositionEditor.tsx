import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2 } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";
import { EditorTopBar } from "./EditorTopBar";
import { PreviewStage } from "./PreviewStage";
import { TrackTimeline } from "./TrackTimeline";
import { EditorToolbar } from "./EditorToolbar";
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

  const comp = nodes.find((n) => n.id === editorCompId);
  const shots = comp?.data.shots ?? [];
  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);

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
        shots={shots}
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
      {/* Full mode: top bar + preview */}
      {isFull && (
        <>
          <EditorTopBar
            compName={comp.data.name ?? "视频合成"}
            shotCount={shots.length}
            totalDuration={totalDuration}
          />
          <PreviewStage
            shots={shots}
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

      {/* Collapsed mode: small preview window in top-left */}
      {!isFull && (
        <div
          className="absolute top-4 left-4 rounded-xl overflow-hidden"
          style={{
            width: 280,
            height: 180,
            background: "#000",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            border: "1px solid #334155",
            pointerEvents: "auto",
            zIndex: 42,
          }}
        >
          <PreviewStage
            shots={shots}
            currentTime={currentTime}
            playing={playing}
            onTogglePlay={handleTogglePlay}
            onFullscreen={() => {
              setFullscreenOpen(true);
              setCurrentTime(0);
              setPlaying(true);
            }}
          />
        </div>
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
        {/* Toolbar row: editor tools on left, zoom on right */}
        <div className="flex items-center justify-between" style={{ background: "#1E293B" }}>
          <div className="relative">
            <EditorToolbar
              compId={editorCompId}
              currentTime={currentTime}
              selectedClipId={selectedClipId}
              onOpenSpeed={() => setSpeedOpen((o) => !o)}
            />
            {/* Speed panel (positioned above toolbar) */}
            {speedOpen && selectedClipId && (
              <SpeedPanel
                compId={editorCompId}
                clipId={selectedClipId}
                onClose={() => setSpeedOpen(false)}
              />
            )}
          </div>
          <ZoomControls pxPerSec={pxPerSec} onZoom={setPxPerSec} />
        </div>

        {/* Track */}
        <TrackTimeline
          compId={editorCompId}
          shots={shots}
          currentTime={currentTime}
          pxPerSec={pxPerSec}
          selectedClipId={selectedClipId}
          onSeek={handleSeek}
        />
      </div>
    </div>
  );

  return createPortal(editor, document.body);
}
