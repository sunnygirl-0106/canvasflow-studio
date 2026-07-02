/**
 * One-off migration: re-sync persisted script nodes to the CURRENT fixtures so
 * the compose-prompt view is rich AND internally consistent.
 *
 * Existing projects baked OLD shots (short prompts, older descriptions, smaller
 * asset sets) into SQLite at generate time; fixture edits don't retro-apply.
 * Blindly copying only the prompts would make them @-reference assets the node
 * never extracted (e.g. @水洼 / @帆布书包). So per script node we:
 *   1. detect the theme (凤回巢 / 夏日) from the shots' text,
 *   2. overwrite each shot's fields from the matching fixture by `index`
 *      (keeping the shot's own id / finalPrompt / finalPromptStatus),
 *   3. re-extract the asset set from the refreshed descriptions using the SAME
 *      algorithm as the app, preserving any already-generated image + id by name.
 *
 * Result: every shot's rich prompt @-references only assets that the 准备资产
 * step would actually produce — the chain stays linked.
 *
 * Run: pnpm --filter @canvasflow/api exec tsx scripts/repromptShots.ts
 */
import Database from "better-sqlite3";
import { pickFixture } from "../src/fixtures";

const dbPath = process.env.DATABASE_PATH ?? "./data/canvasflow.db";
const db = new Database(dbPath);

const FENG = pickFixture("凤回巢古风死牢");
const SUMMER = pickFixture("夏日晚风");

// ── Asset extraction — mirror of apps/web/src/lib/assetUtils.ts ──────────────
const MENTION_REGEX = /@([一-鿿\w_]+)/g;

const ASSET_DESCRIPTIONS: Record<string, string> = {
  宋人府死牢:
    "宋人府地底死牢。极高挑的拱形石顶，粗粝青石砖墙渗着水渍，锈蚀铁栅栏与散落干草堆，墙上铁架插着忽明忽暗的火把——阴森、潮湿、压抑，透着腐朽与绝望的气息。",
  小镇街道:
    "雨后的江南小镇街道。青石板路面泛着水光，两侧是斑驳的白墙黛瓦与木质店招，屋檐仍在滴水；阳光穿过散开的云层洒落，湿润通透、生机盎然。",
  河堤: "黄昏时分的河堤。缓坡草地一直延伸到波光粼粼的河面，远处是连绵的城市剪影与橙红色晚霞；晚风拂过芦苇，宁静而辽阔。",
  水洼: "雨后路边的浅浅水洼。清澈积水映出天空与少女的倒影，水面偶有涟漪扩散，折射出细碎的光。",
  玄铁镣铐:
    "废太子腕上的刑具。玄铁锻造，沉重厚实，表面布满暗纹与锈迹，链环相扣间透着冷硬的金属寒光，象征囚徒身份与失势落差。",
  九凤朝阳袍:
    "沈婉清身着的华贵凤袍。石青缎面以金线密绣九只展翅朝阳凤凰，缀东珠流苏与点翠云肩，逆光下珠帘流光溢彩，尽显皇家威仪与冷艳气场。",
  透明雨伞:
    "少女手中的透明塑料雨伞。伞面通透，残留雨珠沿伞骨滑落，阳光透过时折射出淡淡的彩虹光晕，清新而有青春气息。",
  帆布书包:
    "少女的米色帆布书包。单肩款式，帆布面料柔软有褶皱，缀着几枚小徽章，装着相机、笔记本等随身杂物，满是学生时代的生活气息。",
  胶片相机:
    "复古胶片相机。银黑机身，皮革饰面已有磨损痕迹，旋钮与取景框透着年代感；按下快门时发出清脆的'咔嚓'声，承载记录美好瞬间的仪式感。",
};

interface Asset {
  id: string;
  name: string;
  type: "character" | "scene" | "prop";
  description?: string;
  image?: string;
  [k: string]: unknown;
}

function matchesAnyTag(name: string, tags: Set<string>): boolean {
  for (const tag of tags) if (tag.includes(name) || name.includes(tag)) return true;
  return false;
}

function extractAssets(shots: any[]): Asset[] {
  const seen = new Map<string, Asset>();
  const charNames = new Set<string>();
  const sceneTagWords = new Set<string>();
  const charDescMap = new Map<string, string>();

  for (const shot of shots) {
    for (const char of shot.characters ?? []) {
      charNames.add(char.name);
      charDescMap.set(char.name, char.desc);
    }
    if (shot.sceneTags) {
      for (const tag of shot.sceneTags.split(/[,，、\s]+/).filter(Boolean)) sceneTagWords.add(tag);
    }
  }

  for (const shot of shots) {
    const regex = new RegExp(MENTION_REGEX.source, "g");
    let m: RegExpExecArray | null;
    while ((m = regex.exec(shot.description ?? "")) !== null) {
      const name = m[1];
      if (seen.has(name)) continue;
      let type: Asset["type"];
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
      seen.set(name, { id: `asset-${seen.size}`, name, type, description });
    }
  }
  return Array.from(seen.values());
}

/** Sniff which fixture a script node's shots belong to. */
function pickFixtureForShots(shots: any[]): typeof FENG {
  const blob = shots
    .map((s) => `${s.description ?? ""} ${(s.characters ?? []).map((c: any) => c.name).join("")}`)
    .join(" ");
  return /萧宇轩|沈婉清|沈若雪|死牢|镣铐|凤袍/.test(blob) ? FENG : SUMMER;
}

// ── Migration ────────────────────────────────────────────────────────────────
const rows = db.prepare("SELECT id, canvas FROM projects").all() as {
  id: string;
  canvas: string;
}[];

let projectsTouched = 0;
let shotsTouched = 0;
let assetsAdded = 0;

for (const row of rows) {
  let canvas: { nodes?: any[]; edges?: any[] };
  try {
    canvas = JSON.parse(row.canvas);
  } catch {
    continue;
  }
  let changed = false;

  for (const node of canvas.nodes ?? []) {
    if (node?.kind !== "script") continue;
    const shots = node.data?.script?.shots ?? [];
    if (shots.length === 0) continue;
    const fixture = pickFixtureForShots(shots);

    // 1) re-sync shot fields from fixture by index
    for (const shot of shots) {
      const fresh = fixture.find((f) => f.index === shot.index);
      if (!fresh) continue;
      const { finalPrompt, finalPromptStatus, id } = shot;
      Object.assign(shot, fresh, { id, finalPrompt, finalPromptStatus });
      changed = true;
      shotsTouched++;
    }

    // 2) rebuild assets from refreshed descriptions, preserving image/id by name
    const existing: Asset[] = node.data?.script?.assets ?? [];
    const byName = new Map(existing.map((a) => [a.name, a]));
    const rebuilt = extractAssets(shots).map((a) => {
      const prev = byName.get(a.name);
      if (prev) return { ...a, id: prev.id, image: prev.image, generationStatus: prev.generationStatus };
      assetsAdded++;
      return a;
    });
    // keep any user-added blank/custom assets not derived from mentions
    for (const a of existing) {
      if (!rebuilt.some((r) => r.name === a.name) && a.name?.trim()) rebuilt.push(a);
    }
    node.data.script.assets = rebuilt;
  }

  if (changed) {
    db.prepare(
      "UPDATE projects SET canvas = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(JSON.stringify(canvas), row.id);
    projectsTouched++;
  }
}

console.log(
  `Done. Projects: ${projectsTouched}, shots re-synced: ${shotsTouched}, new assets added: ${assetsAdded}`,
);
db.close();
