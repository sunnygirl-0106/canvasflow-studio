import { useEffect, useState } from "react";
import { ArrowRight, Plus, User, Mountain, Box, Info, Loader2 } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";
import type { ScriptData, ScriptAsset } from "@/store/types";
import { AssetEditSidebar } from "./AssetEditSidebar";
import { GenerateAllAssetsDialog } from "./GenerateAllAssetsDialog";

interface Props {
  nodeId: string;
  script: ScriptData;
  onNext: () => void;
}

const SECTION_META: {
  type: ScriptAsset["type"];
  label: string;
  icon: typeof User;
}[] = [
  { type: "character", label: "角色", icon: User },
  { type: "scene", label: "场景", icon: Mountain },
  { type: "prop", label: "道具", icon: Box },
];

export function PrepareAssetsStep({ nodeId, script, onNext }: Props) {
  const extractAssets = useCanvas((s) => s.extractAssets);
  const addAsset = useCanvas((s) => s.addAsset);
  const generateAssets = useCanvas((s) => s.generateAssets);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const assets = script.assets ?? [];

  useEffect(() => {
    if (assets.length === 0) {
      extractAssets(nodeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missingCount = assets.filter((a) => !a.image).length;
  const allDone = assets.length > 0 && missingCount === 0;

  const handleAddNew = (type: ScriptAsset["type"]) => {
    const newAsset: ScriptAsset = {
      id: `asset-new-${Date.now()}`,
      name: "",
      type,
      description: "",
    };
    addAsset(nodeId, newAsset);
    setEditingAssetId(newAsset.id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 min-w-0 overflow-auto" style={{ padding: "0 0 16px" }}>
          {/* Global style */}
          <div className="mb-6">
            <span
              className="inline-flex items-center gap-1.5 rounded-lg text-[13px] font-medium"
              style={{
                padding: "8px 14px",
                background: "#F3F4F6",
                color: "#374151",
                border: "1px solid #E5E7EB",
              }}
            >
              全局风格: {script.globalStyle ?? "中国古风 \u00B7 电影质感"}
            </span>
          </div>

          {/* Asset sections */}
          {SECTION_META.map(({ type, label, icon: Icon }) => {
            const items = assets.filter((a) => a.type === type);
            return (
              <div key={type} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" style={{ color: "#6B7280" }} />
                  <span
                    className="text-[14px] font-semibold"
                    style={{
                      color: "#1F2937",
                      fontFamily: "PingFang SC, Inter, system-ui",
                    }}
                  >
                    {label}
                  </span>
                  <span className="text-[12px]" style={{ color: "#9CA3AF" }}>
                    ({items.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {items.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      selected={editingAssetId === asset.id}
                      onClick={() => setEditingAssetId(asset.id)}
                    />
                  ))}
                  <AddNewCard label={label} onClick={() => handleAddNew(type)} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        {editingAssetId && (
          <AssetEditSidebar
            nodeId={nodeId}
            assetId={editingAssetId}
            onClose={() => setEditingAssetId(null)}
          />
        )}
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: "16px 0 0" }}
      >
        {!allDone ? (
          <div
            className="flex items-center gap-2 text-[12px] rounded-lg"
            style={{
              padding: "8px 14px",
              background: "#FEF9C3",
              color: "#92400E",
              border: "1px solid #FDE68A",
            }}
          >
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            检测到 {missingCount} 个资产没有设定图片
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {!allDone && (
            <button
              className="flex items-center gap-1.5 text-[13px] font-semibold rounded-lg text-white transition-colors hover:opacity-90"
              style={{
                padding: "8px 20px",
                background: "#7C3AED",
              }}
              onClick={() => setGenerateDialogOpen(true)}
            >
              一键生成所有资产
            </button>
          )}
          <button
            className="flex items-center gap-1.5 text-[13px] font-semibold rounded-lg text-white transition-colors hover:opacity-90"
            style={{
              padding: "8px 20px",
              background: "#1F2937",
            }}
            onClick={onNext}
          >
            下一步: 合成提示词
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <GenerateAllAssetsDialog
        open={generateDialogOpen}
        assets={assets}
        onGenerate={(ids) => generateAssets(nodeId, ids)}
        onClose={() => setGenerateDialogOpen(false)}
      />
    </div>
  );
}

/* ── Asset Card ───────────────────────────────────────────────────── */

function AssetCard({
  asset,
  selected,
  onClick,
}: {
  asset: ScriptAsset;
  selected: boolean;
  onClick: () => void;
}) {
  const isGenerating = asset.generationStatus?.state === "generating";
  const progress =
    isGenerating && asset.generationStatus?.state === "generating"
      ? asset.generationStatus.progress
      : 0;

  return (
    <button
      className="flex flex-col items-center rounded-xl transition-all text-left"
      style={{
        width: 225,
        height: 165,
        background: "#FAFAFA",
        border: selected
          ? "2px solid #3B82F6"
          : "1px solid #E5E7EB",
        padding: 12,
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      {/* Image / placeholder / progress */}
      <div
        className="rounded-lg mb-2 overflow-hidden flex items-center justify-center relative"
        style={{
          width: "100%",
          height: 90,
          background: "#E5E7EB",
        }}
      >
        {asset.image ? (
          <img
            src={asset.image}
            alt={asset.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : isGenerating ? (
          <div className="flex flex-col items-center gap-1">
            <Loader2
              className="w-5 h-5 animate-spin"
              style={{ color: "#7C3AED" }}
            />
            <span className="text-[11px]" style={{ color: "#7C3AED" }}>
              {progress}%
            </span>
          </div>
        ) : (
          <span className="text-[24px]" style={{ color: "#D1D5DB" }}>
            ?
          </span>
        )}
        {isGenerating && (
          <div
            className="absolute bottom-0 left-0 h-1"
            style={{
              width: `${progress}%`,
              background: "#7C3AED",
              transition: "width 0.3s ease",
            }}
          />
        )}
      </div>

      {/* Name */}
      <span
        className="text-[13px] font-medium truncate w-full text-center"
        style={{ color: "#374151" }}
      >
        {asset.name || "未命名"}
      </span>
      {/* Description truncated */}
      {asset.description && (
        <span
          className="text-[11px] truncate w-full text-center mt-0.5"
          style={{ color: "#9CA3AF" }}
        >
          {asset.description}
        </span>
      )}
    </button>
  );
}

/* ── Add New Card ─────────────────────────────────────────────────── */

function AddNewCard({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex flex-col items-center justify-center rounded-xl transition-colors hover:bg-gray-50 cursor-pointer"
      style={{
        width: 225,
        height: 165,
        border: "1px dashed #D1D5DB",
      }}
      onClick={onClick}
    >
      <Plus className="w-6 h-6 mb-1" style={{ color: "#9CA3AF" }} />
      <span className="text-[12px]" style={{ color: "#9CA3AF" }}>
        新增{label}
      </span>
    </button>
  );
}
