import { useState, useRef, useEffect } from "react";
import { Filter } from "lucide-react";
import { useCanvas, type ScriptFilter, SCRIPT_SHOT_TYPES } from "@/store/canvasStore";

interface Props {
  nodeId: string;
  filter: ScriptFilter;
}

export function FilterMenu({ nodeId, filter }: Props) {
  const [open, setOpen] = useState(false);
  const setScriptFilter = useCanvas((s) => s.setScriptFilter);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const hasFilter = !!(filter.characterName || filter.shotType || filter.keyword);

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1 rounded-md text-[12px] font-medium transition-colors hover:bg-gray-100"
        style={{ padding: "5px 10px", color: hasFilter ? "#3B82F6" : "#6B7280" }}
        onClick={() => setOpen((v) => !v)}
      >
        <Filter className="w-3.5 h-3.5" strokeWidth={1.8} />
        筛选
        {hasFilter && (
          <span
            className="rounded-full text-[10px] font-bold"
            style={{ padding: "0 5px", background: "#3B82F6", color: "#FFFFFF" }}
          >
            !
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 rounded-xl z-50"
          style={{
            width: 240,
            padding: 12,
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }}
        >
          {/* Keyword */}
          <label className="block mb-3">
            <span className="text-[11px] font-medium" style={{ color: "#9CA3AF" }}>
              关键字（画面描述/对白）
            </span>
            <input
              className="w-full mt-1 rounded-lg text-[12px] outline-none"
              style={{
                height: 32,
                padding: "0 10px",
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                color: "#374151",
              }}
              placeholder="搜索…"
              value={filter.keyword ?? ""}
              onChange={(e) =>
                setScriptFilter(nodeId, { keyword: e.target.value || undefined })
              }
            />
          </label>

          {/* Character name */}
          <label className="block mb-3">
            <span className="text-[11px] font-medium" style={{ color: "#9CA3AF" }}>
              角色名
            </span>
            <input
              className="w-full mt-1 rounded-lg text-[12px] outline-none"
              style={{
                height: 32,
                padding: "0 10px",
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                color: "#374151",
              }}
              placeholder="角色名…"
              value={filter.characterName ?? ""}
              onChange={(e) =>
                setScriptFilter(nodeId, { characterName: e.target.value || undefined })
              }
            />
          </label>

          {/* Shot type */}
          <label className="block mb-3">
            <span className="text-[11px] font-medium" style={{ color: "#9CA3AF" }}>
              景别
            </span>
            <select
              className="w-full mt-1 rounded-lg text-[12px] outline-none"
              style={{
                height: 32,
                padding: "0 10px",
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                color: "#374151",
              }}
              value={filter.shotType ?? ""}
              onChange={(e) =>
                setScriptFilter(nodeId, { shotType: e.target.value || undefined })
              }
            >
              <option value="">全部</option>
              {SCRIPT_SHOT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {/* Clear */}
          {hasFilter && (
            <button
              className="w-full rounded-lg text-[12px] font-medium transition-colors hover:bg-red-50"
              style={{ padding: "6px 0", color: "#EF4444" }}
              onClick={() =>
                setScriptFilter(nodeId, {
                  keyword: undefined,
                  characterName: undefined,
                  shotType: undefined,
                })
              }
            >
              清除所有筛选
            </button>
          )}
        </div>
      )}
    </div>
  );
}
