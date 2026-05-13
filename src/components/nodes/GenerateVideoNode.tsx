import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { Video, Loader2, Play } from "lucide-react";
import { useCanvas, type CanvasNode } from "@/store/canvasStore";

export function GenerateVideoNode({ id, data }: { id: string; data: CanvasNode["data"] }) {
  const updateNode = useCanvas((s) => s.updateNode);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);

  const generate = () => {
    setBusy(true);
    setTimeout(() => {
      const seed = Math.random().toString(36).slice(2, 7);
      updateNode(id, { data: { ...data, src: `https://picsum.photos/seed/${seed}/400/225`, duration: 8 } } as any);
      setBusy(false);
    }, 2000);
  };

  return (
    <div
      className="w-[240px] h-[160px] rounded-xl bg-card border border-border node-shadow overflow-hidden fade-in flex flex-col"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <div className="flex-1 bg-secondary/30 overflow-hidden flex items-center justify-center relative">
        {data.src ? (
          <>
            <img src={data.src} alt="" className="w-full h-full object-cover" draggable={false} />
            {hover && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-5 h-5 text-black ml-0.5" />
                </div>
              </div>
            )}
            <div className="absolute bottom-1 right-2 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded font-mono">{data.duration ?? 9}s</div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground text-[11px] text-center px-3">
            <Video className="w-5 h-5 text-primary" />
            <span>选中节点后点击下方按钮<br/>生成视频</span>
          </div>
        )}
      </div>
      <button
        onClick={generate}
        disabled={busy}
        className="text-xs py-1.5 bg-primary/30 hover:bg-primary/50 text-foreground border-t border-border flex items-center justify-center gap-1.5 transition-colors"
      >
        {busy ? <><Loader2 className="w-3 h-3 animate-spin" />生成中…</> : <><Video className="w-3 h-3" />生成</>}
      </button>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
