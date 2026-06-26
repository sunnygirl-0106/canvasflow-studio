import { Handle, Position, NodeToolbar } from "@xyflow/react";
import { memo, useMemo, useState } from "react";
import {
  FileText,
  RefreshCw,
  ImageIcon,
  Download,
  ChevronDown,
  ArrowUp,
  Zap,
  ListOrdered,
  Video,
} from "lucide-react";
import {
  useCanvas,
  type CanvasNode,
  type ScriptNodeData,
  type ScriptData,
  SCRIPT_MODELS,
  SCRIPT_NODE_WIDTH,
} from "@/store/canvasStore";
import { getUpstreamMounts } from "@/store/selectors/upstream";
import { GenerateStoryboardDialog } from "@/components/script/GenerateStoryboardDialog";
import { BatchVideoDialog } from "@/components/script/BatchVideoDialog";
import { NODE_COLORS as COLORS } from "./nodeTheme";
import {
  ToolbarBtn,
  EmptyBody,
  GeneratingBody,
  ReadyBody,
  FailedBody,
  ShotThumbnailStrip,
} from "./ScriptNodeParts";

export const ScriptNode = memo(ScriptNodeImpl);

function ScriptNodeImpl({ id, data }: { id: string; data: ScriptNodeData }) {
  const script = data.script as ScriptData | undefined;
  const openScript = useCanvas((s) => s.openScript);
  const generateScript = useCanvas((s) => s.generateScript);
  const cancelScript = useCanvas((s) => s.cancelScript);
  const regenerateScript = useCanvas((s) => s.regenerateScript);
  const updateNode = useCanvas((s) => s.updateNode);

  // Subscribe to nodes/edges as stable refs; derive live mounts via useMemo.
  // A zustand selector that returns a fresh array each call would trip
  // useSyncExternalStore and infinite-loop.
  const nodes = useCanvas((s) => s.nodes);
  const edges = useCanvas((s) => s.edges);
  const upstreamMounts = useMemo(() => getUpstreamMounts({ nodes, edges }, id), [nodes, edges, id]);

  const [promptText, setPromptText] = useState(script?.promptText ?? "");
  const [showStoryboardDialog, setShowStoryboardDialog] = useState(false);
  const [showBatchVideoDialog, setShowBatchVideoDialog] = useState(false);
  const generateStoryboardFromScript = useCanvas((s) => s.generateStoryboardFromScript);
  const batchGenerateVideoFromScript = useCanvas((s) => s.batchGenerateVideoFromScript);

  if (!script) return null;

  const allPromptsDone =
    script.shots.length > 0 && script.shots.every((s) => s.finalPromptStatus === "done");

  const connectedTextMounts = upstreamMounts.filter((m) => m.kind === "text" && !!m.text?.trim());
  const connectedAssetGroupMounts = upstreamMounts.filter((m) => m.kind === "nodeGroup");
  const connectedTextCount = connectedTextMounts.length;
  const totalMountCount = connectedTextCount + connectedAssetGroupMounts.length;

  const hasTextInput = connectedTextCount > 0;
  const hasSource = hasTextInput || !!script.sourceText?.trim();
  const canGenerate = hasSource && script.status !== "generating";
  const isGenerating = script.status === "generating";
  const isReady = script.status === "ready";

  const headerTitle = isReady ? script.title || "脚本生成器" : "脚本生成器";

  const handleGenerate = () => {
    updateNode(
      id,
      (n) =>
        ({
          ...n,
          data: { ...n.data, script: { ...(n.data as ScriptNodeData).script, promptText } },
        }) as CanvasNode,
    );
    setTimeout(() => generateScript(id), 0);
  };

  const handleRegenerate = () => {
    if (!confirm("重新生成将覆盖已有内容，是否继续？")) return;
    updateNode(
      id,
      (n) =>
        ({
          ...n,
          data: { ...n.data, script: { ...(n.data as ScriptNodeData).script, promptText } },
        }) as CanvasNode,
    );
    setTimeout(() => regenerateScript(id), 0);
  };

  const handleDownload = () => {
    if (!script.shots.length) return;
    const header = [
      "镜号",
      "时长",
      "画面描述",
      "景别",
      "角色动作",
      "情绪",
      "对白",
      "分镜提示词",
      "视频运动提示词",
    ];
    const rows = script.shots.map((s) => [
      s.index,
      s.duration,
      s.description,
      s.shotType,
      s.action,
      s.emotion,
      s.dialogue,
      s.imagePrompt,
      s.videoPrompt,
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
        background: "#1F2125",
        border: "1px solid #2A2D33",
        boxShadow: "0 18px 36px rgba(0,0,0,0.45)",
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
          style={{ color: "#9CA3AF" }}
          strokeWidth={1.8}
        />
        <span
          className="text-[15px] font-semibold truncate"
          style={{ color: "#E5E7EB", fontFamily: "PingFang SC, Inter, system-ui" }}
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
              background: "#15171A",
              border: "1px solid #2A2D33",
            }}
          >
            {/* Top row: script badge + shot thumbnails (thumbnails only after wizard complete) */}
            <div className="flex items-center gap-2" style={{ padding: "10px 14px 0" }}>
              {/* Connected upstream badge — counts text inputs + materialized
                  asset groups. Hover reveals the source names. */}
              {totalMountCount > 0 && (
                <div
                  className="inline-flex items-center justify-center rounded-lg relative flex-shrink-0"
                  style={{ width: 36, height: 36, background: "#2A2D33" }}
                  title={[
                    ...connectedTextMounts.map((m) => `剧本：${m.name}`),
                    ...connectedAssetGroupMounts.map((m) => `资产组：${m.name}`),
                  ].join("\n")}
                >
                  <ListOrdered className="w-4 h-4" style={{ color: "#9CA3AF" }} strokeWidth={1.8} />
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white text-[10px] font-bold"
                    style={{ width: 16, height: 16, background: "#6366F1" }}
                  >
                    {totalMountCount}
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
                className="nodrag nowheel w-full text-[14px] outline-none resize-none"
                style={{
                  minHeight: 48,
                  color: "#E5E7EB",
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
              style={{ padding: "8px 14px", borderTop: "1px solid #2A2D33" }}
            >
              {/* Left: model selector with icon */}
              <div className="flex items-center gap-1.5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ color: "#56C7CF", flexShrink: 0 }}
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                    fill="currentColor"
                  />
                </svg>
                <select
                  className="appearance-none text-[13px] font-medium outline-none cursor-pointer bg-transparent"
                  style={{
                    color: "#E5E7EB",
                    fontFamily: "PingFang SC, Inter, system-ui",
                    paddingRight: 16,
                  }}
                  value={script.model}
                  onChange={(e) =>
                    updateNode(
                      id,
                      (n) =>
                        ({
                          ...n,
                          data: {
                            ...n.data,
                            script: { ...(n.data as ScriptNodeData).script, model: e.target.value },
                          },
                        }) as CanvasNode,
                    )
                  }
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {SCRIPT_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
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
                  className="flex items-center justify-center transition-opacity"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: canGenerate ? "#FFFFFF" : "#2A2D33",
                    color: canGenerate ? "#15171A" : "#6B7280",
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
            background: "#1F2125",
            border: "1px solid #2A2D33",
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          }}
        >
          {isReady && (
            <>
              <ToolbarBtn icon={RefreshCw} label="重新生成" onClick={handleRegenerate} />
              <ToolbarBtn
                icon={ImageIcon}
                label="批量生成分镜"
                onClick={() => setShowStoryboardDialog(true)}
                disabled={!allPromptsDone}
              />
              <ToolbarBtn
                icon={Video}
                label="批量生成视频"
                onClick={() => setShowBatchVideoDialog(true)}
                disabled={!allPromptsDone}
              />
              <span
                className="inline-block mx-1"
                style={{ width: 1, height: 18, background: "#2A2D33" }}
              />
              <button
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 32,
                  height: 32,
                  color: script.shots.length ? "#E5E7EB" : "#4B5563",
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
