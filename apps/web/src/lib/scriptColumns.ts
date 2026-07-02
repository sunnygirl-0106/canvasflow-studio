import type { ScriptColumnKey, ScriptShot, ScriptFilter } from "@/store/canvasStore";

// `width` is a proportional weight (px) used with `table-layout: fixed`: columns
// scale to fill the table but keep these ratios. Text-heavy columns (画面描述,
// 光影氛围, 对白, 运镜…) get generous room; short fields (时长, 景别) stay tight.
export const SCRIPT_COLUMNS: { key: ScriptColumnKey; label: string; width: number }[] = [
  { key: "duration", label: "时长", width: 70 },
  { key: "description", label: "画面描述", width: 320 },
  { key: "characters", label: "角色", width: 150 },
  { key: "refImage", label: "参考", width: 72 },
  { key: "shotType", label: "景别", width: 84 },
  { key: "action", label: "角色动作", width: 170 },
  { key: "emotion", label: "情绪", width: 120 },
  { key: "sceneTags", label: "场景标签", width: 150 },
  { key: "lighting", label: "光影氛围", width: 190 },
  { key: "sound", label: "音效", width: 180 },
  { key: "dialogue", label: "对白·旁白", width: 210 },
  { key: "cameraMove", label: "运镜", width: 190 },
  { key: "imagePrompt", label: "分镜提示词", width: 210 },
  { key: "videoPrompt", label: "视频运动提示词", width: 210 },
  { key: "finalPrompt", label: "最终提示词", width: 120 },
];

/** Proportional width (px) for a column key; used to build the table's colgroup. */
export const COLUMN_WIDTH: Record<ScriptColumnKey, number> = Object.fromEntries(
  SCRIPT_COLUMNS.map((c) => [c.key, c.width]),
) as Record<ScriptColumnKey, number>;

/** Fixed widths for the always-present index and delete columns. */
export const INDEX_COL_WIDTH = 56;
export const DELETE_COL_WIDTH = 44;
/** Character group renders three sub-columns: name, desc, image. */
export const CHAR_NAME_WIDTH = 120;
export const CHAR_DESC_WIDTH = 190;
export const IMAGE_COL_WIDTH = 72;

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
