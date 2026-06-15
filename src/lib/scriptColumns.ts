import type { ScriptColumnKey, ScriptShot, ScriptFilter } from "@/store/canvasStore";

export const SCRIPT_COLUMNS: { key: ScriptColumnKey; label: string }[] = [
  { key: "duration", label: "时长" },
  { key: "description", label: "画面描述" },
  { key: "characters", label: "角色" },
  { key: "refImage", label: "参考" },
  { key: "shotType", label: "景别" },
  { key: "action", label: "角色动作" },
  { key: "emotion", label: "情绪" },
  { key: "sceneTags", label: "场景标签" },
  { key: "lighting", label: "光影氛围" },
  { key: "sound", label: "音效" },
  { key: "dialogue", label: "对白·旁白" },
  { key: "cameraMove", label: "运镜" },
  { key: "imagePrompt", label: "分镜提示词" },
  { key: "videoPrompt", label: "视频运动提示词" },
  { key: "finalPrompt", label: "最终提示词" },
];

/** Max character count across all shots — determines how many character column groups to render. */
export function characterGroupCount(shots: ScriptShot[]): number {
  return shots.reduce((m, s) => Math.max(m, s.characters.length), 0);
}

/** Return visible column keys (everything not in hidden list). */
export function visibleColumns(hidden: ScriptColumnKey[]): ScriptColumnKey[] {
  return SCRIPT_COLUMNS.filter((c) => !hidden.includes(c.key)).map((c) => c.key);
}

/** Filter shots by character name, shot type, or keyword in description/dialogue. */
export function filterShots(shots: ScriptShot[], filter: ScriptFilter): ScriptShot[] {
  let result = shots;

  if (filter.characterName) {
    const name = filter.characterName.toLowerCase();
    result = result.filter((s) => s.characters.some((c) => c.name.toLowerCase().includes(name)));
  }

  if (filter.shotType) {
    result = result.filter((s) => s.shotType === filter.shotType);
  }

  if (filter.keyword) {
    const kw = filter.keyword.toLowerCase();
    result = result.filter(
      (s) => s.description.toLowerCase().includes(kw) || s.dialogue.toLowerCase().includes(kw),
    );
  }

  return result;
}
