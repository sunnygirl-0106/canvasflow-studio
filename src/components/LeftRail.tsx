import { Plus, Folder, LayoutGrid, History, Trash2 } from "lucide-react";

export function LeftRail() {
  return (
    <div
      className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-5 rounded-3xl"
      style={{
        padding: "14px 12px",
        width: 66,
        background: "#FFFFFFE8",
        border: "1px solid #D8E1EC",
        boxShadow: "0 18px 40px rgba(152,162,179,0.15)",
      }}
    >
      {/* Add button */}
      <button
        className="flex items-center justify-center rounded-xl"
        style={{ width: 38, height: 38, background: "#111827" }}
      >
        <Plus className="w-5 h-5" style={{ color: "#FFFFFF" }} />
      </button>

      {/* Active asset */}
      <button
        className="flex items-center justify-center rounded-[14px]"
        style={{
          width: 38,
          height: 38,
          background: "#ECFDFF",
          border: "1px solid #B2F0F4",
          boxShadow: "0 8px 18px rgba(86,199,207,0.12)",
        }}
      >
        <Folder className="w-5 h-5" style={{ color: "#0F766E" }} />
      </button>

      <LayoutGrid className="w-[22px] h-[22px]" style={{ color: "#667085" }} />
      <History className="w-[22px] h-[22px]" style={{ color: "#667085" }} />
      <Trash2 className="w-[22px] h-[22px]" style={{ color: "#667085" }} />
    </div>
  );
}
