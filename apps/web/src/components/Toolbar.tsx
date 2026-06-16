import {
  ChevronLeft,
  Sparkles,
  Infinity as InfinityIcon,
  User,
  Save,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useCanvas, type SaveStatus } from "@/store/canvasStore";

function SaveIndicator() {
  const saveStatus = useCanvas((s) => s.saveStatus);
  const saveToServer = useCanvas((s) => s.saveToServer);

  const labels: Record<SaveStatus, { icon: React.ReactNode; text: string }> = {
    idle: { icon: <Save className="w-3.5 h-3.5" />, text: "保存" },
    saving: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, text: "保存中…" },
    saved: { icon: <Check className="w-3.5 h-3.5 text-green-500" />, text: "已保存" },
    error: { icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" />, text: "保存失败" },
  };

  const { icon, text } = labels[saveStatus];

  return (
    <button
      onClick={() => saveToServer()}
      className="flex items-center gap-1.5 text-[13px] font-medium rounded-md px-2 py-1 hover:bg-slate-100"
      style={{ color: "#475569", fontFamily: "PingFang SC, Inter, system-ui" }}
    >
      {icon}
      {text}
    </button>
  );
}

export function Toolbar() {
  return (
    <header
      className="h-12 px-4 flex items-center justify-between z-30 relative"
      style={{ background: "#FFFFFF", borderBottom: "1px solid #F1F5F9" }}
    >
      {/* Left: Back + title + tabs */}
      <div className="flex items-center gap-3 h-full">
        <button
          className="flex items-center justify-center rounded-lg hover:bg-slate-100"
          style={{ width: 32, height: 32 }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: "#0F172A" }} strokeWidth={2} />
        </button>

        <span
          className="text-[15px] font-semibold"
          style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          范式
        </span>

        <div className="w-px h-4" style={{ background: "#E2E8F0" }} />

        <div className="flex items-center gap-1.5">
          <span
            className="text-[15px] font-semibold"
            style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            信息流
          </span>
          <span
            className="inline-block rounded-full"
            style={{ width: 8, height: 8, background: "#22C55E" }}
          />
        </div>

        <div className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} strokeWidth={2} />
          <span
            className="text-[13px] font-medium"
            style={{ color: "#94A3B8", fontFamily: "Inter, system-ui" }}
          >
            1
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        <SaveIndicator />
        {/* 会员超市 */}
        <button
          className="flex items-center gap-1.5 rounded-full h-8 px-3"
          style={{
            background: "#ECFEFF",
            border: "1px solid #A5F3FC",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="1" y="1" width="6" height="6" rx="1" stroke="#0E7490" strokeWidth="1.5" />
            <rect x="9" y="1" width="6" height="6" rx="1" stroke="#0E7490" strokeWidth="1.5" />
            <rect x="1" y="9" width="6" height="6" rx="1" stroke="#0E7490" strokeWidth="1.5" />
            <rect x="9" y="9" width="6" height="6" rx="1" stroke="#0E7490" strokeWidth="1.5" />
          </svg>
          <span
            className="text-[13px] font-semibold"
            style={{ color: "#0E7490", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            会员超市
          </span>
        </button>

        {/* Star / pin */}
        <button
          className="flex items-center justify-center rounded-full hover:bg-slate-100"
          style={{ width: 32, height: 32 }}
        >
          <Sparkles className="w-[18px] h-[18px]" style={{ color: "#475569" }} strokeWidth={1.8} />
        </button>

        {/* Infinity */}
        <button
          className="flex items-center justify-center rounded-full hover:bg-slate-100"
          style={{ width: 32, height: 32 }}
        >
          <InfinityIcon
            className="w-[18px] h-[18px]"
            style={{ color: "#475569" }}
            strokeWidth={2}
          />
        </button>

        {/* Avatar */}
        <div
          className="flex items-center justify-center rounded-full text-white text-[11px] font-bold"
          style={{
            width: 32,
            height: 32,
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)",
            fontFamily: "Inter, system-ui",
          }}
        >
          AD
        </div>
      </div>
    </header>
  );
}
