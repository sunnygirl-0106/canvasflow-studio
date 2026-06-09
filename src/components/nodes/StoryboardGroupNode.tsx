import { useCallback, useRef, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Grid3X3 } from "lucide-react";
import type { CanvasNode, StoryboardCell } from "@/store/canvasStore";
import { STORYBOARD_CELL_PX, STORYBOARD_GAP_PX, useCanvas } from "@/store/canvasStore";
import { cellSize, cellLabel } from "@/lib/storyboard";

const COLORS = {
  border: "#56C7CF",
  handle: "#14B8A6",
  headerText: "#0F172A",
  subtitleText: "#64748B",
  emptyBg: "#F1F5F9",
  emptyText: "#CBD5E1",
  indexBg: "rgba(255,255,255,0.85)",
  indexText: "#334155",
  dropHighlight: "rgba(86,199,207,0.25)",
};

export function StoryboardGroupNode({ id, data }: { id: string; data: CanvasNode["data"] }) {
  const sb = data.storyboard;
  const reorderCells = useCanvas((s) => s.reorderStoryboardCells);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
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

      <Handle
        type="source"
        position={Position.Right}
        id="sb-out"
        style={{ background: COLORS.handle }}
      />
    </div>
  );
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
