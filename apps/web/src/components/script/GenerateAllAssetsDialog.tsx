import { useState } from "react";
import { X, ImageIcon, ChevronDown, Sliders } from "lucide-react";
import type { ScriptAsset } from "@/store/types";
import { estimateImageCost } from "@/lib/cost";

interface Props {
  open: boolean;
  assets: ScriptAsset[];
  onGenerate: (assetIds: string[]) => void;
  onClose: () => void;
  /** Image model used for the estimate; matches the canvas image node default. */
  model?: string;
}

const TYPE_LABELS: Record<string, string> = {
  character: "角色",
  scene: "场景",
  prop: "道具",
};

const TYPE_ORDER: ScriptAsset["type"][] = ["character", "scene", "prop"];

export function GenerateAllAssetsDialog({
  open,
  assets,
  onGenerate,
  onClose,
  model = "phan-nano-l",
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(assets.filter((a) => !a.image).map((a) => a.id)),
  );

  if (!open) return null;

  // Cost mirrors what each materialized image node would show on the canvas:
  // the sum of per-asset estimateImageCost over the selected assets.
  const totalCost = assets
    .filter((a) => selected.has(a.id))
    .reduce((sum, a) => sum + estimateImageCost(a.description ?? "", model), 0);

  const allSelected = selected.size === assets.length && assets.length > 0;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(assets.map((a) => a.id)));
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    items: assets.filter((a) => a.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="rounded-2xl flex flex-col"
        style={{
          width: 640,
          maxHeight: "75vh",
          background: "#1F2125",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          fontFamily: "PingFang SC, Inter, system-ui",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: "20px 24px 12px" }}
        >
          <span className="text-[16px] font-semibold" style={{ color: "#E5E7EB" }}>
            一键生成所有资产
          </span>
          <button
            className="flex items-center justify-center rounded-lg hover:bg-white/5"
            style={{ width: 30, height: 30 }}
            onClick={onClose}
          >
            <X className="w-4 h-4" style={{ color: "#64748B" }} />
          </button>
        </div>

        {/* Select all */}
        <div className="flex items-center gap-3 flex-shrink-0" style={{ padding: "0 24px 12px" }}>
          <label
            className="flex items-center gap-2 cursor-pointer text-[13px]"
            style={{ color: "#E5E7EB" }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-teal-600"
            />
            全选
          </label>
          <span className="text-[13px]" style={{ color: "#9CA3AF" }}>
            已选 {selected.size}/{assets.length}
          </span>
        </div>

        {/* Asset list by type */}
        <div className="flex-1 overflow-auto" style={{ padding: "0 24px" }}>
          {grouped.map((group) => (
            <div key={group.type} className="mb-4">
              <div className="text-[12px] font-semibold mb-1" style={{ color: "#6B7280" }}>
                {group.label} ({group.items.length})
              </div>
              {group.items.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 rounded-lg transition-colors hover:bg-white/5"
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #2A2D33",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(asset.id)}
                    onChange={() => toggle(asset.id)}
                    className="w-4 h-4 rounded accent-teal-600 flex-shrink-0"
                  />
                  <span
                    className="text-[13px] font-medium flex-shrink-0"
                    style={{ color: "#E5E7EB", minWidth: 60 }}
                  >
                    {asset.name}
                  </span>
                  {asset.image && (
                    <span
                      className="text-[11px] rounded px-1.5 py-0.5"
                      style={{
                        background: "#132A1C",
                        color: "#22C55E",
                      }}
                    >
                      已有图片
                    </span>
                  )}
                  <span className="text-[12px] flex-1 truncate" style={{ color: "#94A3B8" }}>
                    {asset.description ?? ""}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex items-center justify-between flex-shrink-0 rounded-b-2xl"
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #2A2D33",
            background: "#15171A",
          }}
        >
          {/* Left: model selector + params — aligned with the canvas image
              node prompt panel spec. */}
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 rounded-lg"
              style={{ padding: "6px 10px", background: "transparent" }}
            >
              <span
                className="inline-flex items-center justify-center rounded-md"
                style={{ width: 16, height: 16 }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="#14B8A6"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="12" cy="12" r="8" strokeDasharray="2 2" opacity="0.6" />
                </svg>
              </span>
              <span
                className="text-[13px] font-semibold truncate"
                style={{ color: "#E5E7EB", maxWidth: 120 }}
              >
                {model}
              </span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "#6B7280" }} strokeWidth={2} />
            </button>
            <span className="inline-block" style={{ width: 1, height: 16, background: "#2A2D33" }} />
            <button
              className="flex items-center gap-1.5 rounded-lg"
              style={{ padding: "6px 10px", background: "transparent" }}
            >
              <Sliders className="w-4 h-4" style={{ color: "#9CA3AF" }} strokeWidth={1.8} />
              <span className="text-[13px] font-medium" style={{ color: "#E5E7EB" }}>
                参数
              </span>
            </button>
          </div>

          {/* Right: predicted star-diamond cost + generate. */}
          <div className="flex items-center gap-4">
            <div
              className="text-[12px] flex items-center gap-1.5"
              style={{ color: "#9CA3AF", fontFamily: "PingFang SC, Inter, system-ui" }}
            >
              <ImageIcon className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} strokeWidth={1.8} />
              <span style={{ color: "#E5E7EB" }}>{selected.size}张</span>
              <span>预计消耗</span>
              <span className="text-[13px] font-bold" style={{ color: "#E5E7EB" }}>
                {totalCost}
              </span>
              <span style={{ color: "#E5E7EB" }}>星钻</span>
              <span className="text-[12px] font-semibold" style={{ color: "#22C55E" }}>
                已豁免
              </span>
            </div>
            <button
              className="text-[13px] font-semibold rounded-lg transition-colors hover:opacity-90 disabled:opacity-40"
              style={{
                padding: "8px 24px",
                background: "#14B8A6",
                color: "#0B1220",
              }}
              disabled={selected.size === 0}
              onClick={() => {
                onGenerate(Array.from(selected));
                onClose();
              }}
            >
              生成 ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
