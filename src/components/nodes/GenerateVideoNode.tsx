import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { Video, Loader2, Play, Download } from "lucide-react";
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
      className="fade-in"
      style={{ width: 340 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Handle type="target" position={Position.Left} id="in" />

      {/* Node label */}
      <div className="flex items-center gap-2 mb-2" style={{ padding: "0 12px" }}>
        <Video className="w-[18px] h-[18px]" style={{ color: "#667085" }} />
        <span className="text-base font-semibold" style={{ color: "#667085", fontFamily: "Inter, system-ui" }}>
          {data.name ?? "视频节点"}
        </span>
      </div>

      {/* Floating bar */}
      <div
        className="flex items-center gap-5 rounded-[20px] mb-2 mx-auto"
        style={{
          width: 254,
          height: 43,
          padding: "0 18px",
          background: "#FFFFFF",
          border: "1px solid #cbd1d9",
        }}
      >
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4" style={{ color: "#344051" }} />
          <span className="text-sm font-semibold" style={{ color: "#344051" }}>预览</span>
        </div>
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4" style={{ color: "#344051" }} />
          <span className="text-sm font-semibold" style={{ color: "#344051" }}>编辑</span>
        </div>
        <Download className="w-[18px] h-[18px]" style={{ color: "#344051" }} />
      </div>

      {/* Video canvas */}
      <div
        className="rounded-3xl overflow-hidden relative"
        style={{
          height: 190,
          background: "linear-gradient(180deg, #111827 0%, #1F2937 100%)",
          border: "2px solid #98A2B3",
          boxShadow: "0 18px 36px rgba(152,162,179,0.1)",
        }}
      >
        {data.src ? (
          <>
            <img src={data.src} alt="" className="w-full h-full object-cover" draggable={false} />
            {hover && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-6 h-6 text-black ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Play className="w-6 h-6 text-white/60 ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Add buttons on sides */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          left: -14,
          top: "60%",
          width: 28,
          height: 28,
          background: "#FFFFFF",
          border: "2px solid #98A2B3",
        }}
      >
        <span className="text-[22px] font-medium leading-none" style={{ color: "#667085" }}>+</span>
      </div>

      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          right: -14,
          top: "60%",
          width: 28,
          height: 28,
          background: "#FFFFFF",
          border: "2px solid #98A2B3",
        }}
      >
        <span className="text-[22px] font-medium leading-none" style={{ color: "#667085" }}>+</span>
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
