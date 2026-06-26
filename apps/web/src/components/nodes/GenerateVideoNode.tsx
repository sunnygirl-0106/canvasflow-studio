import { Handle, Position } from "@xyflow/react";
import { DemoImg } from "@/components/DemoImg";
import { memo, useRef, useState } from "react";
import { Video, Upload, Play, Eye, Loader2 } from "lucide-react";
import { useCanvas, type GenerateVideoNodeData, type CanvasNode } from "@/store/canvasStore";
import { VideoPromptPanel } from "@/components/VideoPromptPanel";
import { useStoryboardMembership } from "@/lib/useStoryboardMembership";
import { useIsMultiSelected } from "@/lib/useIsMultiSelected";
import { ShotIndexBadge } from "./ShotIndexBadge";
import { NODE_COLORS as COLORS } from "./nodeTheme";

const WIDTH = 480;
const BODY_HEIGHT = 280;

export const GenerateVideoNode = memo(GenerateVideoNodeImpl);

function GenerateVideoNodeImpl({
  id,
  data,
  selected,
}: {
  id: string;
  data: GenerateVideoNodeData;
  selected?: boolean;
}) {
  const updateNode = useCanvas((s) => s.updateNode);
  const fileRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const status = data.status ?? (data.src ? "ready" : "empty");
  const progress = data.progress ?? 0;
  const slot = useStoryboardMembership(id);
  // Hide this node's prompt panel while multi-selecting (see useIsMultiSelected).
  const multiSelected = useIsMultiSelected();
  const soloSelected = !!selected && !multiSelected;

  // A storyboard member renders at its FULL size (no thumbnail shrink) — the
  // container only repositions it. The shot-index badge is overlaid below.

  const onUploadClick = () => fileRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateNode(id, (n) => ({ ...n, data: { ...n.data, src: url, status: "ready" } }) as CanvasNode);
    e.target.value = "";
  };

  return (
    <div
      className="fade-in relative"
      style={{ width: WIDTH }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={onFile} />

      {slot?.showIndex && <ShotIndexBadge label={slot.label} />}

      {/* Header row */}
      <div className="flex items-center justify-between" style={{ padding: "0 4px 8px 4px" }}>
        <div className="flex items-center gap-1.5">
          <Video className="w-[15px] h-[15px]" style={{ color: "#9CA3AF" }} strokeWidth={1.8} />
          <span
            className="text-[14px] font-semibold"
            style={{ color: "#E5E7EB", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            {data.name ?? "视频"}
          </span>
        </div>
        <button
          onClick={onUploadClick}
          className="flex items-center justify-center rounded-md transition-colors"
          style={{
            width: 28,
            height: 28,
            background: "#2A2D33",
            border: "1px solid #3F4248",
          }}
          title="上传视频"
        >
          <Upload className="w-3.5 h-3.5" style={{ color: "#E5E7EB" }} strokeWidth={1.8} />
        </button>
      </div>

      {/* Body — overflow visible so the handle plus icons aren't clipped.
          The inner div re-applies the rounded clipping for the image. */}
      <div
        className="relative rounded-2xl"
        style={{
          width: WIDTH,
          height: BODY_HEIGHT,
          background: "#1F2125",
          border: status === "generating" ? `1.5px dashed ${COLORS.border}` : "1px solid #2A2D33",
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          style={{ background: COLORS.handle }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="source-process"
          style={{ background: COLORS.handle }}
        />

        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          {status === "empty" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 76,
                  height: 76,
                  background: "#15171A",
                  border: "1px solid #2A2D33",
                }}
              >
                <Video className="w-9 h-9" style={{ color: "#56C7CF" }} strokeWidth={1.4} />
              </div>
            </div>
          )}

          {status === "generating" && (
            <div
              className="absolute"
              style={{
                left: 24,
                right: 24,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                fontFamily: "PingFang SC, Inter, system-ui",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 36, height: 36, background: "#2A2D33" }}
                >
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    style={{ color: "#9CA3AF" }}
                    strokeWidth={2}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold" style={{ color: "#E5E7EB" }}>
                    生成中
                  </span>
                  <span className="text-[12px]" style={{ color: "#9CA3AF" }}>
                    正在处理任务
                  </span>
                </div>
              </div>
              <div
                className="rounded-full"
                style={{ height: 4, background: "#2A2D33", overflow: "hidden" }}
              >
                <div
                  style={{
                    width: `${Math.round(progress * 100)}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #56C7CF, #14B8A6)",
                    transition: "width 120ms linear",
                  }}
                />
              </div>
            </div>
          )}

          {status === "ready" && data.src && (
            <>
              <DemoImg src={data.src} alt="" className="w-full h-full object-cover" draggable={false} />
              {hover && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-6 h-6 text-black ml-0.5" />
                  </div>
                </div>
              )}
              <div
                className="absolute"
                style={{
                  right: 10,
                  bottom: 10,
                  padding: "4px 10px",
                  background: "rgba(15,17,20,0.78)",
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#E5E7EB",
                  fontSize: 12,
                  fontFamily: "PingFang SC, Inter, system-ui",
                }}
              >
                <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
                预览
              </div>
            </>
          )}
        </div>
      </div>

      {/* Prompt panel below (whenever selected).
          Rendered inline so it inherits the viewport zoom transform, instead
          of NodeToolbar which positions in screen-space and stays a fixed
          size as the user zooms. */}
      {soloSelected && (
        <div
          className="nodrag nowheel"
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 18,
            zIndex: 10,
          }}
        >
          <VideoPromptPanel nodeId={id} />
        </div>
      )}
    </div>
  );
}
