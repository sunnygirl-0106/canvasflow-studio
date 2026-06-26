import { memo, useRef, useState } from "react";
import {
  ChevronDown,
  ArrowUp,
  Loader2,
  Sparkles,
  Clapperboard,
  Plus,
  Upload,
  ImageIcon,
} from "lucide-react";
import { placeholderImage } from "@canvasflow/shared";
import type { StoryboardNodeData } from "@/store/canvasStore";
import { useCanvas } from "@/store/canvasStore";
import {
  storyboardSlotSize,
  storyboardSize,
  SB_PAD_X,
  SB_HEADER_H,
  SB_PAD_BOTTOM,
  SB_CELL_GAP_X,
  SB_CELL_GAP_Y,
} from "@/lib/container";
import { NODE_COLORS as COLORS } from "./nodeTheme";

// Dark-theme container palette (matches the node body cards).
const SB_BG = "#1B1D21";
const SB_BORDER = "#2E3138";
const SB_CELL_EMPTY = "#161719";
const SB_CELL_BORDER = "#26282D";
const SB_PLUS = "#4B5563";
const SB_TITLE = "#9CA3AF";

export const StoryboardGroupNode = memo(StoryboardGroupNodeImpl);

function StoryboardGroupNodeImpl({ id, data }: { id: string; data: StoryboardNodeData }) {
  const sb = data.storyboard;
  const batchVideoSbId = useCanvas((s) => s.batchVideoSbId);
  const setBatchVideoSbId = useCanvas((s) => s.setBatchVideoSbId);
  const batchGenerateVideo = useCanvas((s) => s.batchGenerateVideo);
  const addMember = useCanvas((s) => s.addStoryboardMember);
  const [generating, setGenerating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!sb) return null;

  const { rows, cols, ratio, memberIds } = sb;
  const { w: cw, h: ch } = storyboardSlotSize(ratio);
  const { width } = storyboardSize(rows, cols, ratio);
  const filledCount = memberIds.length;
  const total = rows * cols;
  // The first empty slot doubles as the "append" affordance.
  const appendIdx = filledCount < total ? filledCount : -1;

  // Position of the append cell (relative to the container), to anchor the menu.
  const appendCol = appendIdx >= 0 ? appendIdx % cols : 0;
  const appendRow = appendIdx >= 0 ? Math.floor(appendIdx / cols) : 0;
  const appendX = SB_PAD_X + appendCol * (cw + SB_CELL_GAP_X) + cw / 2;
  const appendY = SB_HEADER_H + appendRow * (ch + SB_CELL_GAP_Y) + ch / 2;

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addMember(id, { src: URL.createObjectURL(file) });
    e.target.value = "";
    setMenuOpen(false);
  };

  return (
    <div
      className="fade-in group relative overflow-visible"
      style={{
        width,
        background: SB_BG,
        borderRadius: 14,
        // Inset ring instead of a border so it doesn't shift the content box —
        // keeps the grid cells pixel-aligned with the absolutely-positioned members.
        boxShadow: `inset 0 0 0 1px ${SB_BORDER}, 0 18px 40px rgba(0,0,0,0.35)`,
      }}
    >
      {/* No connection handles — like the asset group (资产组), the storyboard is
          a purely visual container around its real member nodes. Real edges run
          from the members, not the container. */}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />

      {/* Title — sits OUTSIDE, above the box (like the screenshot). Name and
          count are separated by a dot so a name ending in a digit (e.g.
          "分镜组 1") doesn't visually merge with the count ("1" + "5" → "15"). */}
      <div className="absolute" style={{ top: -26, left: 2 }}>
        <span
          className="text-[13px] font-medium whitespace-nowrap"
          style={{ color: SB_TITLE, fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {data.name ?? "分镜组"}
          <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>
          {filledCount} 个节点
        </span>
      </div>

      {/* Grid skeleton — empty-slot placeholders. Filled slots are covered by the
          real member nodes painted on top (this container is behind them). */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${cw}px)`,
          gridTemplateRows: `repeat(${rows}, ${ch}px)`,
          gap: `${SB_CELL_GAP_Y}px ${SB_CELL_GAP_X}px`,
          padding: `${SB_HEADER_H}px ${SB_PAD_X}px ${SB_PAD_BOTTOM}px`,
        }}
      >
        {Array.from({ length: total }, (_, idx) => {
          const filled = idx < filledCount;
          const isAppend = idx === appendIdx;
          return (
            <div
              key={idx}
              className={`rounded-lg flex items-center justify-center ${isAppend ? "nodrag" : ""}`}
              style={{
                width: cw,
                height: ch,
                background: filled ? "transparent" : SB_CELL_EMPTY,
                border: filled ? undefined : `1px solid ${SB_CELL_BORDER}`,
                cursor: isAppend ? "pointer" : "default",
              }}
              onClick={
                isAppend
                  ? (e) => {
                      e.stopPropagation();
                      setMenuOpen(true);
                    }
                  : undefined
              }
            >
              {!filled && (
                <Plus
                  className="w-6 h-6"
                  style={{ color: isAppend ? COLORS.muted : SB_PLUS }}
                  strokeWidth={1.6}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Append menu (从本地上传图片 / 从历史记录中选择) */}
      {menuOpen && appendIdx >= 0 && (
        <AddMemberMenu
          x={appendX}
          y={appendY}
          onClose={() => setMenuOpen(false)}
          onUpload={() => fileRef.current?.click()}
          onHistory={() => {
            addMember(id, { src: placeholderImage(`sb-${id}-${filledCount}`, 640, 360) });
            setMenuOpen(false);
          }}
        />
      )}

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
    </div>
  );
}

function AddMemberMenu({
  x,
  y,
  onClose,
  onUpload,
  onHistory,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onUpload: () => void;
  onHistory: () => void;
}) {
  return (
    <>
      {/* Click-away backdrop */}
      <div
        className="fixed inset-0 nodrag"
        style={{ zIndex: 40 }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        className="absolute nodrag nowheel"
        style={{
          left: x,
          top: y,
          transform: "translate(-50%, -8px)",
          zIndex: 50,
          minWidth: 220,
          background: "#FFFFFF",
          borderRadius: 16,
          boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
          padding: 8,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <MenuRow
          icon={<Upload className="w-[18px] h-[18px]" strokeWidth={1.8} />}
          label="从本地上传图片"
          onClick={onUpload}
        />
        <MenuRow
          icon={<ImageIcon className="w-[18px] h-[18px]" strokeWidth={1.8} />}
          label="从历史记录中选择"
          onClick={onHistory}
        />
      </div>
    </>
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
      className="w-full flex items-center gap-3 rounded-xl transition-colors hover:bg-gray-100"
      style={{
        padding: "12px 14px",
        color: "#1F2937",
        fontFamily: "PingFang SC, Inter, system-ui",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span style={{ color: "#6B7280" }}>{icon}</span>
      <span className="text-[15px]">{label}</span>
    </button>
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
