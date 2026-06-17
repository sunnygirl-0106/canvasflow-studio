import { Plus, Folder, History } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";
import { AddNodePanel } from "./AddNodePanel";

export function LeftRail() {
  const addPanel = useCanvas((s) => s.addPanel);
  const setAddPanel = useCanvas((s) => s.setAddPanel);
  const addOpen = addPanel.open;

  return (
    <>
      <div
        className="absolute left-6 z-20 flex flex-col items-center gap-2 rounded-2xl"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          padding: 8,
          width: 56,
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
        }}
      >
        <button
          data-add-toggle
          onClick={() => setAddPanel({ open: !addOpen })}
          className="flex items-center justify-center rounded-xl transition-shadow"
          style={{
            width: 40,
            height: 40,
            background: "#0F172A",
            boxShadow: addOpen ? "0 0 0 3px #FFFFFF, 0 0 0 5px #3B82F6" : "none",
          }}
        >
          <Plus className="w-5 h-5" style={{ color: "#FFFFFF" }} strokeWidth={2.5} />
        </button>

        <button
          className="flex items-center justify-center rounded-xl hover:bg-slate-50"
          style={{ width: 40, height: 40 }}
        >
          <Folder className="w-[20px] h-[20px]" style={{ color: "#64748B" }} strokeWidth={1.8} />
        </button>

        <button
          className="flex items-center justify-center rounded-xl hover:bg-slate-50"
          style={{ width: 40, height: 40 }}
        >
          <History className="w-[20px] h-[20px]" style={{ color: "#64748B" }} strokeWidth={1.8} />
        </button>
      </div>

      <AddNodePanel />
    </>
  );
}
