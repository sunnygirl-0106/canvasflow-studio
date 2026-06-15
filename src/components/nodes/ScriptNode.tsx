import { Handle, Position, NodeToolbar } from "@xyflow/react";
import { useState } from "react";
import {
  FileText,
  RefreshCw,
  AlertCircle,
  ImageIcon,
  Download,
  ChevronDown,
  ArrowUp,
  AlignLeft,
  Zap,
  ListOrdered,
  Check,
  ArrowRight,
  Video,
} from "lucide-react";
import {
  useCanvas,
  type CanvasNode,
  type ScriptData,
  type ScriptShot,
  type ScriptAsset,
  type WizardStep,
  SCRIPT_MODELS,
  SCRIPT_NODE_WIDTH,
} from "@/store/canvasStore";
import { GenerateStoryboardDialog } from "@/components/script/GenerateStoryboardDialog";
import { BatchVideoDialog } from "@/components/script/BatchVideoDialog";
import { NODE_COLORS as COLORS } from "./nodeTheme";

export function ScriptNode({ id, data }: { id: string; data: CanvasNode["data"] }) {
  const script = data.script as ScriptData | undefined;
  const openScript = useCanvas((s) => s.openScript);
  const generateScript = useCanvas((s) => s.generateScript);
  const cancelScript = useCanvas((s) => s.cancelScript);
  const regenerateScript = useCanvas((s) => s.regenerateScript);
  const updateNode = useCanvas((s) => s.updateNode);
  const edges = useCanvas((s) => s.edges);
  const nodes = useCanvas((s) => s.nodes);

  const [promptText, setPromptText] = useState(script?.promptText ?? "");
  const [showStoryboardDialog, setShowStoryboardDialog] = useState(false);
  const [showBatchVideoDialog, setShowBatchVideoDialog] = useState(false);
  const generateStoryboardFromScript = useCanvas((s) => s.generateStoryboardFromScript);
  const batchGenerateVideoFromScript = useCanvas((s) => s.batchGenerateVideoFromScript);

  if (!script) return null;

  const allPromptsDone =
    script.shots.length > 0 &&
    script.shots.every((s) => s.finalPromptStatus === "done");

  // Count connected text nodes
  const connectedTextCount = edges.filter((e) => {
    if (e.to !== id) return false;
    const src = nodes.find((n) => n.id === e.from);
    return src?.kind === "text" && !!src.data.text?.trim();
  }).length;

  const hasTextInput = connectedTextCount > 0;
  const hasSource = hasTextInput || !!script.sourceText?.trim();
  const canGenerate = hasSource && script.status !== "generating";
  const isGenerating = script.status === "generating";
  const isReady = script.status === "ready";

  const headerTitle = isReady ? (script.title || "脚本生成器") : "脚本生成器";

  const handleGenerate = () => {
    updateNode(id, (n) => ({
      ...n,
      data: { ...n.data, script: { ...n.data.script!, promptText } },
    }));
    setTimeout(() => generateScript(id), 0);
  };

  const handleRegenerate = () => {
    if (!confirm("重新生成将覆盖已有内容，是否继续？")) return;
    updateNode(id, (n) => ({
      ...n,
      data: { ...n.data, script: { ...n.data.script!, promptText } },
    }));
    setTimeout(() => regenerateScript(id), 0);
  };

  const handleDownload = () => {
    if (!script.shots.length) return;
    const header = [
      "镜号", "时长", "画面描述", "景别", "角色动作", "情绪", "对白", "分镜提示词", "视频运动提示词",
    ];
    const rows = script.shots.map((s) => [
      s.index, s.duration, s.description, s.shotType, s.action, s.emotion, s.dialogue, s.imagePrompt, s.videoPrompt,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${script.title || "脚本"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fade-in group relative rounded-2xl overflow-visible"
      style={{
        width: SCRIPT_NODE_WIDTH,
        background: "#FFFFFF",
        border: "1px solid #E5E5E5",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Input handle — left */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ background: COLORS.handle }}
      />

      {/* Header */}
      <div className="flex items-center gap-2" style={{ padding: "14px 20px 10px" }}>
        <FileText
          className="w-[18px] h-[18px] flex-shrink-0"
          style={{ color: "#374151" }}
          strokeWidth={1.8}
        />
        <span
          className="text-[15px] font-semibold truncate"
          style={{ color: "#1F2937", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {headerTitle}
        </span>
      </div>

      {/* Body — depends on status */}
      <div style={{ padding: "0 20px 0" }}>
        {script.status === "empty" && <EmptyBody />}
        {script.status === "generating" && (
          <GeneratingBody progress={script.progress ?? 0} onCancel={() => cancelScript(id)} />
        )}
        {script.status === "ready" && (
          <ReadyBody
            onOpen={() => openScript(id)}
            wizardStep={script.wizardStep ?? 1}
            allPromptsDone={allPromptsDone}
          />
        )}
        {script.status === "failed" && (
          <FailedBody error={script.error} onRetry={handleRegenerate} />
        )}
      </div>

      {/* Prompt card — hidden during generation */}
      {!isGenerating && (
        <div style={{ padding: "12px 20px 16px" }}>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E5E5",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {/* Top row: script badge + shot thumbnails (thumbnails only after wizard complete) */}
            <div className="flex items-center gap-2" style={{ padding: "10px 14px 0" }}>
              {/* Connected scripts badge */}
              {connectedTextCount > 0 && (
                <div
                  className="inline-flex items-center justify-center rounded-lg relative flex-shrink-0"
                  style={{ width: 36, height: 36, background: "#F3F4F6" }}
                >
                  <ListOrdered className="w-4 h-4" style={{ color: "#6B7280" }} strokeWidth={1.8} />
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white text-[10px] font-bold"
                    style={{ width: 16, height: 16, background: "#6366F1" }}
                  >
                    {connectedTextCount}
                  </span>
                </div>
              )}

              {/* Shot thumbnail strip — only after all prompts done */}
              {allPromptsDone && script.shots.length > 0 && (
                <ShotThumbnailStrip shots={script.shots} assets={script.assets} />
              )}
            </div>

            {/* Textarea */}
            <div style={{ padding: "10px 14px" }}>
              <textarea
                className="w-full text-[14px] outline-none resize-none"
                style={{
                  minHeight: 48,
                  color: "#1F2937",
                  fontFamily: "PingFang SC, Inter, system-ui",
                  background: "transparent",
                }}
                placeholder="根据我上传的剧本生成一个完整的故事脚本"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && canGenerate) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                rows={2}
              />
            </div>

            {/* Bottom toolbar */}
            <div
              className="flex items-center justify-between"
              style={{ padding: "8px 14px", borderTop: "1px solid #F3F4F6" }}
            >
              {/* Left: model selector with icon */}
              <div className="flex items-center gap-1.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: "#6B7280", flexShrink: 0 }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
                </svg>
                <select
                  className="appearance-none text-[13px] font-medium outline-none cursor-pointer bg-transparent"
                  style={{
                    color: "#374151",
                    fontFamily: "PingFang SC, Inter, system-ui",
                    paddingRight: 16,
                  }}
                  value={script.model}
                  onChange={(e) =>
                    updateNode(id, (n) => ({
                      ...n,
                      data: { ...n.data, script: { ...n.data.script!, model: e.target.value } },
                    }))
                  }
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {SCRIPT_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 -ml-4" style={{ color: "#9CA3AF" }} />
              </div>

              {/* Right: lightning + count + send button */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[13px]" style={{ color: "#9CA3AF" }}>
                  <Zap className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>{script.shots.length || 6}</span>
                </div>
                <button
                  className="flex items-center justify-center text-white transition-opacity disabled:opacity-30"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: canGenerate ? "#1F2937" : "#D1D5DB",
                  }}
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                  title={hasSource ? "生成" : "请先连入剧本或粘贴剧本文本"}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Output handle — right */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ background: COLORS.handle }}
      />

      {showStoryboardDialog && (
        <div className="absolute z-50" style={{ top: 0, left: "calc(100% + 16px)" }}>
          <GenerateStoryboardDialog
            open={showStoryboardDialog}
            scriptTitle={script.title}
            shots={script.shots}
            onGenerate={(shotIds) => {
              setShowStoryboardDialog(false);
              generateStoryboardFromScript(id, shotIds);
            }}
            onCancel={() => setShowStoryboardDialog(false)}
          />
        </div>
      )}

      <BatchVideoDialog
        open={showBatchVideoDialog}
        shots={script.shots}
        onConfirm={(opts) => {
          setShowBatchVideoDialog(false);
          batchGenerateVideoFromScript(id, opts);
        }}
        onCancel={() => setShowBatchVideoDialog(false)}
      />

      {/* Top toolbar */}
      <NodeToolbar position={Position.Top} offset={12}>
        <div
          className="flex items-center rounded-2xl"
          style={{
            padding: "6px 10px",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {isReady && (
            <>
              <ToolbarBtn icon={RefreshCw} label="重新生成" onClick={handleRegenerate} />
              <ToolbarBtn icon={ImageIcon} label="批量生成分镜" onClick={() => setShowStoryboardDialog(true)} disabled={!allPromptsDone} />
              <ToolbarBtn icon={Video} label="批量生成视频" onClick={() => setShowBatchVideoDialog(true)} disabled={!allPromptsDone} />
              <span className="inline-block mx-1" style={{ width: 1, height: 18, background: "#E2E8F0" }} />
              <button
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 32,
                  height: 32,
                  color: script.shots.length ? "#334155" : "#CBD5E1",
                  cursor: script.shots.length ? "pointer" : "not-allowed",
                }}
                disabled={!script.shots.length}
                onClick={handleDownload}
                title="下载表格"
              >
                <Download className="w-4 h-4" strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </NodeToolbar>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof RefreshCw;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="flex items-center gap-1 rounded-lg text-[12px] font-medium transition-colors hover:bg-slate-100"
      style={{
        padding: "5px 10px",
        color: disabled ? "#CBD5E1" : "#334155",
        fontFamily: "PingFang SC, Inter, system-ui",
        cursor: disabled ? "not-allowed" : undefined,
      }}
      onClick={disabled ? undefined : onClick}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
      {label}
    </button>
  );
}

function EmptyBody() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl"
      style={{
        height: 200,
        background: "#FAFAFA",
        border: "1px dashed #D4D4D4",
      }}
    >
      <AlignLeft className="w-10 h-10" style={{ color: "#D1D5DB" }} strokeWidth={1.6} />
    </div>
  );
}

function GeneratingBody({ progress, onCancel }: { progress: number; onCancel: () => void }) {
  const ROWS = 7;
  const COLS = 3;
  return (
    <div
      className="flex flex-col rounded-xl"
      style={{
        background: "#FAFAFA",
        border: "1px solid #E5E5E5",
        padding: "20px",
      }}
    >
      {/* Skeleton grid */}
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: ROWS }).map((_, r) => (
          <div key={r} className="flex gap-2.5">
            {Array.from({ length: COLS }).map((_, c) => (
              <div
                key={c}
                className="flex-1 rounded-md animate-pulse"
                style={{
                  height: r === 0 || r === 2 ? 28 : 22,
                  background: "#E5E5E5",
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ height: 40 }} />

      {/* Progress pill */}
      <div className="flex justify-center">
        <div
          className="inline-flex items-center gap-3 rounded-full"
          style={{
            padding: "8px 20px",
            background: "#FFFFFF",
            border: "1px solid #E5E5E5",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <span
            className="text-[14px] font-medium"
            style={{ color: "#1F2937", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            生成中 {progress}%...
          </span>
          <button
            className="text-[14px] transition-colors hover:text-gray-600"
            style={{ color: "#9CA3AF", fontFamily: "PingFang SC, Inter, system-ui" }}
            onClick={onCancel}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Stepper steps for ReadyBody ──────────────────────────────────────── */

const STEP_LABELS = ["确认镜头", "准备资产", "合成提示词"];

function ReadyBody({
  onOpen,
  wizardStep,
  allPromptsDone,
}: {
  onOpen: () => void;
  wizardStep: WizardStep;
  allPromptsDone: boolean;
}) {
  const steps = STEP_LABELS.map((label, i) => {
    const stepNum = (i + 1) as WizardStep;
    const done =
      stepNum < wizardStep || (allPromptsDone && wizardStep === 3);
    const active = stepNum === wizardStep && !allPromptsDone;
    return { label, done, active };
  });

  return (
    <div
      className="flex flex-col items-center rounded-xl"
      style={{
        background: "#FAFAFA",
        border: "1px solid #E5E5E5",
        padding: "24px 20px",
      }}
    >
      {/* Icon */}
      <AlignLeft className="w-10 h-10 mb-6" style={{ color: "#D1D5DB" }} strokeWidth={1.6} />

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
              <div
                className="flex items-center justify-center rounded-full text-[13px] font-bold"
                style={{
                  width: 32,
                  height: 32,
                  ...(step.done
                    ? { background: "#1F2937", color: "#FFFFFF" }
                    : step.active
                      ? { background: "#1F2937", color: "#FFFFFF" }
                      : { background: "transparent", border: "2px solid #D1D5DB", color: "#D1D5DB" }),
                }}
              >
                {step.done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
              </div>
              <span
                className="text-[12px] mt-1.5 whitespace-nowrap"
                style={{
                  color: step.done || step.active ? "#1F2937" : "#9CA3AF",
                  fontFamily: "PingFang SC, Inter, system-ui",
                  fontWeight: step.active ? 600 : 400,
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                style={{
                  width: 48,
                  height: 2,
                  marginTop: -18,
                  background: steps[i + 1].done || steps[i + 1].active
                    ? "#1F2937"
                    : "#E5E5E5",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Open script button */}
      <button
        className="w-full flex items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-colors hover:bg-gray-100"
        style={{
          height: 48,
          background: "#F3F4F6",
          color: "#1F2937",
          fontFamily: "PingFang SC, Inter, system-ui",
        }}
        onClick={onOpen}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        打开脚本节点
        <ArrowRight className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}

/* ── Shot thumbnail strip ────────────────────────────────────────────── */

function ShotThumbnailStrip({
  shots,
  assets,
}: {
  shots: ScriptShot[];
  assets?: ScriptAsset[];
}) {
  const findAssetImage = (shot: ScriptShot): string | undefined => {
    if (shot.refImage) return shot.refImage;
    if (!assets) return undefined;
    for (const asset of assets) {
      if (asset.image && shot.description.includes(`@${asset.name}`)) {
        return asset.image;
      }
    }
    return undefined;
  };

  return (
      <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0" style={{ scrollbarWidth: "thin" }}>
        {shots.map((shot) => {
          const img = findAssetImage(shot);
          return (
            <div
              key={shot.id}
              className="relative flex-shrink-0 rounded-lg overflow-hidden"
              style={{
                width: 48,
                height: 48,
                background: img ? undefined : "#E5E7EB",
              }}
            >
              {img ? (
                <img
                  src={img}
                  alt={`镜 ${shot.index}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" style={{ color: "#9CA3AF" }} />
                </div>
              )}
              <span
                className="absolute top-0.5 right-0.5 flex items-center justify-center rounded-full text-white text-[9px] font-bold"
                style={{ width: 16, height: 16, background: "rgba(0,0,0,0.5)" }}
              >
                {shot.index}
              </span>
            </div>
          );
        })}
      </div>
  );
}

function FailedBody({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl"
      style={{ height: 120, background: "#FEF2F2", border: "1px solid #FECACA" }}
    >
      <AlertCircle className="w-6 h-6 mb-2" style={{ color: "#EF4444" }} />
      <span className="text-[12px] mb-2" style={{ color: "#DC2626" }}>
        {error || "生成失败"}
      </span>
      <button
        className="text-[12px] font-medium rounded-lg"
        style={{ padding: "4px 12px", background: "#FEE2E2", color: "#DC2626" }}
        onClick={onRetry}
      >
        重试
      </button>
    </div>
  );
}
