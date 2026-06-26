import { useCallback, useEffect, useRef, useState } from "react";
import { NodeToolbar, Position, useOnSelectionChange, type Node as RFNode } from "@xyflow/react";
import { Group, Grid3X3, FolderOpen, Trash2, Copy, CopyPlus, ChevronDown } from "lucide-react";
import { useCanvas, type NodeKind } from "@/store/canvasStore";

const MEDIA_KINDS: NodeKind[] = ["image", "generateImage", "generateVideo", "audio"];

// Dark toolbar palette (matches the canvas dark chrome).
const BAR_BG = "#26282E";
const BAR_BORDER = "#3A3D44";
const BAR_TEXT = "#E5E7EB";
const BAR_SEP = "#3A3D44";

/**
 * Floating CTA that appears when the user box-selects ≥2 media nodes.
 * Actions: 打组 (with a 合并分镜组 dropdown) · 删除 · 复制 · 创建副本.
 */
export function MultiSelectionCTA() {
  const createGroupFn = useCanvas((s) => s.createGroup);
  const mergeStoryboard = useCanvas((s) => s.mergeToStoryboard);
  const removeNodes = useCanvas((s) => s.removeNodes);
  const duplicateNodes = useCanvas((s) => s.duplicateNodes);
  const copyNodes = useCanvas((s) => s.copyNodes);
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
  const canGroup = selectedMedia.every((n) => n.type === "image" || n.type === "generateImage");

  const done = () => {
    setSelectedMedia([]);
    setDropdownOpen(false);
  };

  const handleCreateGroup = () => {
    createGroupFn(ids);
    done();
  };
  const handleMergeStoryboard = () => {
    mergeStoryboard(ids);
    done();
  };
  const handleDelete = () => {
    removeNodes(ids);
    done();
  };
  const handleCopy = () => {
    copyNodes(ids);
    done();
  };
  const handleDuplicate = () => {
    duplicateNodes(ids);
    done();
  };

  return (
    // Anchor the bar to the top edge of the selection's bounding box (instead of
    // the viewport top) so it stays next to the framed nodes and the user can
    // always find it. NodeToolbar accepts an array of ids and tracks their rect.
    <NodeToolbar nodeId={ids} isVisible position={Position.Top} offset={12}>
      <div
        className="inline-flex items-center rounded-full fade-in"
        style={{
          height: 44,
          padding: "0 6px",
          background: BAR_BG,
          border: `1px solid ${BAR_BORDER}`,
          boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
        }}
      >
        {/* 打组 (with 合并分镜组 dropdown) — only when all selected are images */}
        {canGroup && (
          <>
            <div className="relative" ref={dropdownRef}>
              <BarButton
                icon={<Group className="w-3.5 h-3.5" strokeWidth={1.8} />}
                label="打组"
                trailing={<ChevronDown className="w-3 h-3" strokeWidth={2.2} />}
                onClick={() => setDropdownOpen((v) => !v)}
                active={dropdownOpen}
              />
              {dropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-2 rounded-xl overflow-hidden z-50"
                  style={{
                    minWidth: 168,
                    background: BAR_BG,
                    border: `1px solid ${BAR_BORDER}`,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  <MenuRow
                    icon={
                      <FolderOpen
                        className="w-4 h-4"
                        style={{ color: "#56C7CF" }}
                        strokeWidth={1.8}
                      />
                    }
                    label="打组"
                    onClick={handleCreateGroup}
                  />
                  <MenuRow
                    icon={
                      <Grid3X3 className="w-4 h-4" style={{ color: "#14B8A6" }} strokeWidth={1.8} />
                    }
                    label="合并分镜组"
                    onClick={handleMergeStoryboard}
                  />
                </div>
              )}
            </div>
            <Sep />
          </>
        )}

        <BarButton
          icon={<Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />}
          label="删除"
          onClick={handleDelete}
        />
        <Sep />
        <BarButton
          icon={<Copy className="w-3.5 h-3.5" strokeWidth={1.8} />}
          label="复制"
          onClick={handleCopy}
        />
        <Sep />
        <BarButton
          icon={<CopyPlus className="w-3.5 h-3.5" strokeWidth={1.8} />}
          label="创建副本"
          onClick={handleDuplicate}
        />
      </div>
    </NodeToolbar>
  );
}

function BarButton({
  icon,
  label,
  trailing,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full h-8 px-3 transition-colors"
      style={{
        color: BAR_TEXT,
        background: active ? "rgba(255,255,255,0.08)" : "transparent",
        fontFamily: "PingFang SC, Inter, system-ui",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = active ? "rgba(255,255,255,0.08)" : "transparent")
      }
    >
      {icon}
      <span className="text-[13px] font-medium">{label}</span>
      {trailing}
    </button>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium transition-colors"
      style={{ color: BAR_TEXT, fontFamily: "PingFang SC, Inter, system-ui" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      {label}
    </button>
  );
}

function Sep() {
  return (
    <span className="inline-block mx-0.5" style={{ width: 1, height: 18, background: BAR_SEP }} />
  );
}
