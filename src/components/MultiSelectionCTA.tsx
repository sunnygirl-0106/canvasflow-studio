import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, useOnSelectionChange, type Node as RFNode } from "@xyflow/react";
import { Film, Grid3X3, FolderOpen, ChevronDown, X } from "lucide-react";
import { useCanvas, type NodeKind } from "@/store/canvasStore";

const MEDIA_KINDS: NodeKind[] = ["image", "generateImage", "generateVideo"];

/**
 * Floating CTA that appears when the user selects ≥2 media nodes on the canvas.
 * Entry point B: "选中多个素材 → 合并到时间轴 / 合并分镜组"
 */
export function MultiSelectionCTA() {
  const merge = useCanvas((s) => s.mergeToComposition);
  const mergeStoryboard = useCanvas((s) => s.mergeToStoryboard);
  const createGroupFn = useCanvas((s) => s.createGroup);
  const [selectedMedia, setSelectedMedia] = useState<RFNode[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const onChange = useCallback(({ nodes }: { nodes: RFNode[] }) => {
    const media = nodes.filter((n) => MEDIA_KINDS.includes((n.type ?? "") as NodeKind));
    setSelectedMedia(media);
    setDropdownOpen(false);
  }, []);

  useOnSelectionChange({ onChange });

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  if (selectedMedia.length < 2) return null;

  const ids = selectedMedia.map((n) => n.id);

  const handleMergeComposition = () => {
    merge(ids);
    setSelectedMedia([]);
    setDropdownOpen(false);
  };

  const handleMergeStoryboard = () => {
    mergeStoryboard(ids);
    setSelectedMedia([]);
    setDropdownOpen(false);
  };

  const handleCreateGroup = () => {
    createGroupFn(ids);
    setSelectedMedia([]);
    setDropdownOpen(false);
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

        {/* Merge to composition */}
        <button
          onClick={handleMergeComposition}
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

        {/* Group dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full h-8 px-3 transition-colors hover:bg-slate-100"
            style={{
              border: "1px solid #E5E7EB",
              color: "#0F172A",
            }}
          >
            <span
              className="text-[13px] font-semibold"
              style={{ fontFamily: "PingFang SC, Inter, system-ui" }}
            >
              打组
            </span>
            <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
          {dropdownOpen && (
            <div
              className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-50"
              style={{
                minWidth: 160,
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
              }}
            >
              <button
                onClick={handleCreateGroup}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium hover:bg-slate-50 transition-colors"
                style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
              >
                <FolderOpen className="w-4 h-4" style={{ color: "#56C7CF" }} strokeWidth={1.8} />
                打组
              </button>
              <button
                onClick={handleMergeStoryboard}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium hover:bg-slate-50 transition-colors"
                style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
              >
                <Grid3X3 className="w-4 h-4" style={{ color: "#14B8A6" }} strokeWidth={1.8} />
                合并分镜组
              </button>
            </div>
          )}
        </div>

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
