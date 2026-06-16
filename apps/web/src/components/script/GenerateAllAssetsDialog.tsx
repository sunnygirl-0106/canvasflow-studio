import { useState } from "react";
import { X, Zap } from "lucide-react";
import type { ScriptAsset } from "@/store/types";

interface Props {
  open: boolean;
  assets: ScriptAsset[];
  onGenerate: (assetIds: string[]) => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  character: "角色",
  scene: "场景",
  prop: "道具",
};

const TYPE_ORDER: ScriptAsset["type"][] = ["character", "scene", "prop"];

export function GenerateAllAssetsDialog({ open, assets, onGenerate, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(assets.filter((a) => !a.image).map((a) => a.id)),
  );

  if (!open) return null;

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
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div
        className="rounded-2xl flex flex-col"
        style={{
          width: 640,
          maxHeight: "75vh",
          background: "#FFFFFF",
          boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
          fontFamily: "PingFang SC, Inter, system-ui",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: "20px 24px 12px" }}
        >
          <span className="text-[16px] font-semibold" style={{ color: "#0F172A" }}>
            一键生成所有资产
          </span>
          <button
            className="flex items-center justify-center rounded-lg hover:bg-slate-100"
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
            style={{ color: "#374151" }}
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
                  className="flex items-center gap-3 rounded-lg transition-colors hover:bg-slate-50"
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #F1F5F9",
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
                    style={{ color: "#334155", minWidth: 60 }}
                  >
                    {asset.name}
                  </span>
                  {asset.image && (
                    <span
                      className="text-[11px] rounded px-1.5 py-0.5"
                      style={{
                        background: "#ECFDF5",
                        color: "#059669",
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
            borderTop: "1px solid #F1F5F9",
            background: "#FAFAFA",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#6B7280" }}>
              <span>模型:</span>
              <span style={{ color: "#334155" }}>FLUX</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#6B7280" }}>
              <span>画质:</span>
              <span style={{ color: "#334155" }}>高清</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
              <span className="text-[12px]" style={{ color: "#6B7280" }}>
                {selected.size * 12}
              </span>
            </div>
          </div>
          <button
            className="text-[13px] font-semibold rounded-lg text-white transition-colors hover:opacity-90 disabled:opacity-40"
            style={{
              padding: "8px 24px",
              background: "#1F2937",
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
  );
}
