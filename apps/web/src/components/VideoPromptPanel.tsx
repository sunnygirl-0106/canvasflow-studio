import { useState } from "react";
import { Star, MonitorPlay, Sparkles, ArrowUp, ChevronDown } from "lucide-react";

const TABS = ["文生视频", "纯首帧", "首尾帧", "多模态参考"] as const;
type Tab = (typeof TABS)[number];

/**
 * Generation prompt panel that auto-shows below a selected video node
 * (mounted via React Flow's <NodeToolbar>). Visuals are static placeholders
 * for the eventual generation flow.
 */
export function VideoPromptPanel({ nodeName = "video 节点" }: { nodeName?: string }) {
  const [tab, setTab] = useState<Tab>("文生视频");
  const [prompt, setPrompt] = useState("");

  return (
    <div
      className="rounded-3xl flex flex-col"
      style={{
        width: 560,
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 18px 36px rgba(152,162,179,0.10)",
        padding: "20px 24px",
        gap: 16,
      }}
      // Prevent panel clicks from bubbling into React Flow (which would deselect the node)
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Tabs */}
      <div className="flex items-center gap-2">
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="rounded-full text-[13px] font-semibold transition-colors"
              style={{
                padding: "6px 14px",
                background: active ? "#0F172A" : "transparent",
                color: active ? "#FFFFFF" : "#475569",
                border: active ? "1px solid #0F172A" : "1px solid #E5E7EB",
                fontFamily: "PingFang SC, Inter, system-ui",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Reference chip */}
      <div>
        <span
          className="inline-flex items-center gap-2 rounded-lg"
          style={{
            padding: "4px 10px 4px 4px",
            background: "#F1F5F9",
            border: "1px solid #E2E8F0",
          }}
        >
          <span
            className="inline-flex items-center justify-center rounded-md text-[11px] font-bold text-white"
            style={{ width: 22, height: 22, background: "#14B8A6" }}
          >
            视
          </span>
          <span
            className="text-[13px] font-medium"
            style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            {nodeName}
          </span>
        </span>
      </div>

      {/* Prompt textarea */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="描述你想要生成的画面内容，输入 @ 引用素材"
        className="w-full resize-none outline-none"
        style={{
          minHeight: 72,
          fontSize: 14,
          color: "#0F172A",
          fontFamily: "PingFang SC, Inter, system-ui",
          background: "transparent",
          border: "none",
        }}
      />

      {/* Bottom options bar */}
      <div className="flex items-center gap-3">
        {/* Star */}
        <button
          className="flex items-center justify-center rounded-full hover:bg-slate-100"
          style={{ width: 32, height: 32 }}
          title="收藏"
        >
          <Star className="w-[18px] h-[18px]" style={{ color: "#475569" }} strokeWidth={1.8} />
        </button>

        {/* Model selector */}
        <button
          className="flex items-center gap-1.5 rounded-lg hover:bg-slate-100"
          style={{ padding: "6px 10px" }}
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, background: "#14B8A6" }}
          />
          <span
            className="text-[13px] font-semibold"
            style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            SD 2.0
          </span>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} strokeWidth={2} />
        </button>

        {/* Divider */}
        <span className="inline-block" style={{ width: 1, height: 16, background: "#E5E7EB" }} />

        {/* Aspect / resolution / duration */}
        <button
          className="flex items-center gap-1.5 rounded-lg hover:bg-slate-100"
          style={{ padding: "6px 10px" }}
        >
          <MonitorPlay
            className="w-[14px] h-[14px]"
            style={{ color: "#475569" }}
            strokeWidth={1.8}
          />
          <span
            className="text-[13px] font-medium"
            style={{ color: "#475569", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            9:16 · 720p · 5s
          </span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cost */}
        <div
          className="text-[12px] flex items-center gap-1.5"
          style={{ color: "#94A3B8", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          本次预计消耗
          <span
            className="text-[13px] font-bold inline-flex items-center gap-1"
            style={{ color: "#0F172A" }}
          >
            <Sparkles className="w-3 h-3" style={{ color: "#F59E0B" }} strokeWidth={2.2} />
            788 星钻
          </span>
          <span className="text-[11px] font-semibold" style={{ color: "#22C55E" }}>
            已豁免
          </span>
        </div>

        {/* Submit */}
        <button
          className="flex items-center justify-center rounded-full transition-opacity hover:opacity-85"
          style={{ width: 36, height: 36, background: "#0F172A" }}
          aria-label="生成"
        >
          <ArrowUp className="w-4 h-4" style={{ color: "#FFFFFF" }} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
