import { Handle, Position } from "@xyflow/react";
import type { CanvasNode } from "@/store/canvasStore";

export function ImageNode({ data }: { data: CanvasNode["data"] }) {
  return (
    <div className="w-[240px] h-[160px] rounded-xl bg-card border border-border node-shadow overflow-hidden fade-in flex flex-col">
      <div className="flex-1 bg-secondary/50 overflow-hidden">
        {data.src && <img src={data.src} alt="" className="w-full h-full object-cover" draggable={false} />}
      </div>
      <div className="px-3 py-2 flex items-center justify-between bg-card">
        <div className="text-xs text-foreground truncate">{data.name}</div>
        <div className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">1 张</div>
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
