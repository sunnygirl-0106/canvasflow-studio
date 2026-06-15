import { useState, useRef } from "react";
import { X } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";

interface Props {
  nodeId: string;
  assetId: string;
  onClose: () => void;
}

type Tab = "ai" | "canvas" | "upload";

export function ImagePickerModal({ nodeId, assetId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("canvas");
  const updateAsset = useCanvas((s) => s.updateAsset);
  const nodes = useCanvas((s) => s.nodes);
  const fileRef = useRef<HTMLInputElement>(null);

  const canvasImages = nodes
    .filter(
      (n) =>
        (n.kind === "image" || n.kind === "generateImage") && n.data.src,
    )
    .map((n) => ({ id: n.id, src: n.data.src!, name: n.data.name ?? n.id }));

  const selectImage = (src: string) => {
    updateAsset(nodeId, assetId, { image: src });
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") selectImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "ai", label: "AI 生成" },
    { key: "canvas", label: "从画布选择" },
    { key: "upload", label: "本地上传" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div
        className="rounded-2xl flex flex-col"
        style={{
          width: 640,
          maxHeight: "70vh",
          background: "#FFFFFF",
          boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
          fontFamily: "PingFang SC, Inter, system-ui",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: "20px 24px 0" }}
        >
          <span
            className="text-[16px] font-semibold"
            style={{ color: "#0F172A" }}
          >
            选择图片
          </span>
          <button
            className="flex items-center justify-center rounded-lg hover:bg-slate-100"
            style={{ width: 30, height: 30 }}
            onClick={onClose}
          >
            <X className="w-4 h-4" style={{ color: "#64748B" }} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 flex-shrink-0"
          style={{ padding: "16px 24px 0" }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              className="text-[13px] font-medium rounded-lg transition-colors"
              style={{
                padding: "6px 16px",
                background: tab === t.key ? "#F1F5F9" : "transparent",
                color: tab === t.key ? "#0F172A" : "#94A3B8",
              }}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-auto"
          style={{ padding: "16px 24px 24px" }}
        >
          {tab === "ai" && (
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                height: 200,
                background: "#F8FAFC",
                border: "1px dashed #E2E8F0",
                color: "#94A3B8",
              }}
            >
              <span className="text-[14px]">AI 生成即将上线</span>
            </div>
          )}

          {tab === "canvas" && (
            <div>
              {canvasImages.length === 0 ? (
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    height: 200,
                    background: "#F8FAFC",
                    border: "1px dashed #E2E8F0",
                    color: "#94A3B8",
                  }}
                >
                  <span className="text-[14px]">画布中暂无图片节点</span>
                </div>
              ) : (
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
                >
                  {canvasImages.map((img) => (
                    <button
                      key={img.id}
                      className="rounded-lg overflow-hidden transition-all hover:ring-2 hover:ring-blue-400"
                      style={{
                        aspectRatio: "1",
                        border: "1px solid #E5E7EB",
                      }}
                      onClick={() => selectImage(img.src)}
                    >
                      <img
                        src={img.src}
                        alt={img.name}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "upload" && (
            <div className="flex flex-col items-center gap-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
              <button
                className="rounded-xl transition-colors hover:bg-slate-50"
                style={{
                  width: "100%",
                  height: 200,
                  border: "2px dashed #D1D5DB",
                  color: "#6B7280",
                }}
                onClick={() => fileRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[32px]">+</span>
                  <span className="text-[14px]">
                    点击选择本地图片
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
