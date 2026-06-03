import { useEffect, useRef } from "react";
import {
  FileText,
  Image as ImageIcon,
  PlayCircle,
  Music2,
  Upload,
  Scissors,
} from "lucide-react";
import { useCanvas, type NodeKind } from "@/store/canvasStore";

interface AddNodePanelProps {
  open: boolean;
  onClose: () => void;
}

type PanelKind = NodeKind | "text" | "audio";

interface PanelItem {
  key: PanelKind;
  title: string;
  subtitle: string;
  icon: typeof FileText;
  // future: badge?: "new"
  isNew?: boolean;
}

const NODE_ITEMS: PanelItem[] = [
  { key: "text", title: "文本", subtitle: "脚本、广告词、品牌文案", icon: FileText },
  { key: "generateImage", title: "图片", subtitle: "海报、分镜、角色设计", icon: ImageIcon },
  { key: "generateVideo", title: "视频", subtitle: "视频、动画、电影", icon: PlayCircle },
  { key: "composition", title: "视频合成", subtitle: "多个视频片段合为一个", icon: Scissors, isNew: true },
  { key: "audio", title: "音频", subtitle: "音乐、配音、音效", icon: Music2 },
];

const RESOURCE_ITEMS: PanelItem[] = [
  { key: "image", title: "上传", subtitle: "支持图片、视频", icon: Upload },
];

export function AddNodePanel({ open, onClose }: AddNodePanelProps) {
  const addNode = useCanvas((s) => s.addNode);
  const ref = useRef<HTMLDivElement>(null);

  // Click outside / ESC to close
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!ref.current) return;
      const target = e.target as Node;
      if (ref.current.contains(target)) return;
      // Also ignore clicks on the LeftRail + button (it toggles itself)
      const railToggle = document.querySelector("[data-add-toggle]");
      if (railToggle && railToggle.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = (kind: PanelKind) => {
    // Only kinds known to the store are forwarded. text/audio are placeholders for future support.
    if (kind === "text" || kind === "audio") {
      // TODO: hook up when text/audio node kinds exist
      onClose();
      return;
    }
    addNode(kind);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute z-30 rounded-2xl fade-in"
      style={{
        left: 78,
        top: 24,
        width: 340,
        padding: 16,
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 18px 40px rgba(15,23,42,0.10)",
      }}
    >
      <SectionLabel>添加节点</SectionLabel>
      <div className="flex flex-col gap-2 mb-4">
        {NODE_ITEMS.map((item) => (
          <PanelCard key={item.key} item={item} onClick={() => handleSelect(item.key)} />
        ))}
      </div>

      <SectionLabel>添加资源</SectionLabel>
      <div className="flex flex-col gap-2 mb-4">
        {RESOURCE_ITEMS.map((item) => (
          <PanelCard key={item.key} item={item} onClick={() => handleSelect(item.key)} />
        ))}
      </div>

    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[12px] font-medium mb-2 px-1"
      style={{ color: "#94A3B8", fontFamily: "PingFang SC, Inter, system-ui" }}
    >
      {children}
    </div>
  );
}

function PanelCard({
  item,
  onClick,
}: {
  item: PanelItem;
  onClick: () => void;
}) {
  const { icon: Icon, title, subtitle, isNew } = item;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl text-left transition-colors hover:bg-slate-100"
      style={{
        background: "#F8FAFC",
        padding: "12px 14px",
      }}
    >
      <Icon className="w-7 h-7 flex-shrink-0" style={{ color: "#475569" }} strokeWidth={1.6} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[15px] font-semibold"
            style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            {title}
          </span>
          {isNew && (
            <span
              className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
              style={{
                background: "#F1F5F9",
                color: "#64748B",
                fontFamily: "Inter, system-ui",
                lineHeight: 1,
              }}
            >
              Beta
            </span>
          )}
        </div>
        <div
          className="text-[12px] mt-0.5 truncate"
          style={{ color: "#94A3B8", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}
