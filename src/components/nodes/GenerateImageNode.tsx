import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useCanvas, type CanvasNode } from "@/store/canvasStore";

export function GenerateImageNode({ id, data }: { id: string; data: CanvasNode["data"] }) {
  const updateNode = useCanvas((s) => s.updateNode);
  const [busy, setBusy] = useState(false);

  const generate = () => {
    setBusy(true);
    setTimeout(() => {
      const seed = Math.random().toString(36).slice(2, 7);
      updateNode(id, (n) => ({ ...n, data: { ...n.data, src: `https://picsum.photos/seed/${seed}/400/225` } }));
      setBusy(false);
    }, 2000);
  };

  return (
    <div className="group relative w-[240px] h-[160px] rounded-xl bg-card border-2 border-dashed border-border node-shadow overflow-visible fade-in flex flex-col">
      <Handle type="target" position={Position.Left} id="in" />
      <div className="flex-1 bg-secondary/30 overflow-hidden rounded-t-[10px] flex items-center justify-center text-muted-foreground text-[11px] text-center px-3">
        {data.src ? (
          <img src={data.src} alt="" className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Sparkles className="w-5 h-5 text-accent" />
            <span>已连接参考图片<br/>点击下方按钮生成</span>
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 flex items-center justify-between border-t border-border">
        <div className="text-xs text-foreground truncate">{data.name}</div>
        <button
          onClick={generate}
          disabled={busy}
          className="text-[11px] px-2 py-0.5 rounded bg-primary/30 hover:bg-primary/50 text-foreground flex items-center gap-1 transition-colors"
        >
          {busy ? <><Loader2 className="w-3 h-3 animate-spin" />生成中…</> : <><Sparkles className="w-3 h-3" />生成</>}
        </button>
      </div>
      <Handle type="source" position={Position.Right} id="source-process" />
    </div>
  );
}
