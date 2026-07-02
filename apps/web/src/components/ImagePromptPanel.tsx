import { useMemo } from "react";
import { DemoImg } from "@/components/DemoImg";
import { PromptPanel } from "@/components/PromptPanel";
import { Check, ImageIcon } from "lucide-react";
import {
  useCanvas,
  type CanvasNode,
  type GenerateImageNodeData,
  type ImageNodeData,
} from "@/store/canvasStore";
import { placeholderImage } from "@canvasflow/shared";
import { getUpstreamMounts } from "@/store/selectors/upstream";
import { estimateImageCost } from "@/lib/cost";
import { useNodePatch } from "@/lib/useNodePatch";
import { useMockGenerate } from "@/lib/useMockGenerate";

type Data = ImageNodeData | GenerateImageNodeData;

export function ImagePromptPanel({ nodeId }: { nodeId: string }) {
  const node = useCanvas((s) => s.nodes.find((n) => n.id === nodeId)) as
    | (CanvasNode & { data: Data })
    | undefined;
  const patch = useNodePatch<Data>(nodeId);
  const runGenerate = useMockGenerate(nodeId);
  // Subscribe to nodes/edges as stable references; derive the live mount
  // list locally via useMemo. (Returning a fresh array from a zustand
  // selector trips useSyncExternalStore's mutation check and infinite-loops.)
  const nodes = useCanvas((s) => s.nodes);
  const edges = useCanvas((s) => s.edges);
  const upstreamImages = useMemo(
    () =>
      getUpstreamMounts({ nodes, edges }, nodeId).filter(
        (m) => (m.kind === "image" || m.kind === "generateImage") && !!m.src,
      ),
    [nodes, edges, nodeId],
  );

  // NOTE: every hook must be called before any early return below. The
  // node-lookup hook above runs unconditionally; the values it feeds (prompt,
  // model) use safe defaults when node is missing so useMemo can also run.
  const data = node?.data;
  const prompt = data?.prompt ?? "";
  const model = data?.model ?? "phan-nano-l";
  const hasMain = !!data?.src && data?.status === "ready";
  // Default to checked only when the node actually has a main image to
  // remix from. Once the user toggles it explicitly, we honor that choice.
  const useMainImage = data?.useMainImage ?? hasMain;
  const cost = useMemo(() => estimateImageCost(prompt, model), [prompt, model]);

  if (!node || !data) return null;

  const onPromptChange = (next: string) => {
    patch({ prompt: next, estimatedCost: estimateImageCost(next, model) });
  };

  const onSend = () => {
    if (data.status === "generating") return;
    const seed = Math.random().toString(36).slice(2, 8);
    runGenerate(1800, () => ({ src: placeholderImage(seed, 640, 400) }));
  };

  return (
    <PromptPanel
      prompt={prompt}
      onPromptChange={onPromptChange}
      placeholder="描述你想生成的图片内容，输入 @ 引用素材"
      model={model}
      onSend={onSend}
      canSend={data.status !== "generating"}
      topSlot={
        /* Main-image toggle row */
        <button
          onClick={() => patch({ useMainImage: !useMainImage })}
          className="flex items-center gap-2 rounded-2xl text-left"
          style={{
            padding: "14px 18px",
            background: "#1F2125",
            border: "1px solid #2A2D33",
            fontFamily: "PingFang SC, Inter, system-ui",
          }}
        >
          <span
            className="inline-flex items-center justify-center rounded"
            style={{
              width: 18,
              height: 18,
              background: useMainImage ? "#14B8A6" : "transparent",
              border: useMainImage ? "1px solid #14B8A6" : "1.5px solid #475569",
            }}
          >
            {useMainImage && (
              <Check className="w-3 h-3" style={{ color: "#FFFFFF" }} strokeWidth={3} />
            )}
          </span>
          <span className="text-[14px] font-semibold" style={{ color: "#E5E7EB" }}>
            主图参与生成
          </span>
          <span className="text-[13px]" style={{ color: "#6B7280" }}>
            （{hasMain ? "在当前节点的图基础上修改" : "当前节点尚无主图"}）
          </span>
        </button>
      }
      chips={
        /* Upstream-mount chips — one per live upstream image. Hidden entirely
           when nothing is mounted (no empty row). */
        upstreamImages.length > 0 ? (
          <div className="flex items-center flex-wrap gap-2">
            {upstreamImages.map((m) => (
              <span
                key={m.nodeId}
                className="inline-flex items-center gap-2 rounded-lg"
                style={{ padding: "3px 8px 3px 3px", background: "#2A2D33" }}
              >
                <DemoImg
                  src={m.src}
                  alt=""
                  draggable={false}
                  style={{ width: 22, height: 22, objectFit: "cover", borderRadius: 4 }}
                />
                <span className="text-[12px] font-bold tracking-wide" style={{ color: "#E5E7EB" }}>
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
          <ImageIcon className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} strokeWidth={1.8} />
          <span style={{ color: "#E5E7EB" }}>1张</span>
          <span>预计消耗</span>
          <span className="text-[13px] font-bold" style={{ color: "#E5E7EB" }}>
            {cost}
          </span>
          <span style={{ color: "#E5E7EB" }}>星钻</span>
          <span className="text-[12px] font-semibold" style={{ color: "#22C55E" }}>
            已豁免
          </span>
        </div>
      }
    />
  );
}
