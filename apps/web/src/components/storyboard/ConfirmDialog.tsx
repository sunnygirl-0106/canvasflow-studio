import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "确认",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className="rounded-xl"
        style={{
          width: 360,
          background: "#FFFFFF",
          boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
          padding: "24px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-[15px] font-semibold mb-2"
          style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {title}
        </h3>
        <p
          className="text-[13px] mb-5"
          style={{ color: "#64748B", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-8 px-4 rounded-lg text-[13px] font-medium transition-colors hover:bg-slate-100"
            style={{
              color: "#334155",
              border: "1px solid #E5E7EB",
              fontFamily: "PingFang SC, Inter, system-ui",
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="h-8 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              background: "#EF4444",
              fontFamily: "PingFang SC, Inter, system-ui",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
