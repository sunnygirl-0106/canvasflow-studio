import { Plus, ArrowRight } from "lucide-react";
import { useCanvas, type ScriptData, type ScriptColumnKey } from "@/store/canvasStore";
import { ScriptTableView } from "./ScriptTableView";
import { DialoguePopover } from "./DialoguePopover";

const STEP1_COLUMNS: ScriptColumnKey[] = [
  "duration",
  "description",
  "shotType",
  "lighting",
  "dialogue",
  "sound",
  "cameraMove",
  "finalPrompt",
];

interface Props {
  nodeId: string;
  script: ScriptData;
  onNext: () => void;
}

export function ConfirmShotsStep({ nodeId, script, onNext }: Props) {
  const addScriptShot = useCanvas((s) => s.addScriptShot);
  const updateScriptShot = useCanvas((s) => s.updateScriptShot);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-auto">
        <ScriptTableView
          nodeId={nodeId}
          script={script}
          visibleColumnOverride={STEP1_COLUMNS}
          renderDialogueCell={(shot) => (
            <DialoguePopover
              value={shot.dialogue}
              onChange={(v) => updateScriptShot(nodeId, shot.id, { dialogue: v })}
            />
          )}
        />
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: "16px 0 0" }}
      >
        <button
          className="flex items-center gap-1.5 text-[13px] font-medium rounded-lg transition-colors hover:bg-white/5"
          style={{
            padding: "8px 16px",
            color: "#E5E7EB",
            border: "1px solid #2A2D33",
          }}
          onClick={() => addScriptShot(nodeId)}
        >
          <Plus className="w-3.5 h-3.5" />
          添加镜头
        </button>
        <button
          className="flex items-center gap-1.5 text-[13px] font-semibold rounded-lg transition-colors hover:opacity-90"
          style={{
            padding: "8px 20px",
            background: "#14B8A6",
            color: "#0B1220",
          }}
          onClick={onNext}
        >
          下一步: 准备资产
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
