import { Modal } from "@/components/ui/Modal";

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
  return (
    <Modal open={open} onClose={onCancel}>
      <div
        className="rounded-xl"
        style={{
          width: 360,
          background: "#FFFFFF",
          boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
          padding: "24px",
        }}
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
    </Modal>
  );
}
