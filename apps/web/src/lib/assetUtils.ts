import type { ScriptShot, ScriptAsset } from "@/store/types";

export const MENTION_REGEX = /@([\u4e00-\u9fff\w_]+)/g;

export interface TextSegment {
  type: "text" | "mention";
  value: string;
}

export function parseDescription(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  const regex = new RegExp(MENTION_REGEX.source, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "mention", value: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
}

export function extractAssetsFromShots(shots: ScriptShot[]): ScriptAsset[] {
  const seen = new Map<string, ScriptAsset>();

  // Collect all character names and scene tags for classification
  const charNames = new Set<string>();
  const sceneTagWords = new Set<string>();
  const charDescMap = new Map<string, string>();

  for (const shot of shots) {
    for (const char of shot.characters) {
      charNames.add(char.name);
      charDescMap.set(char.name, char.desc);
    }
    if (shot.sceneTags) {
      for (const tag of shot.sceneTags.split(/[,，、\s]+/).filter(Boolean)) {
        sceneTagWords.add(tag);
      }
    }
  }

  for (const shot of shots) {
    const regex = new RegExp(MENTION_REGEX.source, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(shot.description)) !== null) {
      const name = match[1];
      if (seen.has(name)) continue;

      let type: ScriptAsset["type"];
      let description: string | undefined;

      if (charNames.has(name)) {
        type = "character";
        description = charDescMap.get(name);
      } else if (sceneTagWords.has(name) || matchesAnyTag(name, sceneTagWords)) {
        type = "scene";
        description = `场景: ${name}`;
      } else {
        type = "prop";
        description = `道具: ${name}`;
      }

      seen.set(name, {
        id: `asset-${Date.now()}-${seen.size}`,
        name,
        type,
        description,
      });
    }
  }

  return Array.from(seen.values());
}

function matchesAnyTag(name: string, tags: Set<string>): boolean {
  for (const tag of tags) {
    if (tag.includes(name) || name.includes(tag)) return true;
  }
  return false;
}
