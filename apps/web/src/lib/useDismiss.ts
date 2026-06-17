import { useEffect, type RefObject } from "react";

// Shared dismiss hooks — previously this Esc/outside-click boilerplate was
// hand-rolled in ~10 dialog/menu/panel components.

/** Call `onClose` when Escape is pressed. Pass `enabled=false` to disable
 *  (e.g. while the dialog is closed but the hook must still run). */
export function useEscape(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, enabled]);
}

/** Call `onClose` on Escape OR a pointer-down outside `ref`. For popovers and
 *  floating menus that should close when you click away. */
export function useDismissable<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onClose: () => void,
  enabled = true,
) {
  useEscape(onClose, enabled);
  useEffect(() => {
    if (!enabled) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [ref, onClose, enabled]);
}
