import type { ReactNode } from "react";
import { ChevronDown, Sliders, ArrowUp } from "lucide-react";

/**
 * Shared floating prompt panel used below nodes. Holds the exact card chrome —
 * model selector, params button, cost footer and the round send button — plus
 * all the pointer/keyboard interactions. Callers wire their own data:
 * ImagePromptPanel drives it with image-node state; the script node drives it
 * with script state. This keeps a single source of truth for the look & feel.
 */
export interface PromptPanelProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  placeholder: string;
  model: string;
  onSend: () => void;
  /** Disable the send button (e.g. while generating or with no input). */
  canSend?: boolean;
  /** Show the "参数" adjuster button. Defaults to true. */
  showParams?: boolean;
  width?: number;
  /** Optional row rendered above the prompt card (e.g. image "主图参与生成"). */
  topSlot?: ReactNode;
  /** Optional chips row inside the card (e.g. upstream image mounts). */
  chips?: ReactNode;
  /** Footer content shown left of the send button (e.g. cost estimate). */
  cost?: ReactNode;
  /** Minimum height of the prompt textarea. Defaults to 72. */
  textareaMinHeight?: number;
}

export function PromptPanel({
  prompt,
  onPromptChange,
  placeholder,
  model,
  onSend,
  canSend = true,
  showParams = true,
  width = 560,
  topSlot,
  chips,
  cost,
  textareaMinHeight = 72,
}: PromptPanelProps) {
  return (
    <div
      className="flex flex-col"
      style={{ width, gap: 10 }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {topSlot}

      {/* Prompt card */}
      <div
        className="rounded-2xl flex flex-col"
        style={{
          background: "#1F2125",
          border: "1px solid #2A2D33",
          padding: "14px 18px",
          gap: 12,
        }}
      >
        {chips}

        {/* Textarea */}
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && canSend) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          className="w-full resize-none outline-none bg-transparent"
          style={{
            minHeight: textareaMinHeight,
            fontSize: 14,
            color: "#E5E7EB",
            fontFamily: "PingFang SC, Inter, system-ui",
            border: "none",
          }}
        />

        {/* Bottom row */}
        <div className="flex items-center gap-3">
          {/* Model selector */}
          <button
            className="flex items-center gap-1.5 rounded-lg"
            style={{ padding: "6px 10px", background: "transparent" }}
          >
            <span
              className="inline-flex items-center justify-center rounded-md"
              style={{ width: 16, height: 16 }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#14B8A6" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <circle cx="12" cy="12" r="8" strokeDasharray="2 2" opacity="0.6" />
              </svg>
            </span>
            <span
              className="text-[13px] font-semibold truncate"
              style={{ color: "#E5E7EB", maxWidth: 110 }}
            >
              {model}
            </span>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: "#6B7280" }} strokeWidth={2} />
          </button>

          {showParams && (
            <>
              {/* Divider */}
              <span
                className="inline-block"
                style={{ width: 1, height: 16, background: "#2A2D33" }}
              />

              {/* Params */}
              <button
                className="flex items-center gap-1.5 rounded-lg"
                style={{ padding: "6px 10px", background: "transparent" }}
              >
                <Sliders className="w-4 h-4" style={{ color: "#9CA3AF" }} strokeWidth={1.8} />
                <span className="text-[13px] font-medium" style={{ color: "#E5E7EB" }}>
                  参数
                </span>
              </button>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cost */}
          {cost}

          {/* Submit */}
          <button
            onClick={onSend}
            disabled={!canSend}
            className="flex items-center justify-center rounded-full transition-opacity hover:opacity-85"
            style={{
              width: 32,
              height: 32,
              background: "#F1F5F9",
              opacity: canSend ? 1 : 0.5,
            }}
            aria-label="生成"
          >
            <ArrowUp className="w-4 h-4" style={{ color: "#0F172A" }} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </div>
  );
}
