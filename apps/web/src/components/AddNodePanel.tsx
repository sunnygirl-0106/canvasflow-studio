import { useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  FileText,
  Image as ImageIcon,
  PlayCircle,
  Music2,
  Upload,
  Scissors,
  ScrollText,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useCanvas, type CanvasNode, type NodeKind } from "@/store/canvasStore";

type PanelKind = NodeKind | "scriptMenu";

interface PanelItem {
  key: PanelKind;
  title: string;
  subtitle: string;
  icon: typeof FileText;
  isNew?: boolean;
}

const NODE_ITEMS: PanelItem[] = [
  { key: "text", title: "文本", subtitle: "脚本、广告词、品牌文案", icon: FileText },
  { key: "scriptMenu", title: "脚本", subtitle: "剧本生成分镜脚本", icon: ScrollText, isNew: true },
  { key: "generateImage", title: "图片", subtitle: "海报、分镜、角色设计", icon: ImageIcon },
  { key: "generateVideo", title: "视频", subtitle: "视频、动画、电影", icon: PlayCircle },
  {
    key: "composition",
    title: "视频合成",
    subtitle: "多个视频片段合为一个",
    icon: Scissors,
    isNew: true,
  },
  { key: "audio", title: "音频", subtitle: "音乐、配音、音效", icon: Music2 },
  {
    key: "director",
    title: "导演台",
    subtitle: "3D空间搭建场景多视角截图",
    icon: Layers,
    isNew: true,
  },
];

const RESOURCE_ITEMS: PanelItem[] = [
  { key: "image", title: "上传", subtitle: "支持图片、视频和音频", icon: Upload },
];

const PANEL_W = 340;

export function AddNodePanel() {
  const addPanel = useCanvas((s) => s.addPanel);
  const setAddPanel = useCanvas((s) => s.setAddPanel);
  const addNodeAtPosition = useCanvas((s) => s.addNodeAtPosition);
  const updateNode = useCanvas((s) => s.updateNode);
  const select = useCanvas((s) => s.select);
  const { screenToFlowPosition } = useReactFlow();
  const ref = useRef<HTMLDivElement>(null);
  const [scriptMenuOpen, setScriptMenuOpen] = useState(false);

  // New nodes drop at the right-click location (converted screen→flow). When
  // the panel is docked from the rail (no screen anchor), drop at the viewport
  // center instead of a fixed off-screen point.
  const anchorFlow = () => {
    const screen =
      addPanel.x !== undefined && addPanel.y !== undefined
        ? { x: addPanel.x, y: addPanel.y }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    return screenToFlowPosition(screen);
  };

  const open = addPanel.open;
  const onClose = () => setAddPanel({ open: false });

  useEffect(() => {
    if (!open) return;
    setScriptMenuOpen(false);
    const onMouseDown = (e: MouseEvent) => {
      if (!ref.current) return;
      const target = e.target as Node;
      if (ref.current.contains(target)) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const uploadFlow = () => {
    const { x, y } = anchorFlow();
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const id = addNodeAtPosition("generateImage", x, y);
      updateNode(
        id,
        (n) => ({ ...n, data: { ...n.data, src: url, status: "ready" } }) as CanvasNode,
      );
      select(id);
      onClose();
    };
    input.click();
  };

  const handleSelect = (kind: PanelKind) => {
    if (kind === "scriptMenu") {
      setScriptMenuOpen((v) => !v);
      return;
    }
    if (kind === "image") {
      uploadFlow();
      return;
    }
    const { x, y } = anchorFlow();
    const id = addNodeAtPosition(kind as NodeKind, x, y);
    select(id);
    onClose();
  };

  // Position: either anchored to right-click location or docked to LeftRail
  const docked = addPanel.x === undefined;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const posStyle: React.CSSProperties = docked
    ? { left: 78, top: 24 }
    : {
        left: Math.min(addPanel.x!, vw - PANEL_W - 12),
        top: Math.min(addPanel.y!, vh - 480),
      };

  return (
    <div
      ref={ref}
      className="fixed z-30 rounded-2xl fade-in"
      style={{
        ...posStyle,
        width: PANEL_W,
        padding: 16,
        background: "#1F2125",
        border: "1px solid #2A2D33",
        boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        fontFamily: "PingFang SC, Inter, system-ui",
      }}
    >
      <SectionLabel>添加节点</SectionLabel>
      <div className="flex flex-col gap-2 mb-4">
        {NODE_ITEMS.map((item) => (
          <div key={item.key} className="relative">
            <PanelCard
              item={item}
              onClick={() => handleSelect(item.key)}
              showArrow={item.key === "scriptMenu"}
            />
            {item.key === "scriptMenu" && scriptMenuOpen && (
              <ScriptEntryMenu
                onSelect={(mode) => {
                  if (mode === "script") {
                    const { x, y } = anchorFlow();
                    const id = addNodeAtPosition("script", x, y);
                    select(id);
                    onClose();
                  }
                }}
              />
            )}
          </div>
        ))}
      </div>

      <SectionLabel>添加资源</SectionLabel>
      <div className="flex flex-col gap-2 mb-1">
        {RESOURCE_ITEMS.map((item) => (
          <PanelCard key={item.key} item={item} onClick={() => handleSelect(item.key)} />
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] font-medium mb-2 px-1" style={{ color: "#6B7280" }}>
      {children}
    </div>
  );
}

function PanelCard({
  item,
  onClick,
  showArrow,
}: {
  item: PanelItem;
  onClick: () => void;
  showArrow?: boolean;
}) {
  const { icon: Icon, title, subtitle, isNew } = item;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl text-left transition-colors"
      style={{
        background: "transparent",
        padding: "10px 12px",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#2A2D33")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{ width: 36, height: 36, background: "transparent" }}
      >
        <Icon className="w-6 h-6" style={{ color: "#E5E7EB" }} strokeWidth={1.6} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-semibold" style={{ color: "#F3F4F6" }}>
            {title}
          </span>
          {isNew && (
            <span
              className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
              style={{
                background: "#2A2D33",
                color: "#9CA3AF",
                fontFamily: "Inter, system-ui",
                lineHeight: 1,
              }}
            >
              Beta
            </span>
          )}
        </div>
        <div className="text-[12px] mt-0.5 truncate" style={{ color: "#6B7280" }}>
          {subtitle}
        </div>
      </div>
      {showArrow && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#6B7280" }} />}
    </button>
  );
}

function ScriptEntryMenu({
  onSelect,
}: {
  onSelect: (mode: "script" | "character" | "video") => void;
}) {
  const entries: { mode: "script" | "character" | "video"; label: string; enabled: boolean }[] = [
    { mode: "script", label: "剧本生成分镜脚本", enabled: true },
    { mode: "character", label: "角色生成分镜脚本", enabled: false },
    { mode: "video", label: "视频参考生成分镜脚本", enabled: false },
  ];

  return (
    <div
      className="absolute z-40 rounded-xl"
      style={{
        left: "100%",
        top: 0,
        marginLeft: 8,
        width: 220,
        padding: 6,
        background: "#1F2125",
        border: "1px solid #2A2D33",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      {entries.map((e) => (
        <button
          key={e.mode}
          className="w-full text-left rounded-lg transition-colors"
          style={{
            padding: "10px 12px",
            color: e.enabled ? "#E5E7EB" : "#4B5563",
            fontSize: 13,
            cursor: e.enabled ? "pointer" : "default",
          }}
          onMouseEnter={(ev) => e.enabled && (ev.currentTarget.style.background = "#2A2D33")}
          onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
          onClick={() => (e.enabled ? onSelect(e.mode) : undefined)}
        >
          {e.label}
          {!e.enabled && (
            <span className="ml-1.5 text-[11px]" style={{ color: "#4B5563" }}>
              即将上线
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
