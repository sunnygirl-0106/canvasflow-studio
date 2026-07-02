import { X, HelpCircle, Zap, RefreshCw } from "lucide-react";
import { useCanvas, type ScriptShot } from "@/store/canvasStore";
import { parseDescription } from "@/lib/assetUtils";

interface Props {
  shot: ScriptShot;
  nodeId: string;
  onClose: () => void;
}

/** Render prompt text with @asset mentions highlighted (linked to 准备资产 assets). */
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

export function FinalPromptModal({ shot, nodeId, onClose }: Props) {
  const composeFinalPrompts = useCanvas((s) => s.composeFinalPrompts);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rounded-2xl flex flex-col"
        style={{
          width: 640,
          maxHeight: "80vh",
          background: "#1F2125",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          fontFamily: "PingFang SC, Inter, system-ui",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: "20px 24px 16px" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-semibold" style={{ color: "#E5E7EB" }}>
              第 {shot.index} 镜：最终提示词
            </span>
            <HelpCircle className="w-4 h-4" style={{ color: "#94A3B8" }} />
          </div>
          <button
            className="flex items-center justify-center rounded-lg hover:bg-white/5"
            style={{ width: 30, height: 30 }}
            onClick={onClose}
          >
            <X className="w-4 h-4" style={{ color: "#64748B" }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto" style={{ padding: "0 24px 24px" }}>
          {/* Section 1: 分镜提示词 */}
          <div style={{ marginBottom: 20 }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[13px] font-medium" style={{ color: "#E5E7EB" }}>
                分镜提示词
              </span>
              <span
                className="text-[11px] rounded-full"
                style={{
                  padding: "2px 10px",
                  background: shot.imagePrompt ? "#132A1C" : "#2A2D33",
                  color: shot.imagePrompt ? "#4ADE80" : "#9CA3AF",
                }}
              >
                {shot.imagePrompt ? "分镜提示词·已生成" : "分镜提示词·待生成"}
              </span>
            </div>
            <div
              className="rounded-lg text-[13px]"
              style={{
                padding: "12px 16px",
                background: "#15171A",
                color: "#E5E7EB",
                lineHeight: 1.7,
                minHeight: 60,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {shot.imagePrompt ? (
                <PromptText text={shot.imagePrompt} />
              ) : (
                <span style={{ color: "#6B7280" }}>暂无内容</span>
              )}
            </div>
          </div>

          {/* Section 2: 视频运动提示词 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[13px] font-medium" style={{ color: "#E5E7EB" }}>
                视频运动提示词
              </span>
              <span
                className="text-[11px] rounded-full"
                style={{
                  padding: "2px 10px",
                  background: shot.videoPrompt ? "#132A1C" : "#2A2D33",
                  color: shot.videoPrompt ? "#4ADE80" : "#9CA3AF",
                }}
              >
                {shot.videoPrompt ? "视频运动提示词·已生成" : "视频运动提示词·待生成"}
              </span>
            </div>
            <div
              className="rounded-lg text-[13px]"
              style={{
                padding: "12px 16px",
                background: "#15171A",
                color: "#E5E7EB",
                lineHeight: 1.7,
                minHeight: 60,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {shot.videoPrompt ? (
                <PromptText text={shot.videoPrompt} />
              ) : (
                <span style={{ color: "#6B7280" }}>暂无内容</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #2A2D33",
          }}
        >
          <div className="flex items-center gap-1 text-[12px]" style={{ color: "#94A3B8" }}>
            <Zap className="w-3.5 h-3.5" />
            <span>1</span>
          </div>
          <button
            className="flex items-center gap-2 text-[13px] font-semibold rounded-lg transition-colors hover:opacity-90"
            style={{ padding: "8px 20px", background: "#14B8A6", color: "#0B1220" }}
            onClick={() => {
              composeFinalPrompts(nodeId, [shot.id]);
              onClose();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重新合成提示词
          </button>
        </div>
      </div>
    </div>
  );
}
