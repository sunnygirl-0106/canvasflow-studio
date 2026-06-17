import {
  Crop,
  Maximize,
  Scissors,
  Sun,
  Eraser,
  Brush,
  Grid3x3,
  ChevronDown,
  FileText,
  RotateCw,
  Download,
  Eye,
} from "lucide-react";

type Section = "edit" | "paint" | "grid" | "meta";

interface Item {
  key: string;
  icon: typeof Crop;
  label: string;
  section: Section;
  onClick: () => void;
}

export function ImageToolbar({ src }: { src?: string }) {
  const stub = (label: string) => () => {
    console.log(`[ImageToolbar] ${label} — 即将上线`);
  };
  const download = () => {
    if (!src) return;
    window.open(src, "_blank");
  };
  const preview = () => {
    if (!src) return;
    window.open(src, "_blank");
  };

  const items: Item[] = [
    { key: "crop", icon: Crop, label: "裁剪", section: "edit", onClick: stub("裁剪") },
    { key: "expand", icon: Maximize, label: "扩图", section: "edit", onClick: stub("扩图") },
    { key: "matting", icon: Scissors, label: "抠图", section: "edit", onClick: stub("抠图") },
    { key: "light", icon: Sun, label: "打光", section: "paint", onClick: stub("打光") },
    { key: "erase", icon: Eraser, label: "擦除", section: "paint", onClick: stub("擦除") },
    { key: "repaint", icon: Brush, label: "重绘", section: "paint", onClick: stub("重绘") },
    { key: "grid", icon: Grid3x3, label: "九宫格", section: "grid", onClick: stub("九宫格") },
    { key: "annotate", icon: FileText, label: "标注", section: "meta", onClick: stub("标注") },
    {
      key: "rotate",
      icon: RotateCw,
      label: "旋转镜像",
      section: "meta",
      onClick: stub("旋转镜像"),
    },
    { key: "download", icon: Download, label: "下载", section: "meta", onClick: download },
    { key: "preview", icon: Eye, label: "预览", section: "meta", onClick: preview },
  ];

  return (
    <div
      className="flex items-center rounded-full"
      style={{
        padding: "8px 14px",
        background: "rgba(31,33,37,0.96)",
        border: "1px solid #2A2D33",
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
        gap: 4,
        fontFamily: "PingFang SC, Inter, system-ui",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((it, idx) => {
        const Icon = it.icon;
        const prev = items[idx - 1];
        const showDivider = prev && prev.section !== it.section;
        return (
          <div key={it.key} className="flex items-center">
            {showDivider && (
              <span
                className="inline-block"
                style={{ width: 1, height: 16, background: "#3F4248", margin: "0 6px" }}
              />
            )}
            <button
              onClick={it.onClick}
              className="flex items-center gap-1.5 rounded-full transition-colors"
              style={{
                padding: "6px 10px",
                color: "#E5E7EB",
                background: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#2A2D33")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              title={it.label}
            >
              <Icon className="w-[15px] h-[15px]" strokeWidth={1.8} />
              <span className="text-[13px] font-medium">{it.label}</span>
              {it.key === "grid" && (
                <ChevronDown className="w-3 h-3" style={{ color: "#9CA3AF" }} strokeWidth={2} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
