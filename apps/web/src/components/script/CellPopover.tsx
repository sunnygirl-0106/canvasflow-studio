import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const POPOVER_WIDTH = 320;
const GAP = 4;
const MARGIN = 8;

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Placeholder shown inside the textarea — describe what to enter. */
  placeholder?: string;
  /** Custom renderer for the collapsed trigger (e.g. @mention highlighting). */
  renderValue?: (value: string) => React.ReactNode;
  /**
   * Extra quick-insert buttons rendered left of 保存. `append` adds a line to
   * the current draft. Used by the dialogue cell for its 台词/旁白 shortcuts.
   */
  extraButtons?: (append: (text: string) => void) => React.ReactNode;
}

/**
 * Shared cell editor: a click opens a floating popover (rendered in a portal so
 * it is never clipped by the table's scroll container) with a textarea and a
 * 保存 button. Flips above the trigger and clamps to the viewport when there is
 * no room below.
 */
export function CellPopover({ value, onChange, placeholder, renderValue, extraButtons }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [coords, setCoords] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const popH = popoverRef.current?.offsetHeight ?? 180;

    let left = rect.left;
    left = Math.min(left, window.innerWidth - POPOVER_WIDTH - MARGIN);
    left = Math.max(MARGIN, left);

    const spaceBelow = window.innerHeight - rect.bottom;
    let top = rect.bottom + GAP;
    if (spaceBelow < popH + MARGIN && rect.top > spaceBelow) {
      top = rect.top - GAP - popH;
    }
    top = Math.max(MARGIN, Math.min(top, window.innerHeight - popH - MARGIN));

    setCoords({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popoverRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  const append = (text: string) => setDraft((d) => (d ? d + "\n" : "") + text);

  const save = () => {
    if (draft !== value) onChange(draft);
    setOpen(false);
  };

  return (
    <div ref={triggerRef} className="relative">
      <div
        className="cursor-text"
        style={{
          width: "100%",
          minHeight: "1.2em",
          color: "#E5E7EB",
          lineHeight: 1.6,
          whiteSpace: "normal",
          wordBreak: "break-all",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}
        onClick={() => setOpen(true)}
      >
        {value ? (
          renderValue ? (
            renderValue(value)
          ) : (
            value
          )
        ) : (
          <span style={{ color: "#6B7280" }}>—</span>
        )}
      </div>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[1000] rounded-xl"
            style={{
              top: coords.top,
              left: coords.left,
              width: POPOVER_WIDTH,
              background: "#1F2125",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              border: "1px solid #2A2D33",
              padding: 16,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <textarea
              className="w-full rounded-lg text-[13px] outline-none resize-none"
              style={{
                padding: "10px 12px",
                minHeight: 100,
                border: "1px solid #2A2D33",
                color: "#E5E7EB",
                fontFamily: "PingFang SC, Inter, system-ui",
              }}
              placeholder={placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              autoFocus
            />
            <div className="flex items-center gap-2 mt-3">
              {extraButtons?.(append)}
              <div className="flex-1" />
              <button
                className="text-[12px] font-medium rounded-lg transition-colors hover:opacity-90"
                style={{ padding: "6px 16px", background: "#14B8A6", color: "#0B1220" }}
                onClick={save}
              >
                保存
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
