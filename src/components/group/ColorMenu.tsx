import { Check } from "lucide-react";

const PRESETS = [
  "#56C7CF",
  "#7C3AED",
  "#F97316",
  "#F43F5E",
  "#10B981",
  "#3B82F6",
  "#0F172A",
  "#64748B",
];

export function ColorMenu({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (color: string) => void;
}) {
  return (
    <div
      className="absolute top-full left-0 mt-2 rounded-xl z-50 p-2 grid grid-cols-4 gap-1.5"
      style={{
        background: "#1E293B",
        border: "1px solid #334155",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      {PRESETS.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: c }}
        >
          {c === current && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
