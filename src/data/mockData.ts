import type { CanvasNode, Edge, Shot } from "@/store/canvasStore";

const pic = (seed: string) => `https://picsum.photos/seed/${seed}/400/225`;

export const initialNodes: CanvasNode[] = [
  {
    id: "img-1",
    kind: "image",
    x: 80,
    y: 80,
    data: { src: pic("ancient1"), name: "5月10日(1).png" },
  },
  {
    id: "img-2",
    kind: "image",
    x: 80,
    y: 300,
    data: { src: pic("ancient2"), name: "5月10日(4).png" },
  },
  {
    id: "gen-img-1",
    kind: "generateImage",
    x: 400,
    y: 80,
    data: { src: pic("genimg1"), name: "AI 生图 #01" },
  },
  {
    id: "gen-vid-1",
    kind: "generateVideo",
    x: 400,
    y: 300,
    data: { src: pic("genvid1"), name: "AI 视频 #01", duration: 9 },
  },
  {
    id: "tl-1",
    kind: "timeline",
    x: 80,
    y: 560,
    data: {
      name: "主线时间线",
      width: 1600,
      pxPerSecond: 60,
      shots: [
        mkShot(0, "Shot 01", 3.0, ["img-1"], "cyan", pic("ancient1")),
        mkShot(1, "Shot 02", 5.6, ["gen-vid-1"], "purple", pic("genvid1"), 9),
        mkShot(2, "Shot 03", 2.4, ["gen-img-1"], "yellow", pic("genimg1")),
        mkShot(3, "Shot 04", 8.0, [], "gray"),
        mkShot(4, "Shot 05", 4.5, ["img-2"], "cyan", pic("ancient2")),
      ],
    },
  },
];

function mkShot(
  index: number,
  name: string,
  duration: number,
  bindings: string[],
  color: Shot["color"],
  thumbnail?: string,
  sourceMax?: number,
): Shot {
  return {
    id: `shot-${name.replace(/\s/g, "")}-${index}`,
    name,
    index,
    duration,
    sourceIn: 0,
    sourceOut: sourceMax ?? duration,
    bindings,
    thumbnail,
    color,
    status: bindings.length ? "ready" : "empty",
  };
}

export const initialEdges: Edge[] = [
  { id: "e1", from: "img-1", to: "gen-img-1" },
  { id: "e2", from: "img-2", to: "gen-vid-1" },
  { id: "e3", from: "img-1", to: "shot-Shot01-0" },
  { id: "e4", from: "gen-vid-1", to: "shot-Shot02-1" },
  { id: "e5", from: "gen-img-1", to: "shot-Shot03-2" },
  { id: "e6", from: "img-2", to: "shot-Shot05-4" },
];
