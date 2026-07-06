import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ChevronUp, Loader2, Video } from "lucide-react";
import type { ScriptShot } from "@/store/types";
import { useEscape } from "@/lib/useDismiss";
import { parseDescription } from "@/lib/assetUtils";

const VIDEO_MODELS = ["Seedance 2.0 VIP", "Seedance 1.0", "Kling 1.5"];
const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"];
const RESOLUTIONS = ["720P", "1080P", "480P"];
interface Props {
  open: boolean;
  shots: ScriptShot[];
  onConfirm: (opts: {
    selectedShotIds: string[];
    model: string;
    aspectRatio: string;
    resolution: string;
    durations: Record<string, number>;
  }) => void;
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

export function BatchVideoDialog({ open, shots, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(shots.map((s) => s.id)));
  const [model, setModel] = useState(VIDEO_MODELS[0]);
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
  const [resolution, setResolution] = useState(RESOLUTIONS[0]);
  const [durations, setDurations] = useState<Record<string, number>>(() =>
    Object.fromEntries(shots.map((s) => [s.id, s.duration || 5])),
  );
  const [creating, setCreating] = useState(false);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelected(new Set(shots.map((s) => s.id)));
      setDurations(Object.fromEntries(shots.map((s) => [s.id, s.duration || 5])));
      setCreating(false);
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

  const setDuration = (id: string, val: number) => {
    setDurations((prev) => ({ ...prev, [id]: Math.max(1, Math.min(30, val)) }));
  };

  const handleConfirm = () => {
    if (selected.size === 0) return;
    setCreating(true);
    // Simulate creation delay (captcha + API call)
    setTimeout(() => {
      onConfirm({
        selectedShotIds: Array.from(selected),
        model,
        aspectRatio,
        resolution,
        durations,
      });
    }, 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
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
          style={{ padding: "24px 28px 16px" }}
        >
          <span className="text-[18px] font-semibold" style={{ color: "#E5E7EB" }}>
            批量生视频
          </span>
          <button
            className="flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
            style={{ width: 32, height: 32 }}
            onClick={onCancel}
          >
            <X className="w-5 h-5" style={{ color: "#64748B" }} />
          </button>
        </div>

        {/* Tips */}
        <div style={{ padding: "0 28px 12px" }}>
          <div
            className="rounded-lg text-[13px]"
            style={{
              padding: "10px 14px",
              background: "#15171A",
              color: "#9CA3AF",
              border: "1px solid #2A2D33",
            }}
          >
            会优先使用已生成的角色、场景和道具参考图，让视频更贴合分镜内容
          </div>
          <p className="text-[12px] mt-2" style={{ color: "#6B7280" }}>
            音频已默认开启，品质跟随视频品质。每镜时长为本次生成临时值，不写回脚本表格。
          </p>
        </div>

        {/* Shot list */}
        <div className="flex-1 overflow-auto" style={{ padding: "0 28px" }}>
          <div className="flex flex-col gap-2">
            {shots.map((shot) => (
              <ShotRow
                key={shot.id}
                shot={shot}
                checked={selected.has(shot.id)}
                duration={durations[shot.id] ?? shot.duration}
                onToggle={() => toggle(shot.id)}
                onDurationChange={(v) => setDuration(shot.id, v)}
              />
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex-shrink-0 flex items-center justify-between"
          style={{
            padding: "14px 28px",
            borderTop: "1px solid #2A2D33",
            marginTop: 12,
          }}
        >
          {/* Left: select all + settings */}
          <div className="flex items-center gap-4">
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

            {/* Model */}
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <rect
                  x="1"
                  y="3"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path d="M6 6L10 8L6 10V6Z" fill="#94A3B8" />
              </svg>
              <select
                className="text-[13px] font-semibold bg-transparent outline-none cursor-pointer appearance-none pr-4"
                style={{ color: "#CBD5E1" }}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {VIDEO_MODELS.map((m) => (
                  <option key={m} style={{ color: "#0F172A" }}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 -ml-3" style={{ color: "#94A3B8" }} />
            </div>

            <span style={{ width: 1, height: 18, background: "#2A2D33" }} />

            {/* Aspect ratio */}
            <div className="flex items-center gap-1.5">
              <Video className="w-4 h-4" style={{ color: "#94A3B8" }} />
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
              <ChevronDown className="w-3 h-3 -ml-3" style={{ color: "#94A3B8" }} />
            </div>

            <span style={{ width: 1, height: 18, background: "#2A2D33" }} />

            {/* Resolution */}
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <rect
                  x="2"
                  y="3"
                  width="12"
                  height="10"
                  rx="1.5"
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path d="M6 7H10M6 9H9" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <select
                className="text-[13px] bg-transparent outline-none cursor-pointer appearance-none pr-4"
                style={{ color: "#CBD5E1" }}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                {RESOLUTIONS.map((r) => (
                  <option key={r} style={{ color: "#0F172A" }}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 -ml-3" style={{ color: "#94A3B8" }} />
            </div>
          </div>

          {/* Right: confirm button */}
          <button
            className="flex items-center justify-center rounded-full text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{
              height: 42,
              padding: "0 24px",
              background: "#14B8A6",
              color: "#0B1220",
            }}
            disabled={selected.size === 0 || creating}
            onClick={handleConfirm}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                真人校验并创建中
              </>
            ) : (
              <>确认并创建视频生成器组 ({selected.size})</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Shot row ────────────────────────────────────────────────────────── */

function ShotRow({
  shot,
  checked,
  duration,
  onToggle,
  onDurationChange,
}: {
  shot: ScriptShot;
  checked: boolean;
  duration: number;
  onToggle: () => void;
  onDurationChange: (v: number) => void;
}) {
  // Prompt shown per row = 视频运动提示词 (falls back to 最终提示词 / description).
  const promptText = shot.videoPrompt || shot.finalPrompt || shot.description;
  return (
    <div
      className="flex items-start gap-3 rounded-xl transition-colors"
      style={{
        padding: "14px 16px",
        background: checked ? "#15171A" : "#191B1F",
        border: checked ? "1px solid #2F333A" : "1px solid #26292F",
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-4 h-4 rounded accent-teal-500 mt-0.5 flex-shrink-0"
      />

      {/* Shot info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[14px] font-semibold" style={{ color: "#E5E7EB" }}>
            镜头 {shot.index}
          </span>
        </div>
        <p
          className="text-[13px] leading-relaxed"
          style={{
            color: "#9CA3AF",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {promptText ? (
            <PromptText text={promptText} />
          ) : (
            <span style={{ color: "#6B7280" }}>待生成视频运动提示词</span>
          )}
        </p>
      </div>

      {/* Duration spinner */}
      <div
        className="flex items-center rounded-lg flex-shrink-0"
        style={{ border: "1px solid #2F333A" }}
      >
        <input
          type="text"
          className="text-[14px] font-medium text-center outline-none bg-transparent"
          style={{ width: 40, height: 36, color: "#E5E7EB" }}
          value={`${duration}s`}
          onChange={(e) => {
            const num = parseInt(e.target.value.replace(/\D/g, ""), 10);
            if (!isNaN(num)) onDurationChange(num);
          }}
        />
        <div className="flex flex-col border-l" style={{ borderColor: "#2F333A" }}>
          <button
            className="flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ width: 24, height: 18, borderBottom: "1px solid #2F333A" }}
            onClick={() => onDurationChange(duration + 1)}
          >
            <ChevronUp className="w-3 h-3" style={{ color: "#94A3B8" }} />
          </button>
          <button
            className="flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ width: 24, height: 18 }}
            onClick={() => onDurationChange(duration - 1)}
          >
            <ChevronDown className="w-3 h-3" style={{ color: "#94A3B8" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
