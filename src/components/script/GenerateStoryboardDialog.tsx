import { useState } from "react";
import {
  X,
  ChevronDown,
  ArrowUp,
  Loader2,
  Sparkles,
  ImageIcon,
} from "lucide-react";
import type { ScriptShot } from "@/store/types";
import { characterGroupCount } from "@/lib/scriptColumns";

const MODELS = ["nanobanana", "Flux Pro", "SDXL"];
const ASPECT_RATIOS = ["9:16 · 720p", "16:9 · 1080p", "1:1 · 720p"];
const COST_PER_SHOT = 197;

interface Props {
  open: boolean;
  scriptTitle: string;
  shots: ScriptShot[];
  onGenerate: (selectedShotIds: string[]) => void;
  onCancel: () => void;
}

export function GenerateStoryboardDialog({
  open,
  scriptTitle,
  shots,
  onGenerate,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [model, setModel] = useState(MODELS[0]);
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
  const [generating, setGenerating] = useState(false);

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

  const totalCost = selected.size * COST_PER_SHOT;
  const charCount = characterGroupCount(shots);

  const handleGenerate = () => {
    if (selected.size === 0) return;
    setGenerating(true);
    setTimeout(() => {
      onGenerate(Array.from(selected));
      setGenerating(false);
    }, 1500);
  };

  return (
      <div
        className="rounded-3xl flex flex-col"
        style={{
          width: 960,
          maxHeight: "85vh",
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
            {scriptTitle}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[13px]" style={{ color: "#64748B" }}>
              脚本视图
            </span>
            <button
              className="flex items-center justify-center rounded-lg hover:bg-slate-100"
              style={{ width: 30, height: 30 }}
              onClick={onCancel}
            >
              <X className="w-4 h-4" style={{ color: "#64748B" }} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto" style={{ padding: "0 24px" }}>
          <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                <th style={{ width: 40, padding: "10px 8px" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-teal-600"
                  />
                </th>
                <th
                  className="text-left font-medium"
                  style={{ padding: "10px 8px", color: "#64748B", width: 56 }}
                >
                  镜号
                </th>
                <th
                  className="text-left font-medium"
                  style={{ padding: "10px 8px", color: "#64748B", width: 48 }}
                >
                  时长
                </th>
                <th
                  className="text-left font-medium"
                  style={{ padding: "10px 8px", color: "#64748B" }}
                >
                  画面描述
                </th>
                {Array.from({ length: charCount }, (_, i) => (
                  <th
                    key={`ch-${i}`}
                    className="text-left font-medium"
                    style={{ padding: "10px 8px", color: "#64748B" }}
                  >
                    角色{i + 1}
                  </th>
                ))}
                {Array.from({ length: charCount }, (_, i) => (
                  <th
                    key={`cd-${i}`}
                    className="text-left font-medium"
                    style={{ padding: "10px 8px", color: "#64748B" }}
                  >
                    角色描述{i + 1}
                  </th>
                ))}
                {Array.from({ length: charCount }, (_, i) => (
                  <th
                    key={`ci-${i}`}
                    className="text-left font-medium"
                    style={{ padding: "10px 8px", color: "#64748B", width: 56 }}
                  >
                    角色图{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shots.map((shot) => (
                <tr
                  key={shot.id}
                  className="hover:bg-slate-50 transition-colors"
                  style={{ borderBottom: "1px solid #F1F5F9" }}
                >
                  <td style={{ padding: "12px 8px" }}>
                    <input
                      type="checkbox"
                      checked={selected.has(shot.id)}
                      onChange={() => toggle(shot.id)}
                      className="w-4 h-4 rounded accent-teal-600"
                    />
                  </td>
                  <td style={{ padding: "12px 8px", color: "#64748B" }}>{shot.index}</td>
                  <td style={{ padding: "12px 8px", color: "#334155" }}>{shot.duration}</td>
                  <td style={{ padding: "12px 8px", color: "#334155", maxWidth: 320 }}>
                    {shot.description}
                  </td>
                  {Array.from({ length: charCount }, (_, i) => (
                    <td key={`cn-${i}`} style={{ padding: "12px 8px", color: "#334155" }}>
                      {shot.characters[i]?.name ?? ""}
                    </td>
                  ))}
                  {Array.from({ length: charCount }, (_, i) => (
                    <td
                      key={`cd-${i}`}
                      style={{
                        padding: "12px 8px",
                        color: "#334155",
                        maxWidth: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {shot.characters[i]?.desc ?? ""}
                    </td>
                  ))}
                  {Array.from({ length: charCount }, (_, i) => (
                    <td key={`ci-${i}`} style={{ padding: "12px 8px" }}>
                      {shot.characters[i]?.image ? (
                        <img
                          src={shot.characters[i].image}
                          alt=""
                          style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 6 }}
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center rounded-md"
                          style={{
                            width: 32,
                            height: 32,
                            background: "#F1F5F9",
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          <ImageIcon className="w-4 h-4" style={{ color: "#CBD5E1" }} />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom bar */}
        <div
          className="flex-shrink-0 flex items-center rounded-b-3xl"
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #F1F5F9",
            background: "#FAFAFA",
            gap: 16,
          }}
        >
          {/* Model selector */}
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22C55E",
                flexShrink: 0,
              }}
            />
            <select
              className="text-[14px] font-semibold bg-transparent outline-none cursor-pointer"
              style={{ color: "#334155" }}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
          </div>

          {/* Separator */}
          <span style={{ width: 1, height: 18, background: "#E2E8F0" }} />

          {/* Aspect ratio / resolution / duration */}
          <select
            className="text-[13px] bg-transparent outline-none cursor-pointer"
            style={{ color: "#334155" }}
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
          >
            {ASPECT_RATIOS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cost estimate */}
          <span className="text-[13px]" style={{ color: "#0F766E" }}>
            本次预计消耗
          </span>

          <div className="flex items-center gap-1">
            <Sparkles className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <span className="text-[18px] font-bold" style={{ color: "#334155" }}>
              {totalCost}
            </span>
            <span className="text-[13px] font-medium" style={{ color: "#334155" }}>
              星钻
            </span>
          </div>

          {/* Generate button */}
          <button
            className="flex items-center justify-center text-white transition-opacity disabled:opacity-40"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background:
                selected.size > 0
                  ? "#334155"
                  : "#CBD5E1",
            }}
            disabled={selected.size === 0 || generating}
            onClick={handleGenerate}
          >
            {generating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
  );
}
