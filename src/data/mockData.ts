import type { CanvasNode, Edge, Shot } from "@/store/canvasStore";

const pic = (seed: string) => `https://picsum.photos/seed/${seed}/400/225`;

export const initialNodes: CanvasNode[] = [
  {
    id: "vid-1",
    kind: "generateVideo",
    x: 80,
    y: 80,
    data: { src: pic("ancient1"), name: "视频节点 7", duration: 11 },
  },
  {
    id: "vid-2",
    kind: "generateVideo",
    x: 500,
    y: 80,
    data: { src: pic("ancient2"), name: "视频节点 7", duration: 15 },
  },
  {
    id: "vid-3",
    kind: "generateVideo",
    x: 920,
    y: 80,
    data: { src: pic("genvid1"), name: "视频节点 7", duration: 13 },
  },
  {
    id: "tl-1",
    kind: "timeline",
    x: 80,
    y: 500,
    data: {
      name: "时间线节点 1",
      width: 1800,
      pxPerSecond: 60,
      shots: [
        mkShot(0, "视频节点 7 · 开场", 11, ["vid-1"], "cyan", pic("ancient1")),
        mkShot(1, "视频节点 7 · 主场景", 15, ["vid-2"], "purple", pic("ancient2"), 15),
        mkShot(2, "视频节点 7 · 收束", 13, ["vid-3"], "yellow", pic("genvid1")),
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
    id: `shot-${index}`,
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
  { id: "e1", from: "vid-1", to: "tl-1" },
  { id: "e2", from: "vid-2", to: "tl-1" },
  { id: "e3", from: "vid-3", to: "tl-1" },
];
