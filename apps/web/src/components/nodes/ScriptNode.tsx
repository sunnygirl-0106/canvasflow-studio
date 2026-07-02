import { Handle, Position, NodeToolbar } from "@xyflow/react";
import { memo, useMemo, useState } from "react";
import { FileText, RefreshCw, ImageIcon, AlignLeft, Download, Zap, Video } from "lucide-react";
import {
  useCanvas,
  type CanvasNode,
  type ScriptNodeData,
  type ScriptData,
  SCRIPT_NODE_WIDTH,
} from "@/store/canvasStore";
import { getUpstreamMounts } from "@/store/selectors/upstream";
import { useIsMultiSelected } from "@/lib/useIsMultiSelected";
import { PromptPanel } from "@/components/PromptPanel";
import { DemoImg } from "@/components/DemoImg";
import { GenerateStoryboardDialog } from "@/components/script/GenerateStoryboardDialog";
import { BatchVideoDialog } from "@/components/script/BatchVideoDialog";
import { NODE_COLORS as COLORS } from "./nodeTheme";
import { ToolbarBtn, EmptyBody, GeneratingBody, ReadyBody, FailedBody } from "./ScriptNodeParts";

/** Prompt panel sits wider than the node card so the composer feels primary. */
const SCRIPT_PROMPT_WIDTH = 640;

export const ScriptNode = memo(ScriptNodeImpl);

function ScriptNodeImpl({
  id,
  data,
  selected,
}: {
  id: string;
  data: ScriptNodeData;
  selected?: boolean;
}) {
  const script = data.script as ScriptData | undefined;
  // Show the prompt composer only when this node alone is selected — mirrors
  // GenerateImageNode: click the node and the composer floats below it, rather
  // than living inside the node body permanently.
  const multiSelected = useIsMultiSelected();
  const soloSelected = !!selected && !multiSelected;
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

  const connectedTextCount = upstreamMounts.filter(
    (m) => m.kind === "text" && !!m.text?.trim(),
  ).length;
  const hasTextInput = connectedTextCount > 0;
  const hasImageInput = upstreamMounts.some((m) => m.kind === "image");
  const hasSource = hasTextInput || !!script.sourceText?.trim();

  // Header icon reflects what's wired to the left input: an image icon when an
  // image node is connected, a text-lines icon when only text is connected, and
  // the default document icon when nothing is connected yet.
  const HeaderIcon = hasImageInput ? ImageIcon : hasTextInput ? AlignLeft : FileText;
  const headerIconColor = hasImageInput || hasTextInput ? "#56C7CF" : "#9CA3AF";
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
      className="fade-in group relative rounded-2xl overflow-visible flex flex-col"
      style={{
        width: SCRIPT_NODE_WIDTH,
        height: SCRIPT_NODE_WIDTH,
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
        <HeaderIcon
          className="w-[18px] h-[18px] flex-shrink-0"
          style={{ color: headerIconColor }}
          strokeWidth={1.8}
        />
        <span
          className="text-[15px] font-semibold truncate"
          style={{ color: "#E5E7EB", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {headerTitle}
        </span>
      </div>

      {/* Body — depends on status. Fills the remaining height so the card stays
          square; each status body stretches to fill via flex-1. */}
      <div className="flex flex-col flex-1 min-h-0" style={{ padding: "0 20px 16px" }}>
        {script.status === "empty" && <EmptyBody connected={hasSource} />}
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

      {/* Prompt composer — floats below the node when this node is the sole
          selection. Reuses the exact image-node prompt panel (PromptPanel), so
          style + interactions stay identical. Rendered inline (not NodeToolbar)
          so it inherits the viewport zoom. */}
      {soloSelected && !isGenerating && (
        <div
          className="nodrag nowheel"
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 12,
            zIndex: 10,
          }}
        >
          <PromptPanel
            prompt={promptText}
            onPromptChange={setPromptText}
            placeholder="根据我上传的剧本生成一个完整的故事脚本"
            model={script.model}
            onSend={handleGenerate}
            canSend={canGenerate}
            showParams={false}
            width={SCRIPT_PROMPT_WIDTH}
            textareaMinHeight={96}
            chips={
              /* Upstream-mount chips — one per live upstream node wired to the
                 left input. Image mounts show a thumbnail; text mounts (剧本,
                 which carry no src) show a text-lines tile. Hidden entirely
                 when nothing is mounted. */
              upstreamMounts.length > 0 ? (
                <div className="flex items-center flex-wrap gap-2">
                  {upstreamMounts.map((m) => (
                    <span
                      key={m.nodeId}
                      className="inline-flex items-center gap-2 rounded-lg"
                      style={{ padding: "3px 8px 3px 3px", background: "#2A2D33" }}
                      title={m.kind === "text" ? m.text : undefined}
                    >
                      {m.src ? (
                        <DemoImg
                          src={m.src}
                          alt=""
                          draggable={false}
                          style={{ width: 22, height: 22, objectFit: "cover", borderRadius: 4 }}
                        />
                      ) : (
                        <span
                          className="inline-flex items-center justify-center"
                          style={{ width: 22, height: 22, borderRadius: 4, background: "#1F2125" }}
                        >
                          <AlignLeft
                            className="w-3.5 h-3.5"
                            style={{ color: "#56C7CF" }}
                            strokeWidth={1.8}
                          />
                        </span>
                      )}
                      <span
                        className="text-[12px] font-bold tracking-wide"
                        style={{ color: "#E5E7EB" }}
                      >
                        {m.name}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null
            }
            cost={
              <div
                className="text-[12px] flex items-center gap-1.5"
                style={{ color: "#9CA3AF", fontFamily: "PingFang SC, Inter, system-ui" }}
              >
                <Zap className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} strokeWidth={1.8} />
                <span>预计消耗</span>
                <span className="text-[13px] font-bold" style={{ color: "#E5E7EB" }}>
                  {script.shots.length || 6}
                </span>
                <span style={{ color: "#E5E7EB" }}>星钻</span>
                <span className="text-[12px] font-semibold" style={{ color: "#22C55E" }}>
                  已豁免
                </span>
              </div>
            }
          />
        </div>
      )}

      {/* Output handle — right */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ background: COLORS.handle }}
      />

      <GenerateStoryboardDialog
        open={showStoryboardDialog}
        nodeId={id}
        shots={script.shots}
        onGenerate={(shotIds) => {
          setShowStoryboardDialog(false);
          generateStoryboardFromScript(id, shotIds);
        }}
        onCancel={() => setShowStoryboardDialog(false)}
      />

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
