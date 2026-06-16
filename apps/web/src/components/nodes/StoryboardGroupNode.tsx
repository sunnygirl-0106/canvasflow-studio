import { useCallback, useRef, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Grid3X3, ChevronDown, ArrowUp, Loader2, Sparkles, Clapperboard } from "lucide-react";
import type { StoryboardNodeData, StoryboardCell } from "@/store/canvasStore";
import { STORYBOARD_CELL_PX, STORYBOARD_GAP_PX, useCanvas } from "@/store/canvasStore";
import { cellSize, cellLabel } from "@/lib/storyboard";
import { NODE_COLORS as COLORS } from "./nodeTheme";

export function StoryboardGroupNode({ id, data }: { id: string; data: StoryboardNodeData }) {
  const sb = data.storyboard;
  const reorderCells = useCanvas((s) => s.reorderStoryboardCells);
  const batchVideoSbId = useCanvas((s) => s.batchVideoSbId);
  const setBatchVideoSbId = useCanvas((s) => s.setBatchVideoSbId);
  const batchGenerateVideo = useCanvas((s) => s.batchGenerateVideo);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const dragFromIdx = useRef<number | null>(null);

  const onCellDragStart = useCallback((idx: number) => {
    dragFromIdx.current = idx;
  }, []);

  const onCellDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIdx(idx);
  }, []);

  const onCellDrop = useCallback(
    (e: React.DragEvent, toIdx: number) => {
      e.preventDefault();
      e.stopPropagation();
      const fromIdx = dragFromIdx.current;
      if (fromIdx != null && fromIdx !== toIdx) {
        reorderCells(id, fromIdx, toIdx);
      }
      dragFromIdx.current = null;
      setDragOverIdx(null);
    },
    [id, reorderCells],
  );

  const onCellDragEnd = useCallback(() => {
    dragFromIdx.current = null;
    setDragOverIdx(null);
  }, []);

  if (!sb) return null;

  const { rows, cols, ratio, showIndex, cells } = sb;
  const { w: cw, h: ch } = cellSize(ratio, STORYBOARD_CELL_PX);
  const gap = STORYBOARD_GAP_PX;
  const totalW = cols * cw + (cols - 1) * gap + 32;
  const filledCount = cells.filter((c) => c.src).length;

  return (
    <div
      className="fade-in group relative rounded-2xl overflow-visible"
      style={{
        width: totalW,
        background: "#FFFFFF",
        border: `2px solid ${COLORS.border}`,
        boxShadow: "0 18px 36px rgba(152,162,179,0.10)",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="sb-in"
        style={{ background: COLORS.handle }}
      />

      {/* Header */}
      <div className="flex items-center gap-2" style={{ padding: "14px 16px 10px" }}>
        <Grid3X3
          className="w-[16px] h-[16px] flex-shrink-0"
          style={{ color: COLORS.headerText }}
          strokeWidth={1.8}
        />
        <span
          className="text-[14px] font-semibold truncate"
          style={{ color: COLORS.headerText, fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {data.name ?? "分镜组"}
        </span>
        <span
          className="ml-auto text-[11px] font-medium"
          style={{ color: COLORS.subtitleText, fontFamily: "Inter, system-ui" }}
        >
          {filledCount}/{rows * cols} 格 · {rows}x{cols}
        </span>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${cw}px)`,
          gridTemplateRows: `repeat(${rows}, ${ch}px)`,
          gap,
          padding: `0 16px 14px`,
        }}
      >
        {cells.map((cell, idx) => (
          <CellSlot
            key={cell.id}
            cell={cell}
            idx={idx}
            showIndex={showIndex}
            w={cw}
            h={ch}
            isDragOver={dragOverIdx === idx}
            hasSrc={!!cell.src}
            onDragStart={onCellDragStart}
            onDragOver={onCellDragOver}
            onDrop={onCellDrop}
            onDragEnd={onCellDragEnd}
          />
        ))}
      </div>

      {/* Batch video bar */}
      {batchVideoSbId === id && (
        <BatchVideoBar
          cellCount={filledCount}
          generating={generating}
          onClose={() => setBatchVideoSbId(null)}
          onGenerate={() => {
            setGenerating(true);
            setTimeout(() => {
              batchGenerateVideo(id);
              setGenerating(false);
            }, 1500);
          }}
        />
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="sb-out"
        style={{ background: COLORS.handle }}
      />
    </div>
  );
}

function BatchVideoBar({
  cellCount,
  generating,
  onClose: _onClose,
  onGenerate,
}: {
  cellCount: number;
  generating: boolean;
  onClose: () => void;
  onGenerate: () => void;
}) {
  const costPerShot = 197;
  const totalCost = cellCount * costPerShot;

  return (
    <div
      className="flex items-center justify-center nodrag"
      style={{ padding: "8px 16px 14px" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="inline-flex items-center gap-2.5 rounded-full"
        style={{
          padding: "6px 6px 6px 14px",
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          fontFamily: "PingFang SC, Inter, system-ui",
          whiteSpace: "nowrap",
        }}
      >
        {/* Model */}
        <div className="flex items-center gap-1.5">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22C55E",
              flexShrink: 0,
            }}
          />
          <span className="text-[11px] font-semibold" style={{ color: "#334155" }}>
            SD 2.0
          </span>
          <ChevronDown className="w-3 h-3" style={{ color: "#94A3B8" }} />
        </div>

        <BarSep />

        <Clapperboard className="w-3.5 h-3.5" style={{ color: "#64748B" }} />

        <BarSep />

        <span className="text-[11px]" style={{ color: "#334155" }}>
          9:16 · 720p · 5s
        </span>

        <BarSep />

        <span className="text-[11px]" style={{ color: "#64748B" }}>
          全部 {cellCount} 个分镜
        </span>

        <BarSep />

        <span className="text-[11px]" style={{ color: "#0F766E" }}>
          本次预计消耗
        </span>

        <div className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
          <span className="text-[14px] font-bold" style={{ color: "#334155" }}>
            {totalCost}
          </span>
          <span className="text-[11px] font-medium" style={{ color: "#334155" }}>
            星钻
          </span>
        </div>

        {/* Generate */}
        <button
          className="flex items-center justify-center text-white transition-opacity disabled:opacity-40"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: cellCount > 0 ? "#334155" : "#CBD5E1",
          }}
          disabled={generating || cellCount === 0}
          onClick={onGenerate}
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function BarSep() {
  return <span className="inline-block" style={{ width: 1, height: 18, background: "#E2E8F0" }} />;
}

function CellSlot({
  cell,
  idx,
  showIndex,
  w,
  h,
  isDragOver,
  hasSrc,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  cell: StoryboardCell;
  idx: number;
  showIndex: boolean;
  w: number;
  h: number;
  isDragOver: boolean;
  hasSrc: boolean;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      className="relative rounded-lg overflow-hidden flex items-center justify-center nodrag"
      style={{
        width: w,
        height: h,
        background: isDragOver ? COLORS.dropHighlight : cell.src ? undefined : COLORS.emptyBg,
        outline: isDragOver ? `2px dashed ${COLORS.border}` : undefined,
        cursor: hasSrc ? "grab" : "default",
      }}
      draggable={hasSrc}
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(idx);
      }}
      onDragOver={(e) => onDragOver(e, idx)}
      onDrop={(e) => onDrop(e, idx)}
      onDragEnd={onDragEnd}
      onDragLeave={() => {}}
    >
      {cell.src ? (
        <img
          src={cell.src}
          alt={cell.name ?? ""}
          className="w-full h-full pointer-events-none"
          style={{ objectFit: "cover" }}
          draggable={false}
        />
      ) : (
        <span className="text-2xl font-light select-none" style={{ color: COLORS.emptyText }}>
          +
        </span>
      )}
      {showIndex && (
        <span
          className="absolute bottom-1 right-1 rounded px-1 py-0.5 text-[10px] font-medium leading-none"
          style={{
            background: COLORS.indexBg,
            color: COLORS.indexText,
            fontFamily: "Inter, system-ui",
          }}
        >
          {cellLabel(cell)}
        </span>
      )}
    </div>
  );
}
