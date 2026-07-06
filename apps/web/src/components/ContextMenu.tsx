import { useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import {
  Upload,
  Plus,
  Undo2,
  Clipboard,
  Copy,
  Film,
  Trash2,
  CopyPlus,
  ArrowRightLeft,
  Ungroup,
  Maximize2,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useCanvas, type CanvasNode, type NodeKind } from "@/store/canvasStore";
import { ConfirmDialog } from "@/components/storyboard/ConfirmDialog";

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
 * Node (other): no composition CTA but still copy/delete
 */
export function ContextMenu() {
  const menu = useCanvas((s) => s.contextMenu);
  const close = useCanvas((s) => s.setContextMenu);
  const removeNode = useCanvas((s) => s.removeNode);
  const ref = useRef<HTMLDivElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const items = useMenuItems(setConfirmDeleteId);

  if (!menu && !confirmDeleteId) return null;

  // Edge-flip: keep menu inside viewport
  const MENU_W = 240;
  const MENU_H_EST = items.filter((i) => i.kind === "item").length * 44 + 32;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const left = menu ? Math.min(menu.x, vw - MENU_W - 8) : 0;
  const top = menu ? Math.min(menu.y, vh - MENU_H_EST - 8) : 0;

  return (
    <>
      {menu && (
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
      )}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="删除节点"
        message="确认删除该节点？此操作可撤销。"
        confirmLabel="删除"
        onConfirm={() => {
          if (confirmDeleteId) removeNode(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
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
      <Icon
        className="w-[18px] h-[18px] flex-shrink-0"
        strokeWidth={1.8}
        style={{ color: iconColor }}
      />
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
function useMenuItems(onConfirmDelete: (id: string) => void): ItemSpec[] {
  const menu = useCanvas((s) => s.contextMenu);
  const nodes = useCanvas((s) => s.nodes);
  const canUndo = useCanvas((s) => s.past.length > 0);
  const undo = useCanvas((s) => s.undo);
  const removeNode = useCanvas((s) => s.removeNode);
  const removeNodes = useCanvas((s) => s.removeNodes);
  const copyNodes = useCanvas((s) => s.copyNodes);
  const pasteNodes = useCanvas((s) => s.pasteNodes);
  const hasClipboard = useCanvas((s) => (s.clipboard?.length ?? 0) > 0);
  const addToComposition = useCanvas((s) => s.addToComposition);
  const duplicateStoryboard = useCanvas((s) => s.duplicateStoryboard);
  const convertGroupToStoryboard = useCanvas((s) => s.convertGroupToStoryboard);
  const ungroupGroup = useCanvas((s) => s.ungroupGroup);
  const openScript = useCanvas((s) => s.openScript);
  const regenerateScript = useCanvas((s) => s.regenerateScript);
  const setContextMenu = useCanvas((s) => s.setContextMenu);
  const addNodeAtPosition = useCanvas((s) => s.addNodeAtPosition);
  const updateNode = useCanvas((s) => s.updateNode);
  const select = useCanvas((s) => s.select);
  const setAddPanel = useCanvas((s) => s.setAddPanel);
  const { screenToFlowPosition } = useReactFlow();

  const uploadImage = () => {
    // Anchor the new node to where the user right-clicked (screen→flow).
    // Capture it synchronously — the menu closes before the async file pick.
    const screen = menu ? { x: menu.x, y: menu.y } : { x: 600, y: 200 };
    const pos = screenToFlowPosition(screen);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const id = addNodeAtPosition("generateImage", pos.x, pos.y);
      updateNode(
        id,
        (n) => ({ ...n, data: { ...n.data, src: url, status: "ready" } }) as CanvasNode,
      );
      select(id);
    };
    input.click();
  };

  return useMemo<ItemSpec[]>(() => {
    if (!menu) return [];

    const target = menu.targetNodeId
      ? (nodes.find((n) => n.id === menu.targetNodeId) ?? null)
      : null;
    const isMedia = target ? MEDIA_KINDS.includes(target.kind) : false;
    const isStoryboard = target?.kind === "storyboard";
    const isGroup = target?.kind === "nodeGroup";
    const isScript = target?.kind === "script";
    const hasComposition = nodes.some((n) => n.kind === "composition");
    const close = () => setContextMenu(null);

    const items: ItemSpec[] = [];

    // ── Multi-selection menu (box-select 2+ nodes, then right-click) ──
    // Acts on the whole selection rather than a single node. Groups in the
    // selection pull their members in too, matching single-group delete.
    if (menu.selectedIds && menu.selectedIds.length >= 2) {
      const selected = menu.selectedIds;
      const expanded = new Set(selected);
      for (const sid of selected) {
        const n = nodes.find((x) => x.id === sid);
        if (n?.kind === "nodeGroup") n.data.memberIds?.forEach((mid) => expanded.add(mid));
      }
      items.push({
        kind: "item",
        key: "multi-copy",
        icon: Copy,
        label: `复制选中 (${selected.length})`,
        shortcut: "⌘C",
        onClick: () => {
          copyNodes(selected);
          close();
        },
      });
      items.push({ kind: "divider", key: "md0" });
      items.push({
        kind: "item",
        key: "multi-delete",
        icon: Trash2,
        label: `删除选中 (${selected.length})`,
        shortcut: "⌘⌫",
        variant: "destructive",
        onClick: () => {
          removeNodes([...expanded]);
          close();
        },
      });
      return items;
    }

    // ── Storyboard-specific menu ──
    if (isStoryboard && target) {
      items.push({
        kind: "item",
        key: "sb-duplicate",
        icon: CopyPlus,
        label: "创建分镜组副本",
        onClick: () => {
          duplicateStoryboard(target.id);
          close();
        },
      });
      items.push({ kind: "divider", key: "sd0" });
      items.push({
        kind: "item",
        key: "sb-copy",
        icon: Copy,
        label: "复制分镜组",
        shortcut: "⌘C",
        onClick: () => {
          // TODO: hook up copy/clipboard
          close();
        },
      });
      items.push({
        kind: "item",
        key: "sb-paste",
        icon: Clipboard,
        label: "粘贴分镜组",
        shortcut: "⌘V",
        disabled: true,
        onClick: () => close(),
      });
      items.push({ kind: "divider", key: "sd1" });
      items.push({
        kind: "item",
        key: "sb-delete",
        icon: Trash2,
        label: "删除分镜组",
        shortcut: "⌘⌫",
        variant: "destructive",
        onClick: () => {
          close();
          onConfirmDelete(target.id);
        },
      });
      return items;
    }

    // ── Group-specific menu ──
    if (isGroup && target) {
      items.push({
        kind: "item",
        key: "grp-to-sb",
        icon: ArrowRightLeft,
        label: "转分镜组",
        onClick: () => {
          convertGroupToStoryboard(target.id);
          close();
        },
      });
      items.push({
        kind: "item",
        key: "grp-ungroup",
        icon: Ungroup,
        label: "解组",
        onClick: () => {
          ungroupGroup(target.id);
          close();
        },
      });
      items.push({ kind: "divider", key: "gd0" });
      items.push({
        kind: "item",
        key: "grp-copy",
        icon: Copy,
        label: "复制组",
        shortcut: "⌘C",
        onClick: () => {
          copyNodes([target.id]);
          close();
        },
      });
      items.push({ kind: "divider", key: "gd1" });
      items.push({
        kind: "item",
        key: "grp-delete",
        icon: Trash2,
        label: "删除组",
        shortcut: "⌘⌫",
        variant: "destructive",
        onClick: () => {
          // Delete the group together with everything inside it — the group is a
          // container, so removing it should take its members, not orphan them.
          const memberIds = target.kind === "nodeGroup" ? (target.data.memberIds ?? []) : [];
          removeNodes([target.id, ...memberIds]);
          close();
        },
      });
      return items;
    }

    // ── Script-specific menu ──
    if (isScript && target) {
      items.push({
        kind: "item",
        key: "script-fullscreen",
        icon: Maximize2,
        label: "全屏脚本",
        onClick: () => {
          openScript(target.id);
          close();
        },
      });
      if (target.data.script?.status === "ready") {
        items.push({
          kind: "item",
          key: "script-regen",
          icon: RefreshCw,
          label: "重新生成",
          onClick: () => {
            if (confirm("重新生成将覆盖已有内容，是否继续？")) {
              regenerateScript(target.id);
            }
            close();
          },
        });
      }
      items.push({ kind: "divider", key: "sc0" });
      items.push({
        kind: "item",
        key: "script-copy",
        icon: Copy,
        label: "复制脚本节点",
        shortcut: "⌘C",
        onClick: () => close(),
      });
      items.push({ kind: "divider", key: "sc1" });
      items.push({
        kind: "item",
        key: "script-delete",
        icon: Trash2,
        label: "删除脚本节点",
        shortcut: "⌘⌫",
        variant: "destructive",
        onClick: () => {
          close();
          onConfirmDelete(target.id);
        },
      });
      return items;
    }

    // ── Default menu (existing behavior) ──

    // 1. Primary CTA (media nodes only)
    if (isMedia && target) {
      items.push({
        kind: "item",
        key: "add-to-composition",
        icon: Film,
        label: hasComposition ? "加入到最近的视频合成" : "新建视频合成并加入",
        variant: "primary",
        onClick: () => {
          addToComposition(target.id);
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
        uploadImage();
        close();
      },
    });
    items.push({
      kind: "item",
      key: "add-node",
      icon: Plus,
      label: "添加节点",
      onClick: () => {
        const x = menu?.x ?? 200;
        const y = menu?.y ?? 200;
        close();
        setAddPanel({ open: true, x, y });
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
          copyNodes([target.id]);
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
      disabled: !hasClipboard,
      onClick: () => {
        pasteNodes();
        close();
      },
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
  }, [
    menu,
    nodes,
    canUndo,
    undo,
    removeNode,
    removeNodes,
    copyNodes,
    pasteNodes,
    hasClipboard,
    addToComposition,
    duplicateStoryboard,
    convertGroupToStoryboard,
    ungroupGroup,
    openScript,
    regenerateScript,
    setContextMenu,
    onConfirmDelete,
    addNodeAtPosition,
    select,
    updateNode,
    setAddPanel,
  ]);
}
