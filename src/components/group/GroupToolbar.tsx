import { useEffect, useRef, useState } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import {
  Grid3X3,
  Play,
  ArrowRightLeft,
  Ungroup,
  Download,
  ChevronDown,
} from "lucide-react";
import { useCanvas } from "@/store/canvasStore";
import { ColorMenu } from "./ColorMenu";
import { LayoutMenu } from "./LayoutMenu";

const TOOLBAR_GAP = 12;

export function GroupToolbar() {
  const selectedId = useCanvas((s) => s.selectedId);
  const nodes = useCanvas((s) => s.nodes);
  const selectedGroup = selectedId
    ? nodes.find((n) => n.id === selectedId && n.kind === "nodeGroup") ?? null
    : null;

  const setGroupColor = useCanvas((s) => s.setGroupColor);
  const setGroupLayout = useCanvas((s) => s.setGroupLayout);
  const executeGroup = useCanvas((s) => s.executeGroup);
  const convertGroupToStoryboard = useCanvas((s) => s.convertGroupToStoryboard);
  const ungroupGroup = useCanvas((s) => s.ungroupGroup);

  const { flowToScreenPosition } = useReactFlow();
  useViewport();

  const [openMenu, setOpenMenu] = useState<"color" | "layout" | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenMenu(null);
  }, [selectedId]);

  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);

  if (!selectedGroup) return null;

  const data = selectedGroup.data;
  const id = selectedGroup.id;
  const color = data.groupColor ?? "#56C7CF";
  const layout = data.groupLayout ?? "grid";
  const nodeW = data.groupWidth ?? 300;

  const nodeCenterScreen = flowToScreenPosition({
    x: selectedGroup.x + nodeW / 2,
    y: selectedGroup.y,
  });

  const flowContainer = document.querySelector(".react-flow") as HTMLElement | null;
  const containerRect = flowContainer?.getBoundingClientRect();
  const offsetX = containerRect?.left ?? 0;
  const offsetY = containerRect?.top ?? 0;

  const toolbarW = toolbarRef.current?.offsetWidth ?? 400;
  const toolbarH = toolbarRef.current?.offsetHeight ?? 44;

  const left = nodeCenterScreen.x - offsetX - toolbarW / 2;
  const top = nodeCenterScreen.y - offsetY - toolbarH - TOOLBAR_GAP;

  const handleDownload = () => {
    const toast = document.createElement("div");
    toast.textContent = "已触发批量下载";
    toast.style.cssText =
      "position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#1E293B;color:#F8FAFC;padding:8px 20px;border-radius:9999px;font-size:13px;z-index:9999;font-family:PingFang SC,Inter,system-ui";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 pointer-events-auto inline-flex items-center gap-1 rounded-full fade-in"
      style={{
        left,
        top,
        height: 44,
        padding: "0 8px",
        background: "#1E293B",
        border: "1px solid #334155",
        boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
        whiteSpace: "nowrap",
      }}
    >
      {/* Color */}
      <div className="relative">
        <ToolbarBtn onClick={() => setOpenMenu(openMenu === "color" ? null : "color")}>
          <span
            className="w-4 h-4 rounded-full inline-block border border-white/30"
            style={{ background: color }}
          />
          <ChevronDown className="w-3 h-3" />
        </ToolbarBtn>
        {openMenu === "color" && (
          <ColorMenu current={color} onSelect={(c) => { setGroupColor(id, c); setOpenMenu(null); }} />
        )}
      </div>

      <Sep />

      {/* Layout */}
      <div className="relative">
        <ToolbarBtn onClick={() => setOpenMenu(openMenu === "layout" ? null : "layout")}>
          <Grid3X3 className="w-3.5 h-3.5" />
          排列 <ChevronDown className="w-3 h-3" />
        </ToolbarBtn>
        {openMenu === "layout" && (
          <LayoutMenu current={layout} onSelect={(l) => { setGroupLayout(id, l); setOpenMenu(null); }} />
        )}
      </div>

      <Sep />

      {/* Execute */}
      <ToolbarBtn onClick={() => executeGroup(id)}>
        <Play className="w-3.5 h-3.5" />
        整组执行
      </ToolbarBtn>

      <Sep />

      {/* Convert to storyboard */}
      <ToolbarBtn onClick={() => convertGroupToStoryboard(id)}>
        <ArrowRightLeft className="w-3.5 h-3.5" />
        转分镜组
      </ToolbarBtn>

      <Sep />

      {/* Ungroup */}
      <ToolbarBtn onClick={() => ungroupGroup(id)}>
        <Ungroup className="w-3.5 h-3.5" />
        解组
      </ToolbarBtn>

      <Sep />

      {/* Download */}
      <ToolbarBtn onClick={handleDownload}>
        <Download className="w-3.5 h-3.5" />
        下载
      </ToolbarBtn>
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full h-8 px-3 text-[13px] font-medium transition-colors"
      style={{
        color: "#F8FAFC",
        background: "transparent",
        fontFamily: "PingFang SC, Inter, system-ui",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#334155";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="inline-block" style={{ width: 1, height: 18, background: "#475569" }} />;
}
