import { useEffect, useMemo, useRef } from "react";
import {
  Upload,
  Plus,
  Undo2,
  Clipboard,
  Copy,
  Film,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useCanvas, type NodeKind } from "@/store/canvasStore";

const MEDIA_KINDS: NodeKind[] = ["image", "generateImage", "generateVideo"];

type ItemVariant = "default" | "primary" | "destructive";

type ItemSpec =
  | {
      kind: "item";
      key: string;
      icon: LucideIcon;
      label: string;
      shortcut?: string;
      variant?: ItemVariant;
      disabled?: boolean;
      onClick: () => void;
    }
  | { kind: "divider"; key: string };

/**
 * Context-aware right-click menu.
 * Pane: upload / add node / undo / paste
 * Node (media): + primary "加入到最近的时间轴", + copy/delete
 * Node (other): no timeline CTA but still copy/delete
 */
export function ContextMenu() {
  const menu = useCanvas((s) => s.contextMenu);
  const close = useCanvas((s) => s.setContextMenu);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) close(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(null);
    };
    const onScroll = () => close(null);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onScroll);
    };
  }, [menu, close]);

  const items = useMenuItems();

  if (!menu) return null;

  // Edge-flip: keep menu inside viewport
  const MENU_W = 240;
  const MENU_H_EST = items.filter((i) => i.kind === "item").length * 44 + 32;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const left = Math.min(menu.x, vw - MENU_W - 8);
  const top = Math.min(menu.y, vh - MENU_H_EST - 8);

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-2xl fade-in"
      style={{
        left,
        top,
        width: MENU_W,
        padding: 8,
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it) =>
        it.kind === "divider" ? (
          <div key={it.key} className="my-1" style={{ height: 1, background: "#F1F5F9" }} />
        ) : (
          <MenuRow key={it.key} item={it} />
        ),
      )}
    </div>
  );
}

function MenuRow({ item }: { item: Extract<ItemSpec, { kind: "item" }> }) {
  const { icon: Icon, label, shortcut, variant = "default", disabled, onClick } = item;
  const isPrimary = variant === "primary";
  const isDestructive = variant === "destructive";

  const iconColor = disabled
    ? "#CBD5E1"
    : isPrimary
      ? "#0E7490"
      : isDestructive
        ? "#EF4444"
        : "#475569";
  const textColor = disabled
    ? "#94A3B8"
    : isPrimary
      ? "#0E7490"
      : isDestructive
        ? "#EF4444"
        : "#0F172A";
  const bg = isPrimary ? "#ECFEFF" : "transparent";
  const hoverBg = isDestructive ? "#FEF2F2" : "#F8FAFC";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick();
      }}
      disabled={disabled}
      className="w-full flex items-center gap-3 rounded-xl text-left transition-colors"
      style={{
        padding: "8px 12px",
        background: bg,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled || isPrimary) return;
        e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        if (disabled || isPrimary) return;
        e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.8} style={{ color: iconColor }} />
      <span
        className="flex-1 text-[14px] font-medium truncate"
        style={{ color: textColor, fontFamily: "PingFang SC, Inter, system-ui" }}
      >
        {label}
      </span>
      {shortcut && (
        <span
          className="text-[12px]"
          style={{
            color: disabled ? "#CBD5E1" : "#94A3B8",
            fontFamily: "Inter, system-ui",
          }}
        >
          {shortcut}
        </span>
      )}
    </button>
  );
}

/** Build the menu items based on context. */
function useMenuItems(): ItemSpec[] {
  const menu = useCanvas((s) => s.contextMenu);
  const nodes = useCanvas((s) => s.nodes);
  const past = useCanvas((s) => s.past);
  const undo = useCanvas((s) => s.undo);
  const removeNode = useCanvas((s) => s.removeNode);
  const addNodeToTimeline = useCanvas((s) => s.addNodeToTimeline);
  const setContextMenu = useCanvas((s) => s.setContextMenu);

  return useMemo<ItemSpec[]>(() => {
    if (!menu) return [];

    const target = menu.targetNodeId ? nodes.find((n) => n.id === menu.targetNodeId) ?? null : null;
    const isMedia = target ? MEDIA_KINDS.includes(target.kind) : false;
    const hasTimeline = nodes.some((n) => n.kind === "timeline");
    const canUndo = past.length > 0;
    const close = () => setContextMenu(null);

    const items: ItemSpec[] = [];

    // 1. Primary CTA (media nodes only)
    if (isMedia && target) {
      items.push({
        kind: "item",
        key: "add-to-timeline",
        icon: Film,
        label: hasTimeline ? "加入到最近的时间轴" : "新建时间轴并加入",
        variant: "primary",
        onClick: () => {
          addNodeToTimeline(target.id);
          close();
        },
      });
      items.push({ kind: "divider", key: "d0" });
    }

    // 2. Creation actions
    items.push({
      kind: "item",
      key: "upload",
      icon: Upload,
      label: "上传",
      onClick: () => {
        // TODO: hook up upload flow
        close();
      },
    });
    items.push({
      kind: "item",
      key: "add-node",
      icon: Plus,
      label: "添加节点",
      onClick: () => {
        // TODO: open AddNodePanel
        close();
      },
    });

    items.push({ kind: "divider", key: "d1" });

    // 3. Undo
    items.push({
      kind: "item",
      key: "undo",
      icon: Undo2,
      label: "撤销",
      shortcut: "Ctrl+Z",
      disabled: !canUndo,
      onClick: () => {
        undo();
        close();
      },
    });

    items.push({ kind: "divider", key: "d2" });

    // 4. Clipboard
    if (target) {
      items.push({
        kind: "item",
        key: "copy",
        icon: Copy,
        label: "复制节点",
        shortcut: "Ctrl+C",
        onClick: () => {
          // TODO: hook up copy/clipboard
          close();
        },
      });
    }
    items.push({
      kind: "item",
      key: "paste",
      icon: Clipboard,
      label: "粘贴",
      shortcut: "Ctrl+V",
      disabled: true, // not implemented yet
      onClick: () => close(),
    });

    // 5. Destructive (node only)
    if (target) {
      items.push({ kind: "divider", key: "d3" });
      items.push({
        kind: "item",
        key: "delete",
        icon: Trash2,
        label: "删除节点",
        variant: "destructive",
        onClick: () => {
          removeNode(target.id);
          close();
        },
      });
    }

    return items;
  }, [menu, nodes, past, undo, removeNode, addNodeToTimeline, setContextMenu]);
}
