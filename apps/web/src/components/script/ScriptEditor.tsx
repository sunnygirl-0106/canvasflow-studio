import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useCanvas } from "@/store/canvasStore";
import type { WizardStep } from "@/store/types";
import { WizardStepper } from "./WizardStepper";
import { ConfirmShotsStep } from "./ConfirmShotsStep";
import { PrepareAssetsStep } from "./PrepareAssetsStep";
import { ComposePromptsStep } from "./ComposePromptsStep";

export function ScriptEditor() {
  const editorScriptId = useCanvas((s) => s.editorScriptId);
  const node = useCanvas((s) => s.nodes.find((n) => n.id === editorScriptId));
  const closeScript = useCanvas((s) => s.closeScript);
  const setScriptWizardStep = useCanvas((s) => s.setScriptWizardStep);

  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    if (!editorScriptId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeScript();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorScriptId, closeScript]);

  if (!editorScriptId || !node || node.kind !== "script") return null;

  const script = node.data.script;
  const nodeId = node.id;
  const currentStep: WizardStep = script.wizardStep ?? 1;

  const shotCount = script.shots.length;
  const assetCount = script.assets?.length ?? 0;
  const composedCount = script.shots.filter((s) => s.finalPromptStatus === "done").length;

  const goToStep = (step: WizardStep) => setScriptWizardStep(nodeId, step);

  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "#FFFFFF" }}>
      {/* ── Title bar ────────────────────────────────────── */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          height: 72,
          padding: "0 24px",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <span
          className="text-[15px] font-bold"
          style={{ color: "#1A1A1A", fontFamily: "PingFang SC, Inter, system-ui" }}
        >
          {script.title}
        </span>

        {/* Center: stepper */}
        <WizardStepper
          currentStep={currentStep}
          shotCount={shotCount}
          assetCount={assetCount}
          composedCount={composedCount}
          totalCount={shotCount}
          onStepClick={goToStep}
        />

        {/* Right: hint + close */}
        <div className="flex items-center gap-3">
          {hintVisible && (
            <div
              className="flex items-center gap-2 text-[12px] rounded-lg"
              style={{
                padding: "6px 12px",
                background: "#F0FDF4",
                color: "#166534",
                border: "1px solid #BBF7D0",
              }}
            >
              <span>{currentStep}/3 完成后可批量生视频</span>
              <button className="hover:text-green-800" onClick={() => setHintVisible(false)}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <button
            onClick={closeScript}
            className="flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            style={{ width: 32, height: 32 }}
            title="关闭"
          >
            <X className="w-4 h-4" style={{ color: "#6B7280" }} />
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col" style={{ padding: "16px 24px 24px" }}>
        {currentStep === 1 && (
          <ConfirmShotsStep nodeId={nodeId} script={script} onNext={() => goToStep(2)} />
        )}
        {currentStep === 2 && (
          <PrepareAssetsStep nodeId={nodeId} script={script} onNext={() => goToStep(3)} />
        )}
        {currentStep === 3 && <ComposePromptsStep nodeId={nodeId} script={script} />}
      </div>
    </div>,
    document.body,
  );
}
