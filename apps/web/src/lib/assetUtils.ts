import type { ScriptShot, ScriptAsset } from "@/store/types";

export const MENTION_REGEX = /@([\u4e00-\u9fff\w_]+)/g;

/**
 * Rich descriptions for scene / prop assets, keyed by their @mention name.
 * Character descriptions come from the shot's own `characters[].desc`; scenes
 * and props have no field on the shot, so we look them up here (falling back to
 * a generic label when a name isn't in the table).
 */
export const ASSET_DESCRIPTIONS: Record<string, string> = {
  // \u2014\u2014 \u573a\u666f \u2014\u2014
  \u5b8b\u4eba\u5e9c\u6b7b\u7262:
    "\u5b8b\u4eba\u5e9c\u5730\u5e95\u6b7b\u7262\u3002\u6781\u9ad8\u6311\u7684\u62f1\u5f62\u77f3\u9876\uff0c\u7c97\u7c9d\u9752\u77f3\u7816\u5899\u6e17\u7740\u6c34\u6e0d\uff0c\u9508\u8680\u94c1\u6805\u680f\u4e0e\u6563\u843d\u5e72\u8349\u5806\uff0c\u5899\u4e0a\u94c1\u67b6\u63d2\u7740\u5ffd\u660e\u5ffd\u6697\u7684\u706b\u628a\u2014\u2014\u9634\u68ee\u3001\u6f6e\u6e7f\u3001\u538b\u6291\uff0c\u900f\u7740\u8150\u673d\u4e0e\u7edd\u671b\u7684\u6c14\u606f\u3002",
  \u5c0f\u9547\u8857\u9053:
    "\u96e8\u540e\u7684\u6c5f\u5357\u5c0f\u9547\u8857\u9053\u3002\u9752\u77f3\u677f\u8def\u9762\u6cdb\u7740\u6c34\u5149\uff0c\u4e24\u4fa7\u662f\u6591\u9a73\u7684\u767d\u5899\u9edb\u74e6\u4e0e\u6728\u8d28\u5e97\u62db\uff0c\u5c4b\u6a90\u4ecd\u5728\u6ef4\u6c34\uff1b\u9633\u5149\u7a7f\u8fc7\u6563\u5f00\u7684\u4e91\u5c42\u6d12\u843d\uff0c\u6e7f\u6da6\u901a\u900f\u3001\u751f\u673a\u76ce\u7136\u3002",
  \u6cb3\u5824:
    "\u9ec4\u660f\u65f6\u5206\u7684\u6cb3\u5824\u3002\u7f13\u5761\u8349\u5730\u4e00\u76f4\u5ef6\u4f38\u5230\u6ce2\u5149\u7cbc\u7cbc\u7684\u6cb3\u9762\uff0c\u8fdc\u5904\u662f\u8fde\u7ef5\u7684\u57ce\u5e02\u526a\u5f71\u4e0e\u6a59\u7ea2\u8272\u665a\u971e\uff1b\u665a\u98ce\u62c2\u8fc7\u82a6\u82c7\uff0c\u5b81\u9759\u800c\u8fbd\u9614\u3002",
  \u6c34\u6d3c:
    "\u96e8\u540e\u8def\u8fb9\u7684\u6d45\u6d45\u6c34\u6d3c\u3002\u6e05\u6f88\u79ef\u6c34\u6620\u51fa\u5929\u7a7a\u4e0e\u5c11\u5973\u7684\u5012\u5f71\uff0c\u6c34\u9762\u5076\u6709\u6d9f\u6f2a\u6269\u6563\uff0c\u6298\u5c04\u51fa\u7ec6\u788e\u7684\u5149\u3002",
  // \u2014\u2014 \u9053\u5177 \u2014\u2014
  \u7384\u94c1\u9563\u94d0:
    "\u5e9f\u592a\u5b50\u8155\u4e0a\u7684\u5211\u5177\u3002\u7384\u94c1\u953b\u9020\uff0c\u6c89\u91cd\u539a\u5b9e\uff0c\u8868\u9762\u5e03\u6ee1\u6697\u7eb9\u4e0e\u9508\u8ff9\uff0c\u94fe\u73af\u76f8\u6263\u95f4\u900f\u7740\u51b7\u786c\u7684\u91d1\u5c5e\u5bd2\u5149\uff0c\u8c61\u5f81\u56da\u5f92\u8eab\u4efd\u4e0e\u5931\u52bf\u843d\u5dee\u3002",
  \u4e5d\u51e4\u671d\u9633\u888d:
    "\u6c88\u5a49\u6e05\u8eab\u7740\u7684\u534e\u8d35\u51e4\u888d\u3002\u77f3\u9752\u7f0e\u9762\u4ee5\u91d1\u7ebf\u5bc6\u7ee3\u4e5d\u53ea\u5c55\u7fc5\u671d\u9633\u51e4\u51f0\uff0c\u7f00\u4e1c\u73e0\u6d41\u82cf\u4e0e\u70b9\u7fe0\u4e91\u80a9\uff0c\u9006\u5149\u4e0b\u73e0\u5e18\u6d41\u5149\u6ea2\u5f69\uff0c\u5c3d\u663e\u7687\u5bb6\u5a01\u4eea\u4e0e\u51b7\u8273\u6c14\u573a\u3002",
  \u900f\u660e\u96e8\u4f1e:
    "\u5c11\u5973\u624b\u4e2d\u7684\u900f\u660e\u5851\u6599\u96e8\u4f1e\u3002\u4f1e\u9762\u901a\u900f\uff0c\u6b8b\u7559\u96e8\u73e0\u6cbf\u4f1e\u9aa8\u6ed1\u843d\uff0c\u9633\u5149\u900f\u8fc7\u65f6\u6298\u5c04\u51fa\u6de1\u6de1\u7684\u5f69\u8679\u5149\u6655\uff0c\u6e05\u65b0\u800c\u6709\u9752\u6625\u6c14\u606f\u3002",
  \u5e06\u5e03\u4e66\u5305:
    "\u5c11\u5973\u7684\u7c73\u8272\u5e06\u5e03\u4e66\u5305\u3002\u5355\u80a9\u6b3e\u5f0f\uff0c\u5e06\u5e03\u9762\u6599\u67d4\u8f6f\u6709\u8936\u76b1\uff0c\u7f00\u7740\u51e0\u679a\u5c0f\u5fbd\u7ae0\uff0c\u88c5\u7740\u76f8\u673a\u3001\u7b14\u8bb0\u672c\u7b49\u968f\u8eab\u6742\u7269\uff0c\u6ee1\u662f\u5b66\u751f\u65f6\u4ee3\u7684\u751f\u6d3b\u6c14\u606f\u3002",
  \u80f6\u7247\u76f8\u673a:
    "\u590d\u53e4\u80f6\u7247\u76f8\u673a\u3002\u94f6\u9ed1\u673a\u8eab\uff0c\u76ae\u9769\u9970\u9762\u5df2\u6709\u78e8\u635f\u75d5\u8ff9\uff0c\u65cb\u94ae\u4e0e\u53d6\u666f\u6846\u900f\u7740\u5e74\u4ee3\u611f\uff1b\u6309\u4e0b\u5feb\u95e8\u65f6\u53d1\u51fa\u6e05\u8106\u7684'\u5494\u5693'\u58f0\uff0c\u627f\u8f7d\u8bb0\u5f55\u7f8e\u597d\u77ac\u95f4\u7684\u4eea\u5f0f\u611f\u3002",
};

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
        description = ASSET_DESCRIPTIONS[name] ?? `场景: ${name}`;
      } else {
        type = "prop";
        description = ASSET_DESCRIPTIONS[name] ?? `道具: ${name}`;
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
