import { useEffect } from "react";
import type { NodeKind } from "@/store/types";

const GENERATION_KINDS: NodeKind[] = ["generateImage", "generateVideo"];
const COST_PER_NODE = 130;

interface Member {
  id: string;
  kind: NodeKind;
  name?: string;
}

interface ExecuteGroupDialogProps {
  open: boolean;
  members: Member[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExecuteGroupDialog({
  open,
  members,
  onConfirm,
  onCancel,
}: ExecuteGroupDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const genNodes = members.filter((m) => GENERATION_KINDS.includes(m.kind));
  const totalCost = genNodes.length * COST_PER_NODE;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl"
        style={{
          width: 420,
          background: "#FFFFFF",
          boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
          padding: "32px 32px 28px",
          fontFamily: "PingFang SC, Inter, system-ui",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h3
          className="text-[20px] font-bold mb-5"
          style={{ color: "#0F172A" }}
        >
          整组执行
        </h3>

        {/* Description */}
        {genNodes.length > 0 ? (
          <>
            <p className="text-[15px] leading-relaxed mb-2" style={{ color: "#0F172A" }}>
              即将对组内{" "}
              <span className="font-bold">{genNodes.length}</span>{" "}
              个生成节点批量生成，预计消耗{" "}
              <span className="font-bold">{totalCost}</span>{" "}
              算力，是否继续？
            </p>
            <p className="text-[13px] mb-8" style={{ color: "#94A3B8" }}>
              仅生成节点会被执行，特殊节点需手动执行。
            </p>
          </>
        ) : (
          <p className="text-[14px] mb-8" style={{ color: "#94A3B8" }}>
            组内没有生成类节点，无需执行。
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-10 px-6 rounded-lg text-[14px] font-medium transition-colors hover:bg-slate-100"
            style={{
              color: "#334155",
              border: "1px solid #E5E7EB",
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={genNodes.length === 0}
            className="h-10 px-6 rounded-lg text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: "#38BDF8" }}
          >
            开始执行
          </button>
        </div>
      </div>
    </div>
  );
}
