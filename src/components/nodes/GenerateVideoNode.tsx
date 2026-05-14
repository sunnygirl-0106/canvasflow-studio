import { Handle, Position, NodeToolbar } from "@xyflow/react";
import { useState } from "react";
import { Video, Upload, Loader2, Play } from "lucide-react";
import { useCanvas, type CanvasNode } from "@/store/canvasStore";
import { NodeHandleHint } from "@/components/NodeHandleHint";
import { VideoPromptPanel } from "@/components/VideoPromptPanel";

const COLORS = {
  border: "#56C7CF",
  headerText: "#0F172A",
  handle: "#14B8A6",
  dropBorder: "#CBD5E1",
  dropBg: "#FFFFFF",
  dropIcon: "#94A3B8",
  dropTextPrimary: "#64748B",
  dropTextMuted: "#CBD5E1",
};

export function GenerateVideoNode({ id, data }: { id: string; data: CanvasNode["data"] }) {
  const updateNode = useCanvas((s) => s.updateNode);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);

  const generate = () => {
    setBusy(true);
    setTimeout(() => {
      const seed = Math.random().toString(36).slice(2, 7);
      updateNode(id, {
        data: { ...data, src: `https://picsum.photos/seed/${seed}/640/360`, duration: 8 },
      } as any);
      setBusy(false);
    }, 1200);
  };

  const hasSrc = !!data.src;

  return (
    <div
      className="fade-in group relative rounded-3xl overflow-visible"
      style={{
        width: 560,
        background: "#FFFFFF",
        border: `2px solid ${COLORS.border}`,
        boxShadow: "0 18px 36px rgba(152,162,179,0.10)",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Input handle — left, teal */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{
          width: 16,
          height: 28,
          borderRadius: "0 14px 14px 0",
          background: COLORS.handle,
          border: "none",
          left: -2,
          top: "50%",
        }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "16px 20px" }}
      >
        <div className="flex items-center gap-2">
          <Video className="w-[18px] h-[18px]" style={{ color: COLORS.headerText }} strokeWidth={1.8} />
          <span
            className="text-[15px] font-semibold"
            style={{ color: COLORS.headerText, fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            {data.name ?? "video 节点"}
          </span>
        </div>
        <button
          className="flex items-center justify-center rounded-lg hover:bg-slate-100"
          style={{ width: 32, height: 32 }}
          onClick={generate}
          disabled={busy}
          title="上传 / 生成"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#64748B" }} />
          ) : (
            <Upload className="w-4 h-4" style={{ color: "#64748B" }} strokeWidth={1.8} />
          )}
        </button>
      </div>

      {/* Body — dropzone or video */}
      <div style={{ padding: "0 20px 20px 20px" }}>
        {hasSrc ? (
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ height: 220, background: "#0F172A" }}
          >
            <img src={data.src!} alt="" className="w-full h-full object-cover" draggable={false} />
            {hover && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-6 h-6 text-black ml-0.5" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={busy}
            className="w-full rounded-2xl flex flex-col items-center justify-center transition-colors"
            style={{
              height: 220,
              background: COLORS.dropBg,
              border: `2px dashed ${COLORS.dropBorder}`,
              gap: 12,
            }}
            onMouseEnter={(e) => {
              if (busy) return;
              e.currentTarget.style.background = "#F8FAFC";
            }}
            onMouseLeave={(e) => {
              if (busy) return;
              e.currentTarget.style.background = COLORS.dropBg;
            }}
          >
            {busy ? (
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: COLORS.dropIcon }} />
            ) : (
              <Upload className="w-7 h-7" style={{ color: COLORS.dropIcon }} strokeWidth={1.6} />
            )}
            <span
              className="text-[14px] font-medium"
              style={{ color: COLORS.dropTextPrimary, fontFamily: "PingFang SC, Inter, system-ui" }}
            >
              {busy ? "上传中…" : "点击或拖拽上传视频"}
            </span>
            <span
              className="text-[12px]"
              style={{ color: COLORS.dropTextMuted, fontFamily: "PingFang SC, Inter, system-ui" }}
            >
              MP4 / WebM / MOV，最大 100MB
            </span>
          </button>
        )}
      </div>

      {/* Output handle — right, teal */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{
          width: 16,
          height: 28,
          borderRadius: "14px 0 0 14px",
          background: COLORS.handle,
          border: "none",
          right: -2,
          top: "50%",
        }}
      />

      {/* Hover hint near right handle */}
      <NodeHandleHint />

      {/* Generation prompt panel — auto-shows when this node is selected */}
      <NodeToolbar position={Position.Bottom} offset={16}>
        <VideoPromptPanel nodeName={data.name ?? "video 节点"} />
      </NodeToolbar>
    </div>
  );
}
