import { useEffect, useRef, useState } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import {
  ChevronDown,
  Hash,
  Trash2,
  Ungroup,
  FolderOpen,
  Layers,
  RefreshCw,
  PlaySquare,
  Download,
  LayoutGrid,
} from "lucide-react";
import { useCanvas, STORYBOARD_CELL_PX, STORYBOARD_GAP_PX } from "@/store/canvasStore";
import { cellSize } from "@/lib/storyboard";
import { RatioMenu } from "./RatioMenu";
import { GridSizeMenu } from "./GridSizeMenu";
import { StitchMenu } from "./StitchMenu";
import { ConfirmDialog } from "./ConfirmDialog";

const TOOLBAR_GAP = 12;

export function StoryboardToolbar() {
  // Read selectedId + nodes directly from store — immediate on any click
  const selectedId = useCanvas((s) => s.selectedId);
  const nodes = useCanvas((s) => s.nodes);
  const selectedSb = selectedId
    ? nodes.find((n) => n.id === selectedId && n.kind === "storyboard") ?? null
    : null;

  const setStoryboardRatio = useCanvas((s) => s.setStoryboardRatio);
  const setStoryboardGrid = useCanvas((s) => s.setStoryboardGrid);
  const toggleStoryboardIndex = useCanvas((s) => s.toggleStoryboardIndex);
  const clearStoryboard = useCanvas((s) => s.clearStoryboard);
  const convertStoryboardToGroup = useCanvas((s) => s.convertStoryboardToGroup);
  const ungroupStoryboard = useCanvas((s) => s.ungroupStoryboard);
  const stitchStoryboard = useCanvas((s) => s.stitchStoryboard);
  const setBatchVideoSbId = useCanvas((s) => s.setBatchVideoSbId);

  const { flowToScreenPosition } = useReactFlow();
  // subscribe to viewport so position updates on pan/zoom
  useViewport();

  const [openMenu, setOpenMenu] = useState<"ratio" | "grid" | "stitch" | null>(null);
  const [confirmAction, setConfirmAction] = useState<"clear" | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Reset menu when selection changes
  useEffect(() => {
    setOpenMenu(null);
  }, [selectedId]);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);

  if (!selectedSb || !selectedSb.data.storyboard) return null;

  const sb = selectedSb.data.storyboard;
  const id = selectedSb.id;
  const isFromScript = !!selectedSb.data.scriptSourceId;

  // Calculate node width in canvas coords, then convert top-center to screen coords
  const { w: cw } = cellSize(sb.ratio, STORYBOARD_CELL_PX);
  const nodeW = sb.cols * cw + (sb.cols - 1) * STORYBOARD_GAP_PX + 32;
  const nodeCenterScreen = flowToScreenPosition({
    x: selectedSb.x + nodeW / 2,
    y: selectedSb.y,
  });

  // Get the ReactFlow container offset to compute relative position
  const flowContainer = document.querySelector(".react-flow") as HTMLElement | null;
  const containerRect = flowContainer?.getBoundingClientRect();
  const offsetX = containerRect?.left ?? 0;
  const offsetY = containerRect?.top ?? 0;

  const toolbarW = toolbarRef.current?.offsetWidth ?? 600;
  const toolbarH = toolbarRef.current?.offsetHeight ?? 44;

  const left = nodeCenterScreen.x - offsetX - toolbarW / 2;
  const top = nodeCenterScreen.y - offsetY - toolbarH - TOOLBAR_GAP;

  return (
    <>
      <div
        ref={toolbarRef}
        className="absolute z-50 pointer-events-auto inline-flex items-center gap-1 rounded-full fade-in"
        style={{
          left,
          top,
          height: 44,
          padding: "0 8px",
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          boxShadow: "0 12px 28px rgba(15,23,42,0.10)",
          whiteSpace: "nowrap",
        }}
      >
        {isFromScript ? (
          <>
            {/* Ratio toggle (visual only) */}
            <ToolbarBtn
              onClick={() => setOpenMenu(openMenu === "ratio" ? null : "ratio")}
              active={openMenu === "ratio"}
            >
              <span
                className="inline-block rounded-full"
                style={{ width: 20, height: 20, background: "#CBD5E1" }}
              />
            </ToolbarBtn>
            {openMenu === "ratio" && (
              <RatioMenu
                current={sb.ratio}
                onSelect={(r) => setStoryboardRatio(id, r)}
                onClose={() => setOpenMenu(null)}
              />
            )}

            <Sep />

            {/* Grid layout */}
            <ToolbarBtn
              onClick={() => setOpenMenu(openMenu === "grid" ? null : "grid")}
              active={openMenu === "grid"}
            >
              <LayoutGrid className="w-4 h-4" />
            </ToolbarBtn>
            {openMenu === "grid" && (
              <GridSizeMenu
                currentRows={sb.rows}
                currentCols={sb.cols}
                onSelect={(r, c) => setStoryboardGrid(id, r, c)}
                onClose={() => setOpenMenu(null)}
              />
            )}

            <Sep />

            {/* Regenerate */}
            <ToolbarBtn onClick={() => alert("重新生成（即将上线）")}>
              <RefreshCw className="w-3.5 h-3.5" />
              重新生成
            </ToolbarBtn>

            <Sep />

            {/* Batch generate video */}
            <ToolbarBtn onClick={() => setBatchVideoSbId(id)}>
              <PlaySquare className="w-3.5 h-3.5" />
              批量生成视频
            </ToolbarBtn>

            <Sep />

            {/* Ungroup */}
            <ToolbarBtn onClick={() => ungroupStoryboard(id)}>
              <Ungroup className="w-3.5 h-3.5" />
              解组
            </ToolbarBtn>

            <Sep />

            {/* Batch download */}
            <ToolbarBtn onClick={() => alert("批量下载（即将上线）")}>
              <Download className="w-3.5 h-3.5" />
              批量下载
            </ToolbarBtn>
          </>
        ) : (
          <>
            {/* Ratio */}
            <div className="relative">
              <ToolbarBtn
                onClick={() => setOpenMenu(openMenu === "ratio" ? null : "ratio")}
                active={openMenu === "ratio"}
              >
                {sb.ratio} <ChevronDown className="w-3 h-3" />
              </ToolbarBtn>
              {openMenu === "ratio" && (
                <RatioMenu
                  current={sb.ratio}
                  onSelect={(r) => setStoryboardRatio(id, r)}
                  onClose={() => setOpenMenu(null)}
                />
              )}
            </div>

            <Sep />

            {/* Grid size */}
            <div className="relative">
              <ToolbarBtn
                onClick={() => setOpenMenu(openMenu === "grid" ? null : "grid")}
                active={openMenu === "grid"}
              >
                宫格 {sb.rows}x{sb.cols} <ChevronDown className="w-3 h-3" />
              </ToolbarBtn>
              {openMenu === "grid" && (
                <GridSizeMenu
                  currentRows={sb.rows}
                  currentCols={sb.cols}
                  onSelect={(r, c) => setStoryboardGrid(id, r, c)}
                  onClose={() => setOpenMenu(null)}
                />
              )}
            </div>

            <Sep />

            {/* Stitch */}
            <div className="relative">
              <ToolbarBtn
                onClick={() => setOpenMenu(openMenu === "stitch" ? null : "stitch")}
                active={openMenu === "stitch"}
              >
                <Layers className="w-3.5 h-3.5" />
                拼接 <ChevronDown className="w-3 h-3" />
              </ToolbarBtn>
              {openMenu === "stitch" && (
                <StitchMenu
                  onSelect={(res) => stitchStoryboard(id, res)}
                  onClose={() => setOpenMenu(null)}
                />
              )}
            </div>

            <Sep />

            {/* Toggle index */}
            <ToolbarBtn
              onClick={() => toggleStoryboardIndex(id)}
              active={sb.showIndex}
              title="序号角标"
            >
              <Hash className="w-3.5 h-3.5" />
              序号
            </ToolbarBtn>

            <Sep />

            {/* Clear */}
            <ToolbarBtn onClick={() => setConfirmAction("clear")} title="清空分镜组">
              <Trash2 className="w-3.5 h-3.5" />
              清空
            </ToolbarBtn>

            <Sep />

            {/* Convert to group */}
            <ToolbarBtn onClick={() => convertStoryboardToGroup(id)} title="转普通组">
              <FolderOpen className="w-3.5 h-3.5" />
              转普通组
            </ToolbarBtn>

            <Sep />

            {/* Ungroup */}
            <ToolbarBtn onClick={() => ungroupStoryboard(id)} title="解组">
              <Ungroup className="w-3.5 h-3.5" />
              解组
            </ToolbarBtn>
          </>
        )}
      </div>

      {/* Confirm dialog for clear */}
      <ConfirmDialog
        open={confirmAction === "clear"}
        title="清空分镜组"
        message="确认清空所有宫格中的图片？此操作可撤销。"
        confirmLabel="清空"
        onConfirm={() => {
          clearStoryboard(id);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}

function ToolbarBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1 rounded-full h-8 px-3 text-[13px] font-medium transition-colors"
      style={{
        color: active ? "#0F766E" : "#334155",
        background: active ? "#F0FDFA" : "transparent",
        fontFamily: "PingFang SC, Inter, system-ui",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget.style.background = "#F8FAFC");
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget.style.background = "transparent");
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="inline-block" style={{ width: 1, height: 18, background: "#E5E7EB" }} />;
}
