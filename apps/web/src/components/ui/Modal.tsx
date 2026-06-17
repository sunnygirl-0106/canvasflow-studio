import type { CSSProperties, ReactNode } from "react";
import { useEscape } from "@/lib/useDismiss";

// Shared modal shell: full-screen backdrop + centered content + Esc-to-close +
// click-backdrop-to-close + stopPropagation on the card. Replaces the
// hand-rolled `fixed inset-0` overlay boilerplate duplicated across ~9 dialogs.
//
// Card styling stays with the caller (the dialogs use very different looks):
// pass the card markup as `children`, and style the backdrop via props.

export function Modal({
  open,
  onClose,
  children,
  closeOnBackdrop = true,
  className = "fixed inset-0 z-[9999] flex items-center justify-center",
  style = { background: "rgba(0,0,0,0.3)" },
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  /** Backdrop className (controls z-index, centering, padding). */
  className?: string;
  /** Backdrop inline style (controls the dim color). */
  style?: CSSProperties;
}) {
  useEscape(onClose, open);
  if (!open) return null;
  return (
    <div className={className} style={style} onClick={closeOnBackdrop ? onClose : undefined}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}>
        {children}
      </div>
    </div>
  );
}
