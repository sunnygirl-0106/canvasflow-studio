import { useMemo } from "react";
import { MonitorPlay, Sparkles, ArrowUp, ChevronDown, Plus } from "lucide-react";
import {
  useCanvas,
  type CanvasNode,
  type GenerateVideoNodeData,
  type VideoMode,
} from "@/store/canvasStore";
import { estimateVideoCost } from "@/lib/cost";
import { useNodePatch } from "@/lib/useNodePatch";
import { useMockGenerate } from "@/lib/useMockGenerate";

const TABS: { key: VideoMode; label: string }[] = [
  { key: "text", label: "文生视频" },
  { key: "firstFrame", label: "纯首帧" },
  { key: "headTail", label: "首尾帧" },
  { key: "ref", label: "参考图" },
];

export function VideoPromptPanel({ nodeId }: { nodeId: string }) {
  const node = useCanvas((s) => s.nodes.find((n) => n.id === nodeId)) as
    | (CanvasNode & { kind: "generateVideo"; data: GenerateVideoNodeData })
    | undefined;
  const edges = useCanvas((s) => s.edges);
  const nodes = useCanvas((s) => s.nodes);
  const patch = useNodePatch<GenerateVideoNodeData>(nodeId);
  const runGenerate = useMockGenerate(nodeId);

  const refSource = useMemo(() => {
    if (!node) return null;
    if (node.data.referenceNodeId) {
      return nodes.find((n) => n.id === node.data.referenceNodeId) ?? null;
    }
    const incoming = edges.find((e) => e.to === nodeId);
    if (!incoming) return null;
    return nodes.find((n) => n.id === incoming.from) ?? null;
  }, [node, edges, nodes, nodeId]);

  // NOTE: hooks must run unconditionally before any early return. Safe
  // defaults below so useMemo(cost) below can run even when node is missing.
  const data = node?.data;
  const tab = data?.videoMode ?? "text";
  const prompt = data?.prompt ?? "";
  const model = data?.model ?? "SD 2.0";
  const aspect = data?.aspect ?? "9:16";
  const resolution = data?.resolution ?? "720p";
  const duration = data?.duration ?? 5;
  const withSound = data?.withSound ?? true;

  const cost = useMemo(
    () => estimateVideoCost({ prompt, mode: tab, duration, resolution, withSound }),
    [prompt, tab, duration, resolution, withSound],
  );

  if (!node || !data) return null;

  const refThumb =
    refSource && (refSource.kind === "image" || refSource.kind === "generateImage")
      ? (refSource.data.src as string | undefined)
      : undefined;
  const refName = refSource ? (refSource.data.name as string) : null;

  const onSend = () => {
    if (data.status === "generating") return;
    const seed = Math.random().toString(36).slice(2, 8);
    runGenerate(2200, () => ({ src: `https://picsum.photos/seed/${seed}/640/360` }));
  };

  return (
    <div
      className="rounded-2xl flex flex-col"
      style={{
        width: 640,
        background: "#1F2125",
        border: "1px solid #2A2D33",
        boxShadow: "0 18px 36px rgba(0,0,0,0.45)",
        padding: "16px 18px",
        gap: 14,
        fontFamily: "PingFang SC, Inter, system-ui",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Tabs */}
      <div className="flex items-center gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => patch({ videoMode: t.key })}
              className="rounded-full text-[13px] font-semibold transition-colors"
              style={{
                padding: "5px 14px",
                background: active ? "transparent" : "transparent",
                color: active ? "#56C7CF" : "#9CA3AF",
                border: active ? "1px solid #56C7CF" : "1px solid #2A2D33",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Reference chip (only in ref mode) */}
      {tab === "ref" && (
        <div>
          {refSource ? (
            <span
              className="inline-flex items-center gap-2 rounded-lg"
              style={{ padding: "3px 10px 3px 3px", background: "#2A2D33" }}
            >
              {refThumb ? (
                <img
                  src={refThumb}
                  alt=""
                  draggable={false}
                  style={{
                    width: 22,
                    height: 22,
                    objectFit: "cover",
                    borderRadius: 4,
                  }}
                />
              ) : (
                <span
                  className="inline-flex items-center justify-center rounded-md text-[10px] font-bold text-white"
                  style={{ width: 22, height: 22, background: "#14B8A6" }}
                >
                  图
                </span>
              )}
              <span className="text-[13px] font-medium" style={{ color: "#E5E7EB" }}>
                {refName}
              </span>
              <span
                className="text-[11px] font-semibold rounded"
                style={{
                  padding: "1px 6px",
                  background: "rgba(245,158,11,0.18)",
                  color: "#F59E0B",
                }}
              >
                参考
              </span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg"
              style={{
                padding: "4px 10px",
                background: "transparent",
                border: "1px dashed #3F4248",
                color: "#9CA3AF",
                fontSize: 12,
              }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              添加参考图
            </span>
          )}
        </div>
      )}

      {/* Prompt textarea */}
      <textarea
        value={prompt}
        onChange={(e) => patch({ prompt: e.target.value })}
        placeholder="描述你想生成的画面内容，输入 @ 引用素材"
        className="w-full resize-none outline-none bg-transparent"
        style={{
          minHeight: 64,
          fontSize: 14,
          color: "#E5E7EB",
          border: "none",
        }}
      />

      {/* Bottom row */}
      <div className="flex items-center gap-3" style={{ whiteSpace: "nowrap" }}>
        {/* Model */}
        <button
          className="flex items-center gap-1.5 rounded-lg"
          style={{ padding: "6px 10px", flexShrink: 0 }}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="#14B8A6"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="8" strokeDasharray="2 2" opacity="0.6" />
          </svg>
          <span
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, background: "#22C55E" }}
          />
          <span className="text-[13px] font-semibold" style={{ color: "#E5E7EB" }}>
            {model}
          </span>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} strokeWidth={2} />
        </button>

        {/* Divider */}
        <span
          className="inline-block"
          style={{ width: 1, height: 16, background: "#2A2D33", flexShrink: 0 }}
        />

        {/* Aspect / resolution / duration */}
        <button
          className="flex items-center gap-1.5 rounded-lg"
          style={{ padding: "6px 10px", flexShrink: 0 }}
        >
          <MonitorPlay
            className="w-[14px] h-[14px]"
            style={{ color: "#9CA3AF" }}
            strokeWidth={1.8}
          />
          <span className="text-[13px]" style={{ color: "#E5E7EB" }}>
            {aspect} · {resolution} · {duration}s
          </span>
          {withSound && (
            <span className="text-[12px]" style={{ color: "#56C7CF" }}>
              声
            </span>
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cost */}
        <div
          className="text-[12px] flex items-center gap-1.5"
          style={{ color: "#9CA3AF", flexShrink: 0 }}
        >
          预计消耗
          <span
            className="text-[13px] font-bold inline-flex items-center gap-1"
            style={{ color: "#E5E7EB" }}
          >
            <Sparkles className="w-3 h-3" style={{ color: "#F59E0B" }} strokeWidth={2.2} />
            {cost} 星钻
          </span>
          <span className="text-[12px] font-semibold" style={{ color: "#22C55E" }}>
            已豁免
          </span>
        </div>

        {/* Submit */}
        <button
          onClick={onSend}
          disabled={data.status === "generating"}
          className="flex items-center justify-center rounded-full transition-opacity hover:opacity-85"
          style={{
            width: 32,
            height: 32,
            background: "#F1F5F9",
            opacity: data.status === "generating" ? 0.5 : 1,
          }}
          aria-label="生成"
        >
          <ArrowUp className="w-4 h-4" style={{ color: "#0F172A" }} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
