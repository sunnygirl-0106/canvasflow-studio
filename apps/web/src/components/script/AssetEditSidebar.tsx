import { useState } from "react";
import { DemoImg } from "@/components/DemoImg";
import { X, MoreHorizontal } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";
import { ImagePickerModal } from "./ImagePickerModal";

interface Props {
  nodeId: string;
  assetId: string;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  character: "角色",
  scene: "场景",
  prop: "道具",
};

export function AssetEditSidebar({ nodeId, assetId, onClose }: Props) {
  const asset = useCanvas((s) => {
    const node = s.nodes.find((n) => n.id === nodeId);
    if (!node || node.kind !== "script") return undefined;
    return node.data.script.assets?.find((a) => a.id === assetId);
  });
  const updateAsset = useCanvas((s) => s.updateAsset);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!asset) return null;

  const typeLabel = TYPE_LABELS[asset.type] ?? asset.type;

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        width: 400,
        borderLeft: "1px solid #E5E7EB",
        background: "#FFFFFF",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}
      >
        <span
          className="text-[15px] font-semibold"
          style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          编辑{typeLabel}
        </span>
        <button
          className="flex items-center justify-center rounded-lg hover:bg-gray-100"
          style={{ width: 28, height: 28 }}
          onClick={onClose}
        >
          <X className="w-4 h-4" style={{ color: "#6B7280" }} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto" style={{ padding: "20px" }}>
        {/* Image area */}
        <div className="relative mb-5">
          <div
            className="rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              width: "100%",
              aspectRatio: "1",
              background: "#F1F5F9",
              border: "1px solid #E2E8F0",
            }}
          >
            {asset.image ? (
              <DemoImg
                src={asset.image}
                alt={asset.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <span className="text-[14px]" style={{ color: "#94A3B8" }}>
                暂无图片
              </span>
            )}
          </div>
          <button
            className="absolute top-2 right-2 flex items-center justify-center rounded-lg transition-colors hover:bg-white/80"
            style={{
              width: 28,
              height: 28,
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setPickerOpen(true)}
          >
            <MoreHorizontal className="w-4 h-4" style={{ color: "#374151" }} />
          </button>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#6B7280" }}>
            名称
          </label>
          <input
            className="w-full rounded-lg text-[13px] outline-none transition-colors"
            style={{
              padding: "8px 12px",
              border: "1px solid #E5E7EB",
              color: "#1A1A1A",
            }}
            value={asset.name}
            onChange={(e) => updateAsset(nodeId, assetId, { name: e.target.value })}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#6B7280" }}>
            描述
          </label>
          <textarea
            className="w-full rounded-lg text-[13px] outline-none resize-none transition-colors"
            style={{
              padding: "8px 12px",
              minHeight: 120,
              border: "1px solid #E5E7EB",
              color: "#1A1A1A",
            }}
            value={asset.description ?? ""}
            onChange={(e) => updateAsset(nodeId, assetId, { description: e.target.value })}
          />
        </div>
      </div>

      {pickerOpen && (
        <ImagePickerModal nodeId={nodeId} assetId={assetId} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
