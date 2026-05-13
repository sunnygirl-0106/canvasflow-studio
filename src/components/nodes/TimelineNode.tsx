import { useEffect, useRef, useState } from "react";
import { useCanvas, type CanvasNode } from "@/store/canvasStore";
import { ShotBlock } from "./ShotBlock";
import { Pause, Play, Plus } from "lucide-react";

export function TimelineNode({ id, data }: { id: string; data: CanvasNode["data"] }) {
  const updateNode = useCanvas((s) => s.updateNode);
  const reorderShots = useCanvas((s) => s.reorderShots);
  const addShot = useCanvas((s) => s.addShot);

  const shots = data.shots ?? [];
  const pps = data.pxPerSecond ?? 60;
  const w = data.width ?? 1200;
  const total = shots.reduce((a, s) => a + s.duration, 0);

  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [pulseId, setPulseId] = useState<string | null>(null);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((x) => {
        if (x >= total) { setPlaying(false); return 0; }
        return x + 0.1;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, total]);

  // resize bottom-right
  const onResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startW = w;
    const move = (ev: PointerEvent) => {
      const next = Math.max(600, startW + (ev.clientX - startX));
      updateNode(id, { data: { ...data, width: next } } as any);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const handleReorder = (shotId: string, dir: -1 | 1) => {
    const ids = shots.map((s) => s.id);
    const i = ids.indexOf(shotId);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderShots(id, ids);
  };

  // expose setter for demo flow
  (TimelineNode as any).pulseSetter = setPulseId;

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-[#2b1d4a] to-[#1a1530] border border-primary/40 node-shadow fade-in overflow-hidden"
      style={{ width: w }}
    >
      {/* title */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
        <div className="text-sm font-semibold text-foreground">
          {data.name ?? "时间线"} <span className="text-muted-foreground">✎</span>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">{shots.length} 片段</div>
      </div>

      {/* tools */}
      <div className="px-4 h-8 flex items-center gap-3 text-xs border-b border-white/5">
        <button
          onClick={() => { setT(0); setPlaying((p) => !p); }}
          className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:opacity-80"
        >
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
        </button>
        <span className="font-mono text-muted-foreground">
          <span className="text-accent">{t.toFixed(1)}s</span> / {total.toFixed(1)}s
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">缩放</span>
          <input
            type="range"
            min={10}
            max={200}
            value={pps}
            onChange={(e) => updateNode(id, { data: { ...data, pxPerSecond: Number(e.target.value) } } as any)}
            className="w-24 accent-[var(--color-accent)]"
          />
          <span className="font-mono text-muted-foreground">{pps}px/s</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => addShot(id)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-primary/30 hover:bg-primary/50 text-foreground text-xs"
        >
          <Plus className="w-3 h-3" /> 添加片段
        </button>
      </div>

      {/* main track */}
      <div className="px-4 py-3 relative">
        <div className="text-[10px] text-muted-foreground mb-1">主轨道</div>
        <div className="h-16 relative bg-black/30 rounded-md overflow-x-auto overflow-y-hidden">
          <div className="flex items-center h-full gap-1 px-1 py-2">
            {shots.map((sh) => (
              <ShotBlock
                key={sh.id}
                shot={sh}
                timelineId={id}
                pxPerSecond={pps}
                pulseId={pulseId}
                onReorder={(d) => handleReorder(sh.id, d)}
              />
            ))}
            {shots.length === 0 && (
              <div className="text-xs text-muted-foreground px-3">空时间线 · 点击右上「添加片段」</div>
            )}
          </div>
          {playing && (
            <div
              className="absolute top-0 h-full w-0.5 bg-accent pointer-events-none"
              style={{ left: 4 + t * pps }}
            />
          )}
        </div>

        {/* aux tracks */}
        <div className="text-[10px] text-muted-foreground mt-2 mb-1">字幕 / 配乐</div>
        <div className="h-8 bg-black/30 rounded-md p-1.5 flex gap-1 overflow-hidden">
          <div className="h-full rounded bg-[#f4c95d]/70 flex-1 max-w-[40%] text-[9px] flex items-center px-2 text-black/70">字幕轨</div>
          <div className="h-full rounded bg-[#f4c95d]/40 flex-1 text-[9px] flex items-center px-2 text-black/70">BGM 轨</div>
        </div>
      </div>

      {/* resize handle */}
      <div
        onPointerDown={onResize}
        className="absolute bottom-1 right-1 w-3 h-3 cursor-se-resize border-r-2 border-b-2 border-muted-foreground/60 rounded-br"
      />
    </div>
  );
}
