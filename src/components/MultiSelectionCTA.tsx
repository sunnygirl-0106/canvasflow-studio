import { useCallback, useState } from "react";
import { Panel, useOnSelectionChange, type Node as RFNode } from "@xyflow/react";
import { Film, X } from "lucide-react";
import { useCanvas, type NodeKind } from "@/store/canvasStore";

const MEDIA_KINDS: NodeKind[] = ["image", "generateImage", "generateVideo"];

/**
 * Floating CTA that appears when the user selects ≥2 media nodes on the canvas.
 * Entry point B: "选中多个素材 → 合并到时间轴"
 */
export function MultiSelectionCTA() {
  const merge = useCanvas((s) => s.mergeToComposition);
  const [selectedMedia, setSelectedMedia] = useState<RFNode[]>([]);

  const onChange = useCallback(({ nodes }: { nodes: RFNode[] }) => {
    const media = nodes.filter((n) => MEDIA_KINDS.includes((n.type ?? "") as NodeKind));
    setSelectedMedia(media);
  }, []);

  useOnSelectionChange({ onChange });

  if (selectedMedia.length < 2) return null;

  const handleMerge = () => {
    merge(selectedMedia.map((n) => n.id));
    setSelectedMedia([]);
  };

  return (
    <Panel position="top-center" className="!m-0 !mt-4 pointer-events-none">
      <div
        className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full fade-in"
        style={{
          height: 44,
          padding: "0 8px 0 16px",
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          boxShadow: "0 12px 28px rgba(15,23,42,0.10)",
        }}
      >
        <span
          className="inline-flex items-center justify-center rounded-full text-[12px] font-bold text-white"
          style={{ width: 22, height: 22, background: "#0F172A", fontFamily: "Inter, system-ui" }}
        >
          {selectedMedia.length}
        </span>
        <span
          className="text-[13px] font-medium"
          style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          已选中 {selectedMedia.length} 个素材
        </span>

        <span className="inline-block" style={{ width: 1, height: 18, background: "#E5E7EB" }} />

        <button
          onClick={handleMerge}
          className="inline-flex items-center gap-1.5 rounded-full h-8 px-3 transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
            color: "#FFFFFF",
          }}
        >
          <Film className="w-3.5 h-3.5" strokeWidth={2.2} />
          <span
            className="text-[13px] font-semibold"
            style={{ fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            合并到视频合成
          </span>
        </button>

        <button
          onClick={() => setSelectedMedia([])}
          className="inline-flex items-center justify-center rounded-full hover:bg-slate-100"
          style={{ width: 28, height: 28 }}
          aria-label="dismiss"
        >
          <X className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} strokeWidth={2.2} />
        </button>
      </div>
    </Panel>
  );
}
