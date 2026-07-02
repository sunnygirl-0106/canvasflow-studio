import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useCanvas, type ScriptData, type ScriptColumnKey } from "@/store/canvasStore";
import { ScriptTableView } from "./ScriptTableView";
import { ComposePromptsDialog } from "./ComposePromptsDialog";
import { DialoguePopover } from "./DialoguePopover";

const STEP3_COLUMNS: ScriptColumnKey[] = [
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
}

export function ComposePromptsStep({ nodeId, script }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const composeFinalPrompts = useCanvas((s) => s.composeFinalPrompts);
  const updateScriptShot = useCanvas((s) => s.updateScriptShot);

  const composedCount = script.shots.filter((s) => s.finalPromptStatus === "done").length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-auto">
        <ScriptTableView
          nodeId={nodeId}
          script={script}
          visibleColumnOverride={STEP3_COLUMNS}
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
        <span className="text-[13px]" style={{ color: "#6B7280" }}>
          已合成 {composedCount}/{script.shots.length} 镜
        </span>
        <button
          className="flex items-center gap-2 text-[13px] font-semibold rounded-lg transition-colors hover:opacity-90"
          style={{
            padding: "8px 20px",
            background: "#14B8A6",
            color: "#0B1220",
          }}
          onClick={() => setDialogOpen(true)}
        >
          <Sparkles className="w-3.5 h-3.5" />
          一键合成全部提示词
        </button>
      </div>

      <ComposePromptsDialog
        open={dialogOpen}
        shots={script.shots}
        model={script.model}
        onCompose={(shotIds) => composeFinalPrompts(nodeId, shotIds)}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
