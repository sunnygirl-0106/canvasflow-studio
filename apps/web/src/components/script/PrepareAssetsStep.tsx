import { useEffect, useState } from "react";
import { DemoImg } from "@/components/DemoImg";
import { ArrowRight, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";
import type { ScriptData, ScriptAsset } from "@/store/types";
import { AssetEditSidebar } from "./AssetEditSidebar";
import { GenerateAllAssetsDialog } from "./GenerateAllAssetsDialog";

interface Props {
  nodeId: string;
  script: ScriptData;
  onNext: () => void;
}

/** Asset card box size — matches the large placeholder cards in the design. */
const CARD_WIDTH = 316;
const CARD_HEIGHT = 180;

const SECTION_META: {
  type: ScriptAsset["type"];
  label: string;
  /** Wording used in the bottom warning banner (角色 → 人物角色). */
  warnLabel: string;
}[] = [
  { type: "character", label: "角色", warnLabel: "人物角色" },
  { type: "scene", label: "场景", warnLabel: "场景" },
  { type: "prop", label: "道具", warnLabel: "道具" },
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

  // Per-type breakdown of assets still missing a set image, for the warning copy.
  const warningText = (() => {
    const parts = SECTION_META.map(({ type, warnLabel }) => {
      const n = assets.filter((a) => a.type === type && !a.image).length;
      return n > 0 ? `${n} 个${warnLabel}` : null;
    }).filter(Boolean);
    return `检测到有${parts.join("和")}没有设定图，您可以手动上传或AI批量生成`;
  })();

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
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <span
              className="inline-flex items-center rounded-md text-[13px] font-medium flex-shrink-0"
              style={{
                padding: "4px 10px",
                background: "#16302F",
                color: "#56C7CF",
              }}
            >
              全局风格
            </span>
            <span
              className="text-[13px]"
              style={{ color: "#D1D5DB", fontFamily: "PingFang SC, Inter, system-ui" }}
            >
              {script.globalStyle ??
                "中国古风 · 电影质感。冷暖对比布光，浅景深与胶片颗粒，服化道考究，整体沉稳克制。"}
            </span>
          </div>

          {/* Asset sections */}
          {SECTION_META.map(({ type, label }) => {
            const items = assets.filter((a) => a.type === type);
            return (
              <div key={type} className="mb-8">
                <div
                  className="mb-3 text-[15px] font-semibold"
                  style={{ color: "#E5E7EB", fontFamily: "PingFang SC, Inter, system-ui" }}
                >
                  {label}
                </div>
                <div className="flex flex-wrap items-start gap-4">
                  {items.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      typeLabel={label}
                      selected={editingAssetId === asset.id}
                      onClick={() => setEditingAssetId(asset.id)}
                    />
                  ))}
                  <AddNewCard onClick={() => handleAddNew(type)} />
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

      {/* Bottom bar — full-bleed separator, warning left, primary action right. */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ margin: "0 -24px", padding: "16px 24px 0", borderTop: "1px solid #2A2D33" }}
      >
        {!allDone ? (
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "#FCD34D" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {warningText}
          </div>
        ) : (
          <div />
        )}

        {allDone ? (
          <button
            className="flex items-center gap-1.5 text-[13px] font-semibold rounded-lg transition-colors hover:opacity-90"
            style={{ padding: "9px 20px", background: "#14B8A6", color: "#0B1220" }}
            onClick={onNext}
          >
            下一步: 合成提示词
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            className="flex items-center gap-1.5 text-[13px] font-semibold rounded-lg transition-opacity hover:opacity-90"
            style={{ padding: "9px 22px", background: "#F1F5F9", color: "#0B1220" }}
            onClick={() => setGenerateDialogOpen(true)}
          >
            一键生成所有资产
          </button>
        )}
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
  typeLabel,
  selected,
  onClick,
}: {
  asset: ScriptAsset;
  typeLabel: string;
  selected: boolean;
  onClick: () => void;
}) {
  const isGenerating = asset.generationStatus?.state === "generating";
  const progress =
    isGenerating && asset.generationStatus?.state === "generating"
      ? asset.generationStatus.progress
      : 0;

  return (
    <div style={{ width: CARD_WIDTH }}>
      {/* Image / placeholder box */}
      <button
        className="block w-full rounded-xl overflow-hidden transition-all relative text-center"
        style={{
          height: CARD_HEIGHT,
          background: "#15171A",
          border: selected
            ? "2px solid #14B8A6"
            : asset.image
              ? "1px solid #2A2D33"
              : "1px dashed #3F4248",
          cursor: "pointer",
        }}
        onClick={onClick}
      >
        {asset.image ? (
          <DemoImg
            src={asset.image}
            alt={asset.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : isGenerating ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#14B8A6" }} />
            <span className="text-[12px]" style={{ color: "#14B8A6" }}>
              {progress}%
            </span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[13px]" style={{ color: "#6B7280" }}>
              生成或上传{typeLabel}图
            </span>
          </div>
        )}
        {isGenerating && (
          <div
            className="absolute bottom-0 left-0 h-1"
            style={{ width: `${progress}%`, background: "#14B8A6", transition: "width 0.3s ease" }}
          />
        )}
      </button>

      {/* Name */}
      <div
        className="mt-2 text-[13px] font-semibold truncate"
        style={{ color: "#E5E7EB", fontFamily: "PingFang SC, Inter, system-ui" }}
      >
        {asset.name || "未命名"}
      </div>
      {/* Description — single truncated line */}
      {asset.description && (
        <div className="mt-0.5 text-[12px] truncate" style={{ color: "#9CA3AF" }}>
          {asset.description}
        </div>
      )}
    </div>
  );
}

/* ── Add New Card ─────────────────────────────────────────────────── */

function AddNewCard({ onClick }: { onClick: () => void }) {
  return (
    <div style={{ width: CARD_WIDTH }}>
      <button
        className="w-full flex flex-col items-center justify-center rounded-xl transition-colors hover:bg-white/5"
        style={{ height: CARD_HEIGHT, border: "1px dashed #3F4248", cursor: "pointer" }}
        onClick={onClick}
      >
        <Plus className="w-6 h-6 mb-1" style={{ color: "#6B7280" }} />
        <span className="text-[12px]" style={{ color: "#6B7280" }}>
          新增
        </span>
      </button>
    </div>
  );
}
