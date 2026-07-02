import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ArrowUp, Loader2 } from "lucide-react";
import type { ScriptShot } from "@/store/types";
import { useEscape } from "@/lib/useDismiss";
import { parseDescription } from "@/lib/assetUtils";
import { FinalPromptModal } from "@/components/script/FinalPromptModal";

const MODELS = ["nanobanana", "Flux Pro", "SDXL"];
const ASPECT_RATIOS = ["9:16 · 720p", "16:9 · 1080p", "1:1 · 720p"];

interface Props {
  open: boolean;
  nodeId: string;
  shots: ScriptShot[];
  onGenerate: (selectedShotIds: string[]) => void;
  onCancel: () => void;
}

/** Render prompt text with @asset mentions highlighted. */
function PromptText({ text }: { text: string }) {
  return (
    <>
      {parseDescription(text).map((seg, i) =>
        seg.type === "mention" ? (
          <span key={i} style={{ color: "#22D3EE" }}>
            @{seg.value}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </>
  );
}

export function GenerateStoryboardDialog({ open, nodeId, shots, onGenerate, onCancel }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(shots.map((s) => s.id)));
  const [model, setModel] = useState(MODELS[0]);
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
  const [generating, setGenerating] = useState(false);
  const [detailShotId, setDetailShotId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(new Set(shots.map((s) => s.id)));
      setGenerating(false);
      setDetailShotId(null);
    }
  }, [open, shots]);

  useEscape(onCancel, open);

  if (!open) return null;

  const allSelected = selected.size === shots.length && shots.length > 0;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(shots.map((s) => s.id)));
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const detailShot = detailShotId ? shots.find((s) => s.id === detailShotId) : null;

  const handleGenerate = () => {
    if (selected.size === 0) return;
    setGenerating(true);
    setTimeout(() => {
      onGenerate(Array.from(selected));
      setGenerating(false);
    }, 1500);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="rounded-2xl flex flex-col"
        style={{
          width: 720,
          maxHeight: "85vh",
          background: "#1F2125",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          fontFamily: "PingFang SC, Inter, system-ui",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: "22px 26px 14px" }}
        >
          <span className="text-[18px] font-semibold" style={{ color: "#E5E7EB" }}>
            分镜批量生图
          </span>
          <button
            className="flex items-center justify-center rounded-lg hover:bg-white/5"
            style={{ width: 32, height: 32 }}
            onClick={onCancel}
          >
            <X className="w-5 h-5" style={{ color: "#64748B" }} />
          </button>
        </div>

        {/* Tip */}
        <div style={{ padding: "0 26px 12px" }}>
          <div
            className="rounded-lg text-[13px]"
            style={{
              padding: "10px 14px",
              background: "#15171A",
              color: "#9CA3AF",
              border: "1px solid #2A2D33",
            }}
          >
            会优先使用已生成的角色、场景和道具参考图，让画面更贴合分镜内容
          </div>
        </div>

        {/* Shot list */}
        <div className="flex-1 overflow-auto" style={{ padding: "0 26px" }}>
          <div className="flex flex-col gap-2">
            {shots.map((shot) => {
              const checked = selected.has(shot.id);
              const promptText = shot.imagePrompt || shot.finalPrompt || shot.description;
              return (
                <div
                  key={shot.id}
                  className="flex items-center gap-3 rounded-xl transition-colors"
                  style={{
                    padding: "12px 16px",
                    background: checked ? "#15171A" : "#191B1F",
                    border: checked ? "1px solid #2F333A" : "1px solid #26292F",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(shot.id)}
                    className="w-4 h-4 rounded accent-teal-500 flex-shrink-0"
                  />
                  <span
                    className="text-[14px] font-semibold flex-shrink-0"
                    style={{ color: "#E5E7EB", width: 52 }}
                  >
                    镜头{shot.index}
                  </span>
                  <p
                    className="flex-1 min-w-0 text-[13px] leading-relaxed"
                    style={{
                      color: "#9CA3AF",
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {promptText ? (
                      <PromptText text={promptText} />
                    ) : (
                      <span style={{ color: "#6B7280" }}>待生成提示词</span>
                    )}
                  </p>
                  <button
                    className="text-[13px] font-medium flex-shrink-0 transition-colors hover:underline"
                    style={{ color: "#94A3B8" }}
                    onClick={() => setDetailShotId(shot.id)}
                  >
                    详情
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex-shrink-0 flex items-center"
          style={{
            padding: "14px 26px",
            borderTop: "1px solid #2A2D33",
            marginTop: 12,
            gap: 16,
          }}
        >
          {/* Select all */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-teal-500"
            />
            <span className="text-[13px] font-medium" style={{ color: "#CBD5E1" }}>
              已选 {selected.size}/{shots.length}
            </span>
          </label>

          <span style={{ width: 1, height: 18, background: "#2A2D33" }} />

          {/* Model selector */}
          <div className="flex items-center gap-2">
            <span
              style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }}
            />
            <select
              className="text-[13px] font-semibold bg-transparent outline-none cursor-pointer appearance-none pr-4"
              style={{ color: "#CBD5E1" }}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m} style={{ color: "#0F172A" }}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 -ml-3" style={{ color: "#94A3B8" }} />
          </div>

          <span style={{ width: 1, height: 18, background: "#2A2D33" }} />

          {/* Aspect ratio */}
          <div className="flex items-center gap-1.5">
            <select
              className="text-[13px] bg-transparent outline-none cursor-pointer appearance-none pr-4"
              style={{ color: "#CBD5E1" }}
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            >
              {ASPECT_RATIOS.map((r) => (
                <option key={r} style={{ color: "#0F172A" }}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 -ml-3" style={{ color: "#94A3B8" }} />
          </div>

          <div className="flex-1" />

          {/* Confirm button */}
          <button
            className="flex items-center justify-center rounded-full text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ height: 42, padding: "0 22px", background: "#14B8A6", color: "#0B1220" }}
            disabled={selected.size === 0 || generating}
            onClick={handleGenerate}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建中
              </>
            ) : (
              <>
                <ArrowUp className="w-4 h-4 mr-1.5" />
                确认并创建生成器组 ({selected.size})
              </>
            )}
          </button>
        </div>
      </div>

      {detailShot && (
        <FinalPromptModal
          shot={detailShot}
          nodeId={nodeId}
          onClose={() => setDetailShotId(null)}
        />
      )}
    </div>,
    document.body,
  );
}
