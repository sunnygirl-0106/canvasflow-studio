interface StitchMenuProps {
  onSelect: (resolution: "2K" | "4K") => void;
  onClose: () => void;
}

export function StitchMenu({ onSelect, onClose }: StitchMenuProps) {
  return (
    <div
      className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-50"
      style={{
        minWidth: 180,
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
      }}
    >
      <button
        onClick={() => {
          onSelect("2K");
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium hover:bg-slate-50 transition-colors"
        style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
      >
        拼接 2K (2560px)
      </button>
      <button
        onClick={() => {
          onSelect("4K");
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium hover:bg-slate-50 transition-colors"
        style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
      >
        拼接 4K (3840px)
      </button>
      <div style={{ height: 1, background: "#E5E7EB", margin: "2px 0" }} />
      <div
        className="px-3 py-2 text-[11px]"
        style={{ color: "#94A3B8", fontFamily: "PingFang SC, Inter, system-ui" }}
      >
        源图不足时将强制放大
      </div>
    </div>
  );
}
