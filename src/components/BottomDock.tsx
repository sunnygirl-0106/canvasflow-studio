import { useCanvas } from "@/store/canvasStore";
import { Film, Image as ImageIcon, Sparkles, Video } from "lucide-react";

export function BottomDock() {
  const addNode = useCanvas((s) => s.addNode);
  const items = [
    { kind: "timeline" as const, label: "时间线", icon: Film },
    { kind: "image" as const, label: "图片节点", icon: ImageIcon },
    { kind: "generateImage" as const, label: "生图节点", icon: Sparkles },
    { kind: "generateVideo" as const, label: "生视频节点", icon: Video },
  ];
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 frosted rounded-full px-2 py-2 flex items-center gap-1 border border-border/60 node-shadow">
      {items.map((it) => (
        <button
          key={it.kind}
          onClick={() => addNode(it.kind)}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full hover:bg-primary/30 transition-colors text-foreground/90"
        >
          <it.icon className="w-3.5 h-3.5" />
          <span>+ {it.label}</span>
        </button>
      ))}
    </div>
  );
}
