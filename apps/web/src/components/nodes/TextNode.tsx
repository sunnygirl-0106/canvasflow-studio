import { Handle, Position } from "@xyflow/react";
import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Maximize2, X } from "lucide-react";
import { useCanvas, type TextNodeData, type CanvasNode } from "@/store/canvasStore";
import { NODE_COLORS as COLORS } from "./nodeTheme";

// Dark palette — matches GenerateImageNode / GenerateVideoNode.
const BG = "#1F2125";
const BORDER = "#2A2D33";
const DASH = "#3F4248";
const TEXT = "#E5E7EB";
const MUTED = "#9CA3AF";
const HINT = "#6B7280";
const FONT = "PingFang SC, Inter, system-ui";
const WIDTH = 480;

export const TextNode = memo(TextNodeImpl);

function TextNodeImpl({ id, data }: { id: string; data: TextNodeData }) {
  const updateNode = useCanvas((s) => s.updateNode);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const text = data.text ?? "";
  const setText = (v: string) =>
    updateNode(id, (n) => ({ ...n, data: { ...n.data, text: v } }) as CanvasNode);

  // Close the full-screen editor on Escape.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <div className="fade-in group relative" style={{ width: WIDTH }}>
      {/* Header row (outside the box) */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "0 4px 8px 4px", color: TEXT }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText
            className="w-[15px] h-[15px] flex-shrink-0"
            style={{ color: MUTED }}
            strokeWidth={1.8}
          />
          <span
            className="text-[14px] font-semibold truncate"
            style={{ color: TEXT, fontFamily: FONT }}
          >
            {data.name ?? "文本"}
          </span>
        </div>
        <button
          onClick={() => setExpanded(true)}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center justify-center rounded-md transition-colors"
          style={{ width: 28, height: 28, background: "#2A2D33", border: `1px solid ${DASH}` }}
          title="展开大屏编辑"
        >
          <Maximize2 className="w-3.5 h-3.5" style={{ color: TEXT }} strokeWidth={1.8} />
        </button>
      </div>

      {/* Dashed body box */}
      <div
        className="relative rounded-2xl flex flex-col"
        style={{
          height: 300,
          background: BG,
          border: `1.5px dashed ${DASH}`,
          overflow: "hidden",
        }}
        onDoubleClick={() => !editing && setEditing(true)}
      >
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{ background: COLORS.handle }}
        />

        {editing ? (
          <textarea
            autoFocus
            className="nodrag nowheel flex-1 w-full resize-none outline-none text-[13px]"
            style={{
              padding: "16px 18px",
              background: "transparent",
              color: TEXT,
              fontFamily: FONT,
              lineHeight: 1.7,
            }}
            placeholder="粘贴或输入剧本…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => setEditing(false)}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div
              className="nowheel flex-1 text-[13px]"
              style={{
                padding: "16px 18px",
                color: text ? TEXT : HINT,
                fontFamily: FONT,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowY: "auto",
              }}
            >
              {text || "粘贴或输入剧本…"}
            </div>
            {/* Footer hint */}
            <div
              className="flex items-center gap-1.5 text-[12px] flex-shrink-0"
              style={{
                padding: "10px 18px",
                color: HINT,
                fontFamily: FONT,
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              双击文本进入编辑 · 点右上角
              <Maximize2 className="w-3 h-3 inline-block" strokeWidth={1.8} />
              展开大屏编辑
            </div>
          </>
        )}
      </div>

      {/* Full-screen editor */}
      {expanded &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 1000, background: "rgba(0,0,0,0.6)" }}
            onMouseDown={() => setExpanded(false)}
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <div
              className="flex flex-col rounded-2xl"
              style={{
                width: "min(900px, 90vw)",
                height: "80vh",
                background: BG,
                border: `1px solid ${BORDER}`,
                boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between flex-shrink-0"
                style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}
              >
                <div className="flex items-center gap-2">
                  <FileText
                    className="w-[16px] h-[16px]"
                    style={{ color: MUTED }}
                    strokeWidth={1.8}
                  />
                  <span
                    className="text-[15px] font-semibold"
                    style={{ color: TEXT, fontFamily: FONT }}
                  >
                    {data.name ?? "文本"}
                  </span>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="flex items-center justify-center rounded-md transition-colors"
                  style={{
                    width: 30,
                    height: 30,
                    background: "#2A2D33",
                    border: `1px solid ${DASH}`,
                  }}
                  title="关闭"
                >
                  <X className="w-4 h-4" style={{ color: TEXT }} strokeWidth={1.8} />
                </button>
              </div>
              <textarea
                autoFocus
                className="flex-1 w-full resize-none outline-none text-[14px]"
                style={{
                  padding: "20px 24px",
                  background: "transparent",
                  color: TEXT,
                  fontFamily: FONT,
                  lineHeight: 1.8,
                }}
                placeholder="粘贴或输入剧本…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
