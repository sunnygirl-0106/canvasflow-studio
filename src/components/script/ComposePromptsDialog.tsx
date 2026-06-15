import { useState } from "react";
import { X, Zap } from "lucide-react";
import type { ScriptShot } from "@/store/types";

interface Props {
  open: boolean;
  shots: ScriptShot[];
  onCompose: (shotIds: string[]) => void;
  onClose: () => void;
}

export function ComposePromptsDialog({ open, shots, onCompose, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(shots.map((s) => s.id)));

  if (!open) return null;

  const allSelected = selected.size === shots.length && shots.length > 0;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(shots.map((s) => s.id)));
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div
        className="rounded-2xl flex flex-col"
        style={{
          width: 640,
          maxHeight: "75vh",
          background: "#FFFFFF",
          boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
          fontFamily: "PingFang SC, Inter, system-ui",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: "20px 24px 12px" }}
        >
          <span className="text-[16px] font-semibold" style={{ color: "#0F172A" }}>
            合成提示词
          </span>
          <button
            className="flex items-center justify-center rounded-lg hover:bg-slate-100"
            style={{ width: 30, height: 30 }}
            onClick={onClose}
          >
            <X className="w-4 h-4" style={{ color: "#64748B" }} />
          </button>
        </div>

        {/* Select all bar */}
        <div
          className="flex items-center gap-3 flex-shrink-0"
          style={{ padding: "0 24px 12px" }}
        >
          <label className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: "#374151" }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-teal-600"
            />
            全选镜头
          </label>
          <span className="text-[13px]" style={{ color: "#9CA3AF" }}>
            已选 {selected.size}/{shots.length}
          </span>
        </div>

        {/* Shot list */}
        <div className="flex-1 overflow-auto" style={{ padding: "0 24px" }}>
          {shots.map((shot) => (
            <div
              key={shot.id}
              className="flex items-center gap-3 rounded-lg transition-colors hover:bg-slate-50"
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(shot.id)}
                onChange={() => toggle(shot.id)}
                className="w-4 h-4 rounded accent-teal-600 flex-shrink-0"
              />
              <span className="text-[13px] font-mono" style={{ color: "#9CA3AF", width: 32 }}>
                #{shot.index}
              </span>
              <span
                className="text-[13px] flex-1 truncate"
                style={{ color: "#334155" }}
              >
                {shot.description || "(无描述)"}
              </span>
              <span className="text-[12px]" style={{ color: "#94A3B8" }}>
                {shot.duration}s
              </span>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex items-center justify-between flex-shrink-0 rounded-b-2xl"
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #F1F5F9",
            background: "#FAFAFA",
          }}
        >
          <div className="flex items-center gap-1.5 text-[13px]" style={{ color: "#6B7280" }}>
            <Zap className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
            {selected.size * 8}
          </div>
          <button
            className="text-[13px] font-semibold rounded-lg text-white transition-colors hover:opacity-90 disabled:opacity-40"
            style={{
              padding: "8px 24px",
              background: "#1F2937",
            }}
            disabled={selected.size === 0}
            onClick={() => {
              onCompose(Array.from(selected));
              onClose();
            }}
          >
            确认生成
          </button>
        </div>
      </div>
    </div>
  );
}
