import { Handle, NodeToolbar, Position } from "@xyflow/react";
import { DemoImg } from "@/components/DemoImg";
import { memo, useRef } from "react";
import { ImageIcon, Upload, Loader2, Eye } from "lucide-react";
import {
  useCanvas,
  type GenerateImageNodeData,
  type ImageNodeData,
  type CanvasNode,
} from "@/store/canvasStore";
import { ImagePromptPanel } from "@/components/ImagePromptPanel";
import { ImageToolbar } from "@/components/ImageToolbar";
import { useStoryboardMembership } from "@/lib/useStoryboardMembership";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
import { useIsMultiSelected } from "@/lib/useIsMultiSelected";
import { ShotIndexBadge } from "./ShotIndexBadge";
import { NODE_COLORS as COLORS } from "./nodeTheme";

type Data = GenerateImageNodeData | ImageNodeData;

const WIDTH = 420;
const BODY_HEIGHT = 260;

export const GenerateImageNode = memo(GenerateImageNodeImpl);

function GenerateImageNodeImpl({
  id,
  data,
  selected,
}: {
  id: string;
  data: Data;
  selected?: boolean;
}) {
  const updateNode = useCanvas((s) => s.updateNode);
  const fileRef = useRef<HTMLInputElement>(null);
  const status = data.status ?? (data.src ? "ready" : "empty");
  const slot = useStoryboardMembership(id);
  // During a multi-select, suppress this node's own toolbar + prompt panel so
  // the box-selection stays clean and only the shared action bar shows.
  const multiSelected = useIsMultiSelected();
  const soloSelected = !!selected && !multiSelected;

  const onUploadClick = () => fileRef.current?.click();

  // A storyboard member renders at its FULL size (no thumbnail shrink) — the
  // container only repositions it. The shot-index badge is the only storyboard-
  // specific chrome, overlaid below.

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    input.value = "";
    try {
      const url = await fileToDataUrl(file);
      updateNode(
        id,
        (n) =>
          ({
            ...n,
            data: { ...n.data, src: url, status: "ready" },
          }) as CanvasNode,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "上传失败");
    }
  };

  return (
    <div
      className="fade-in relative"
      style={{
        width: WIDTH,
        background: "transparent",
      }}
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {slot?.showIndex && <ShotIndexBadge label={slot.label} />}

      {/* Header row above body */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "0 4px 8px 4px", color: "#E5E7EB" }}
      >
        <div className="flex items-center gap-1.5">
          <ImageIcon className="w-[15px] h-[15px]" style={{ color: "#9CA3AF" }} strokeWidth={1.8} />
          <span
            className="text-[14px] font-semibold"
            style={{ color: "#E5E7EB", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            {data.name ?? "图片"}
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
          title="上传图片"
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
                <ImageIcon className="w-9 h-9" style={{ color: "#56C7CF" }} strokeWidth={1.4} />
              </div>
            </div>
          )}

          {status === "generating" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2
                className="w-7 h-7 animate-spin"
                style={{ color: "#9CA3AF" }}
                strokeWidth={1.8}
              />
              <span
                className="text-[13px]"
                style={{ color: "#9CA3AF", fontFamily: "PingFang SC, Inter, system-ui" }}
              >
                处理中，请稍候...
              </span>
            </div>
          )}

          {status === "ready" && data.src && (
            <>
              <DemoImg src={data.src} alt="" className="w-full h-full object-cover" draggable={false} />
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

      {/* Floating toolbar above (only on selected + ready) */}
      <NodeToolbar
        position={Position.Top}
        offset={16}
        isVisible={soloSelected && status === "ready"}
      >
        <ImageToolbar src={data.src} />
      </NodeToolbar>

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
          <ImagePromptPanel nodeId={id} />
        </div>
      )}
    </div>
  );
}
