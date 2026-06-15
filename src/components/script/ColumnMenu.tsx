import { useState, useRef, useEffect } from "react";
import { Columns3 } from "lucide-react";
import { useCanvas, type ScriptColumnKey } from "@/store/canvasStore";
import { SCRIPT_COLUMNS } from "@/lib/scriptColumns";

interface Props {
  nodeId: string;
  hiddenColumns: ScriptColumnKey[];
}

export function ColumnMenu({ nodeId, hiddenColumns }: Props) {
  const [open, setOpen] = useState(false);
  const toggleScriptColumn = useCanvas((s) => s.toggleScriptColumn);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1 rounded-md text-[12px] font-medium transition-colors hover:bg-gray-100"
        style={{ padding: "5px 10px", color: "#6B7280" }}
        onClick={() => setOpen((v) => !v)}
      >
        <Columns3 className="w-3.5 h-3.5" strokeWidth={1.8} />
        字段
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 rounded-xl z-50"
          style={{
            width: 200,
            padding: 6,
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div
            className="text-[11px] font-medium mb-1"
            style={{ padding: "4px 8px", color: "#9CA3AF" }}
          >
            显示列（镜号恒显示）
          </div>
          {SCRIPT_COLUMNS.map((col) => {
            const hidden = hiddenColumns.includes(col.key);
            return (
              <button
                key={col.key}
                className="w-full flex items-center gap-2 rounded-lg text-left text-[12px] transition-colors hover:bg-gray-50"
                style={{ padding: "6px 8px", color: hidden ? "#D1D5DB" : "#374151" }}
                onClick={() => toggleScriptColumn(nodeId, col.key)}
              >
                <div
                  className="flex items-center justify-center rounded"
                  style={{
                    width: 16,
                    height: 16,
                    border: hidden ? "1px solid #D1D5DB" : "none",
                    background: hidden ? "transparent" : "#3B82F6",
                  }}
                >
                  {!hidden && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                {col.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
