import { RefreshCw, AlertCircle, ImageIcon, AlignLeft, Check, ArrowRight } from "lucide-react";
import type { ScriptShot, ScriptAsset, WizardStep } from "@canvasflow/shared";

/* ── ToolbarBtn ──────────────────────────────────────────── */

export function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof RefreshCw;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="flex items-center gap-1 rounded-lg text-[12px] font-medium transition-colors hover:bg-slate-100"
      style={{
        padding: "5px 10px",
        color: disabled ? "#CBD5E1" : "#334155",
        fontFamily: "PingFang SC, Inter, system-ui",
        cursor: disabled ? "not-allowed" : undefined,
      }}
      onClick={disabled ? undefined : onClick}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
      {label}
    </button>
  );
}

/* ── EmptyBody ───────────────────────────────────────────── */

export function EmptyBody() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl"
      style={{
        height: 200,
        background: "#FAFAFA",
        border: "1px dashed #D4D4D4",
      }}
    >
      <AlignLeft className="w-10 h-10" style={{ color: "#D1D5DB" }} strokeWidth={1.6} />
    </div>
  );
}

/* ── GeneratingBody ──────────────────────────────────────── */

export function GeneratingBody({ progress, onCancel }: { progress: number; onCancel: () => void }) {
  const ROWS = 7;
  const COLS = 3;
  return (
    <div
      className="flex flex-col rounded-xl"
      style={{
        background: "#FAFAFA",
        border: "1px solid #E5E5E5",
        padding: "20px",
      }}
    >
      {/* Skeleton grid */}
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: ROWS }).map((_, r) => (
          <div key={r} className="flex gap-2.5">
            {Array.from({ length: COLS }).map((_, c) => (
              <div
                key={c}
                className="flex-1 rounded-md animate-pulse"
                style={{
                  height: r === 0 || r === 2 ? 28 : 22,
                  background: "#E5E5E5",
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ height: 40 }} />

      {/* Progress pill */}
      <div className="flex justify-center">
        <div
          className="inline-flex items-center gap-3 rounded-full"
          style={{
            padding: "8px 20px",
            background: "#FFFFFF",
            border: "1px solid #E5E5E5",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <span
            className="text-[14px] font-medium"
            style={{ color: "#1F2937", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            生成中 {progress}%...
          </span>
          <button
            className="text-[14px] transition-colors hover:text-gray-600"
            style={{ color: "#9CA3AF", fontFamily: "PingFang SC, Inter, system-ui" }}
            onClick={onCancel}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ReadyBody ───────────────────────────────────────────── */

const STEP_LABELS = ["确认镜头", "准备资产", "合成提示词"];

export function ReadyBody({
  onOpen,
  wizardStep,
  allPromptsDone,
}: {
  onOpen: () => void;
  wizardStep: WizardStep;
  allPromptsDone: boolean;
}) {
  const steps = STEP_LABELS.map((label, i) => {
    const stepNum = (i + 1) as WizardStep;
    const done = stepNum < wizardStep || (allPromptsDone && wizardStep === 3);
    const active = stepNum === wizardStep && !allPromptsDone;
    return { label, done, active };
  });

  return (
    <div
      className="flex flex-col items-center rounded-xl"
      style={{
        background: "#FAFAFA",
        border: "1px solid #E5E5E5",
        padding: "24px 20px",
      }}
    >
      <AlignLeft className="w-10 h-10 mb-6" style={{ color: "#D1D5DB" }} strokeWidth={1.6} />

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
              <div
                className="flex items-center justify-center rounded-full text-[13px] font-bold"
                style={{
                  width: 32,
                  height: 32,
                  ...(step.done
                    ? { background: "#1F2937", color: "#FFFFFF" }
                    : step.active
                      ? { background: "#1F2937", color: "#FFFFFF" }
                      : {
                          background: "transparent",
                          border: "2px solid #D1D5DB",
                          color: "#D1D5DB",
                        }),
                }}
              >
                {step.done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
              </div>
              <span
                className="text-[12px] mt-1.5 whitespace-nowrap"
                style={{
                  color: step.done || step.active ? "#1F2937" : "#9CA3AF",
                  fontFamily: "PingFang SC, Inter, system-ui",
                  fontWeight: step.active ? 600 : 400,
                }}
              >
                {step.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                style={{
                  width: 48,
                  height: 2,
                  marginTop: -18,
                  background: steps[i + 1].done || steps[i + 1].active ? "#1F2937" : "#E5E5E5",
                }}
              />
            )}
          </div>
        ))}
      </div>

      <button
        className="w-full flex items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-colors hover:bg-gray-100"
        style={{
          height: 48,
          background: "#F3F4F6",
          color: "#1F2937",
          fontFamily: "PingFang SC, Inter, system-ui",
        }}
        onClick={onOpen}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        打开脚本节点
        <ArrowRight className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}

/* ── ShotThumbnailStrip ──────────────────────────────────── */

export function ShotThumbnailStrip({
  shots,
  assets,
}: {
  shots: ScriptShot[];
  assets?: ScriptAsset[];
}) {
  const findAssetImage = (shot: ScriptShot): string | undefined => {
    if (shot.refImage) return shot.refImage;
    if (!assets) return undefined;
    for (const asset of assets) {
      if (asset.image && shot.description.includes(`@${asset.name}`)) {
        return asset.image;
      }
    }
    return undefined;
  };

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0"
      style={{ scrollbarWidth: "thin" }}
    >
      {shots.map((shot) => {
        const img = findAssetImage(shot);
        return (
          <div
            key={shot.id}
            className="relative flex-shrink-0 rounded-lg overflow-hidden"
            style={{
              width: 48,
              height: 48,
              background: img ? undefined : "#E5E7EB",
            }}
          >
            {img ? (
              <img src={img} alt={`镜 ${shot.index}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-4 h-4" style={{ color: "#9CA3AF" }} />
              </div>
            )}
            <span
              className="absolute top-0.5 right-0.5 flex items-center justify-center rounded-full text-white text-[9px] font-bold"
              style={{ width: 16, height: 16, background: "rgba(0,0,0,0.5)" }}
            >
              {shot.index}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── FailedBody ──────────────────────────────────────────── */

export function FailedBody({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl"
      style={{ height: 120, background: "#FEF2F2", border: "1px solid #FECACA" }}
    >
      <AlertCircle className="w-6 h-6 mb-2" style={{ color: "#EF4444" }} />
      <span className="text-[12px] mb-2" style={{ color: "#DC2626" }}>
        {error || "生成失败"}
      </span>
      <button
        className="text-[12px] font-medium rounded-lg"
        style={{ padding: "4px 12px", background: "#FEE2E2", color: "#DC2626" }}
        onClick={onRetry}
      >
        重试
      </button>
    </div>
  );
}
