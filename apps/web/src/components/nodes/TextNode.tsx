import { Handle, Position } from "@xyflow/react";
import { memo } from "react";
import { FileText } from "lucide-react";
import { useCanvas, type TextNodeData, type CanvasNode } from "@/store/canvasStore";
import { NODE_COLORS as COLORS } from "./nodeTheme";

export const TextNode = memo(TextNodeImpl);

function TextNodeImpl({ id, data }: { id: string; data: TextNodeData }) {
  const updateNode = useCanvas((s) => s.updateNode);

  return (
    <div
      className="fade-in group relative rounded-2xl overflow-visible"
      style={{
        width: 320,
        background: "#FFFFFF",
        border: `2px solid ${COLORS.border}`,
        boxShadow: "0 18px 36px rgba(152,162,179,0.10)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2" style={{ padding: "14px 16px 8px" }}>
        <FileText
          className="w-[16px] h-[16px] flex-shrink-0"
          style={{ color: COLORS.headerText }}
          strokeWidth={1.8}
        />
        <span
          className="text-[14px] font-semibold truncate"
          style={{ color: COLORS.headerText, fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {data.name ?? "剧本"}
        </span>
      </div>

      {/* Text area */}
      <div style={{ padding: "0 16px 14px" }}>
        <textarea
          className="w-full rounded-xl text-[13px] resize-none outline-none focus:ring-2 focus:ring-teal-300"
          style={{
            height: 120,
            padding: "10px 12px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            color: "#334155",
            fontFamily: "PingFang SC, Inter, system-ui",
            lineHeight: 1.6,
          }}
          placeholder="粘贴或输入剧本…"
          value={data.text ?? ""}
          onChange={(e) =>
            updateNode(
              id,
              (n) => ({ ...n, data: { ...n.data, text: e.target.value } }) as CanvasNode,
            )
          }
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
      </div>

      {/* Output handle — right */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ background: COLORS.handle }}
      />
    </div>
  );
}
