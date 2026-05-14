import { Handle, Position } from "@xyflow/react";
import type { CanvasNode } from "@/store/canvasStore";
import { NodeHandleHint } from "@/components/NodeHandleHint";

export function ImageNode({ data }: { data: CanvasNode["data"] }) {
  return (
    <div className="group relative w-[240px] h-[160px] rounded-xl bg-card border border-border node-shadow overflow-visible fade-in flex flex-col">
      <div className="flex-1 bg-secondary/50 overflow-hidden rounded-t-xl">
        {data.src && <img src={data.src} alt="" className="w-full h-full object-cover" draggable={false} />}
      </div>
      <div className="px-3 py-2 flex items-center justify-between bg-card rounded-b-xl">
        <div className="text-xs text-foreground truncate">{data.name}</div>
        <div className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">1 张</div>
      </div>
      <Handle type="source" position={Position.Right} id="source-process" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-timeline"
        style={{
          width: 18,
          height: 10,
          borderRadius: "0 0 9px 9px",
          background: "#F97316",
          border: "none",
          bottom: -2,
          left: "50%",
        }}
      />
      <NodeHandleHint position="bottom" />
    </div>
  );
}
