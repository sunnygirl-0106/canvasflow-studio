import { useRef, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { useCanvas, type Shot } from "@/store/canvasStore";
import { PreviewPopover } from "./PreviewPopover";
import { AlertTriangle } from "lucide-react";

const COLOR_BG: Record<Shot["color"], string> = {
  cyan: "bg-[#2ec4b6]",
  purple: "bg-[#9b5de5]",
  yellow: "bg-[#f4c95d]",
  gray: "bg-[#4a4a55] shot-stripes",
};

interface Props {
  shot: Shot;
  timelineId: string;
  pxPerSecond: number;
  onReorder: (dir: -1 | 1) => void;
  pulseId: string | null;
}

export function ShotBlock({ shot, timelineId, pxPerSecond, onReorder, pulseId }: Props) {
  const updateShot = useCanvas((s) => s.updateShot);
  const removeShot = useCanvas((s) => s.removeShot);
  const selectShot = useCanvas((s) => s.selectShot);
  const pushHistory = useCanvas((s) => s.pushHistory);
  const nodes = useCanvas((s) => s.nodes);
  const selectedShotId = useCanvas((s) => s.selectedShotId);

  const [hover, setHover] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [editName, setEditName] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);

  const w = Math.max(40, shot.duration * pxPerSecond);
  const isErr = shot.status === "failed";
  const isSel = selectedShotId === shot.id;
  const binding = shot.bindings[0];
  const bindingNode = nodes.find((n) => n.id === binding);

  const onResizeRight = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    pushHistory();
    const startX = e.clientX;
    const startDur = shot.duration;
    const move = (ev: PointerEvent) => {
      const next = Math.max(0.5, startDur + (ev.clientX - startX) / pxPerSecond);
      updateShot(timelineId, shot.id, { duration: Math.round(next * 10) / 10 });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onResizeLeft = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    pushHistory();
    const startX = e.clientX;
    const startIn = shot.sourceIn;
    const move = (ev: PointerEvent) => {
      const next = Math.max(0, startIn + (ev.clientX - startX) / pxPerSecond);
      updateShot(timelineId, shot.id, { sourceIn: Math.round(next * 10) / 10 });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onBodyDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    selectShot(shot.id);
    const startX = e.clientX;
    let dragged = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > pxPerSecond * 1.2) {
        if (!dragged) { pushHistory(); dragged = true; }
        onReorder(dx > 0 ? 1 : -1);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const handleMouseEnter = () => {
    setHover(true);
    hoverTimer.current = window.setTimeout(() => setShowPreview(true), 200);
  };
  const handleMouseLeave = () => {
    setHover(false);
    setShowPreview(false);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  return (
    <div
      ref={blockRef}
      className={`relative h-12 rounded-md ${COLOR_BG[shot.color]} ${isErr ? "ring-2 ring-destructive" : ""} ${isSel ? "ring-2 ring-white" : ""} ${pulseId === shot.id ? "pulse-bind" : ""} cursor-grab active:cursor-grabbing select-none flex-shrink-0 overflow-visible`}
      style={{ width: w }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={onBodyDown}
      onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
      onDoubleClick={() => setEditName(true)}
    >
      {/* top handle for binding to external nodes */}
      <Handle type="target" position={Position.Top} id={shot.id} style={{ background: "#5cdcfa" }} />

      {/* left resize */}
      <div onPointerDown={onResizeLeft} className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-white/30" />
      {/* right resize */}
      <div onPointerDown={onResizeRight} className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-white/30" />

      <div className="px-2 py-1 h-full flex flex-col justify-between text-[11px] text-black/85 font-medium overflow-hidden">
        {editName ? (
          <input
            autoFocus
            defaultValue={shot.name}
            onBlur={(e) => { updateShot(timelineId, shot.id, { name: e.target.value }); setEditName(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="bg-white/40 outline-none text-[11px] px-1 rounded w-full"
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-center gap-1 truncate">
            {isErr && <AlertTriangle className="w-3 h-3" />}
            <span className="truncate">{shot.name}</span>
          </div>
        )}
        <div className="text-right text-[10px] font-mono opacity-80">
          {shot.duration.toFixed(1)}s {shot.sourceOut > shot.duration ? `/ ${shot.sourceOut.toFixed(0)}s` : ""}
        </div>
      </div>

      {showPreview && <PreviewPopover shot={shot} bindingName={bindingNode?.data.name} />}
      {hover && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white bg-black/70 px-1.5 py-0.5 rounded whitespace-nowrap">
          {shot.duration.toFixed(1)}s
        </div>
      )}

      {menu && (
        <div
          className="fixed z-50 frosted border border-border rounded-md py-1 text-xs node-shadow"
          style={{ left: menu.x, top: menu.y }}
          onMouseLeave={() => setMenu(null)}
        >
          {[
            { l: "复制", a: () => { /* mock */ setMenu(null); } },
            { l: "解除绑定", a: () => { updateShot(timelineId, shot.id, { bindings: [], color: "gray", thumbnail: undefined, status: "empty" }); setMenu(null); } },
            { l: "删除", a: () => { removeShot(timelineId, shot.id); setMenu(null); } },
          ].map((o) => (
            <button key={o.l} onClick={o.a} className="block w-full text-left px-3 py-1 hover:bg-primary/30">{o.l}</button>
          ))}
        </div>
      )}
    </div>
  );
}
