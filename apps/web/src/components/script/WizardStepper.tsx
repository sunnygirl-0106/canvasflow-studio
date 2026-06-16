import { Check } from "lucide-react";
import type { WizardStep } from "@/store/types";

interface Props {
  currentStep: WizardStep;
  shotCount: number;
  assetCount: number;
  composedCount: number;
  totalCount: number;
  onStepClick: (step: WizardStep) => void;
}

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "确认镜头" },
  { step: 2, label: "准备资产" },
  { step: 3, label: "合成提示词" },
];

export function WizardStepper({
  currentStep,
  shotCount,
  assetCount,
  composedCount,
  totalCount,
  onStepClick,
}: Props) {
  const subLabel = (step: WizardStep) => {
    if (step === 1) return `${shotCount}个镜头已就绪`;
    if (step === 2) return assetCount === 0 ? "暂无资产" : `${assetCount}个资产`;
    return `${composedCount}/${totalCount} 已合成`;
  };

  return (
    <div className="flex items-center gap-3">
      {STEPS.map(({ step, label }, i) => {
        const isDone = step < currentStep;
        const isActive = step === currentStep;

        return (
          <div key={step} className="flex items-center">
            {/* Step button: circle + text horizontal */}
            <button
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => onStepClick(step)}
            >
              <div
                className="flex items-center justify-center rounded-full text-[12px] font-bold transition-colors flex-shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  ...(isDone || isActive
                    ? { background: "#1F2937", color: "#FFFFFF" }
                    : { background: "transparent", border: "2px solid #D1D5DB", color: "#D1D5DB" }),
                }}
              >
                {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : step}
              </div>
              <div className="flex flex-col items-start">
                <span
                  className="text-[13px] whitespace-nowrap leading-tight"
                  style={{
                    color: isDone || isActive ? "#1F2937" : "#9CA3AF",
                    fontFamily: "PingFang SC, Inter, system-ui",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {label}
                </span>
                <span
                  className="text-[11px] whitespace-nowrap leading-tight"
                  style={{
                    color: isDone || isActive ? "#6B7280" : "#D1D5DB",
                    fontFamily: "PingFang SC, Inter, system-ui",
                  }}
                >
                  {subLabel(step)}
                </span>
              </div>
            </button>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 40,
                  height: 2,
                  marginLeft: 12,
                  background: step < currentStep ? "#1F2937" : "#E5E5E5",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
