import { useState, useEffect, useRef } from "react";
import { Download, X, ChevronDown, Hash } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";
import { fmtSec } from "@/lib/time";

interface Props {
  compName: string;
  shotCount: number;
  totalDuration: number;
}

type ExportTarget = "local" | "canvas";
type ExportStep = "closed" | "pick" | "settings";

const RESOLUTIONS = ["720P", "1080P", "4K"] as const;
const FORMATS = ["MP4", "MOV", "WebM"] as const;

export function EditorTopBar({ compName, shotCount, totalDuration }: Props) {
  const closeComposition = useCanvas((s) => s.closeComposition);

  const [step, setStep] = useState<ExportStep>("closed");
  const [target, setTarget] = useState<ExportTarget>("local");
  const [resolution, setResolution] = useState<(typeof RESOLUTIONS)[number]>("720P");
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("MP4");
  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (step === "closed") return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setStep("closed");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStep("closed");
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [step]);

  const handlePick = (t: ExportTarget) => {
    setTarget(t);
    setStep("settings");
  };

  return (
    <div
      className="flex items-center justify-between flex-shrink-0"
      style={{ height: 44, padding: "0 20px", background: "#1E293B", borderBottom: "1px solid #334155" }}
    >
      {/* Left: title + info */}
      <div className="flex items-center gap-3">
        <span
          className="text-[15px] font-semibold"
          style={{ color: "#F1F5F9", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {compName}
        </span>
        <span
          className="text-[12px] font-medium"
          style={{ color: "#64748B", fontFamily: "Inter, system-ui" }}
        >
          {shotCount} 段 · {fmtSec(totalDuration)}
        </span>
      </div>

      {/* Right: export + close */}
      <div className="flex items-center gap-2" ref={panelRef}>
        <div className="relative">
          <button
            onClick={() => setStep(step === "closed" ? "pick" : "closed")}
            className="flex items-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors hover:bg-white/10"
            style={{ height: 34, padding: "0 12px", color: "#F1F5F9", background: "#334155" }}
          >
            导出
            <ChevronDown className="w-3 h-3 ml-0.5" style={{ color: "#64748B" }} />
          </button>

          {step === "pick" && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] z-50 rounded-2xl"
              style={{
                width: 280,
                padding: "20px 24px",
                background: "#1E293B",
                border: "1px solid #334155",
                boxShadow: "0 18px 40px rgba(0,0,0,0.4)",
              }}
            >
              <div className="text-[13px] font-medium mb-4" style={{ color: "#64748B" }}>
                导出位置
              </div>
              <button
                onClick={() => handlePick("local")}
                className="w-full flex items-center gap-3 rounded-xl text-left transition-colors hover:bg-white/10"
                style={{ padding: "12px 14px" }}
              >
                <Download className="w-5 h-5 flex-shrink-0" style={{ color: "#F1F5F9" }} strokeWidth={1.8} />
                <span className="text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>导出到本地</span>
              </button>
              <button
                onClick={() => handlePick("canvas")}
                className="w-full flex items-center gap-3 rounded-xl text-left transition-colors hover:bg-white/10"
                style={{ padding: "12px 14px" }}
              >
                <Hash className="w-5 h-5 flex-shrink-0" style={{ color: "#F1F5F9" }} strokeWidth={1.8} />
                <span className="text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>导出到画布</span>
              </button>
            </div>
          )}

          {step === "settings" && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] z-50 rounded-2xl"
              style={{
                width: 420,
                padding: "24px 28px",
                background: "#1E293B",
                border: "1px solid #334155",
                boxShadow: "0 18px 40px rgba(0,0,0,0.4)",
              }}
            >
              <div className="text-[13px] font-medium mb-5" style={{ color: "#64748B" }}>
                导出设置
              </div>

              <SettingsRow label="导出位置">
                <SelectBox
                  value={target === "local" ? "导出到本地" : "导出到画布"}
                  options={["导出到本地", "导出到画布"]}
                  onChange={(v) => setTarget(v === "导出到本地" ? "local" : "canvas")}
                />
              </SettingsRow>

              <div className="my-4" style={{ height: 1, background: "#334155" }} />

              <SettingsRow label="分辨率">
                <SelectBox
                  value={resolution}
                  options={[...RESOLUTIONS]}
                  onChange={(v) => setResolution(v as typeof resolution)}
                />
              </SettingsRow>

              <SettingsRow label="格式">
                <SelectBox
                  value={format}
                  options={[...FORMATS]}
                  onChange={(v) => setFormat(v as typeof format)}
                />
              </SettingsRow>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep("closed")}
                  className="flex-1 flex items-center justify-center rounded-xl text-[14px] font-semibold transition-colors hover:bg-white/10"
                  style={{ height: 44, color: "#F1F5F9", background: "#334155" }}
                >
                  取消
                </button>
                <button
                  onClick={() => setStep("closed")}
                  className="flex-1 flex items-center justify-center rounded-xl text-[14px] font-semibold transition-colors hover:opacity-90"
                  style={{ height: 44, color: "#0F172A", background: "#FFFFFF" }}
                >
                  确认
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={closeComposition}
          className="flex items-center justify-center rounded-lg hover:bg-white/10"
          style={{ width: 34, height: 34 }}
        >
          <X className="w-4 h-4" style={{ color: "#94A3B8" }} />
        </button>
      </div>
    </div>
  );
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <span className="text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function SelectBox({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between rounded-lg text-[13px] font-medium"
        style={{ width: 200, height: 38, padding: "0 12px", background: "#334155", color: "#F1F5F9" }}
      >
        <span>{value}</span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: "#64748B" }} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] z-50 rounded-xl overflow-hidden"
          style={{ width: 200, background: "#334155", border: "1px solid #475569", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left text-[13px] font-medium transition-colors hover:bg-white/10"
              style={{ padding: "10px 14px", color: opt === value ? "#FFFFFF" : "#CBD5E1" }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
