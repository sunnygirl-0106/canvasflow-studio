import type { CanvasNode, Edge } from "@/store/canvasStore";

const IMG_A = "https://picsum.photos/seed/cf-a/400/225";
const IMG_B = "https://picsum.photos/seed/cf-b/400/225";

// Demo scene: two image nodes + an audio node feeding a composition that already
// has V1 (2 clips), V2 (1 overlapping clip for picture-in-picture) and A1 (audio).
export const initialNodes: CanvasNode[] = [
  { id: "img-a", kind: "image", x: 120, y: 120, data: { name: "海边", src: IMG_A, duration: 3 } },
  { id: "img-b", kind: "image", x: 120, y: 340, data: { name: "山林", src: IMG_B, duration: 3 } },
  {
    id: "audio-bgm",
    kind: "audio",
    x: 120,
    y: 560,
    data: { name: "背景音乐", duration: 5, waveform: "" },
  },
  {
    id: "comp-demo",
    kind: "composition",
    x: 560,
    y: 280,
    data: {
      name: "视频合成 1",
      width: 1200,
      pxPerSecond: 60,
      tracks: [
        {
          id: "track-v1",
          kind: "video",
          name: "V1",
          clips: [
            {
              id: "clip-a",
              name: "海边 · 01",
              index: 0,
              startSec: 0,
              duration: 3,
              baseDuration: 3,
              speed: 1,
              sourceIn: 0,
              sourceOut: 3,
              bindings: ["img-a"],
              thumbnail: IMG_A,
              color: "cyan",
              status: "ready",
              clipKind: "video",
            },
            {
              id: "clip-b",
              name: "山林 · 02",
              index: 1,
              startSec: 3,
              duration: 3,
              baseDuration: 3,
              speed: 1,
              sourceIn: 0,
              sourceOut: 3,
              bindings: ["img-b"],
              thumbnail: IMG_B,
              color: "purple",
              status: "ready",
              clipKind: "video",
            },
          ],
        },
        {
          id: "track-v2",
          kind: "video",
          name: "V2",
          clips: [
            {
              id: "clip-c",
              name: "山林 · 叠加",
              index: 0,
              startSec: 1,
              duration: 2,
              baseDuration: 2,
              speed: 1,
              sourceIn: 0,
              sourceOut: 2,
              bindings: ["img-b"],
              thumbnail: IMG_B,
              color: "yellow",
              status: "ready",
              clipKind: "video",
            },
          ],
        },
        {
          id: "track-a1",
          kind: "audio",
          name: "A1",
          clips: [
            {
              id: "clip-audio",
              name: "背景音乐",
              index: 0,
              startSec: 0,
              duration: 5,
              baseDuration: 5,
              speed: 1,
              sourceIn: 0,
              sourceOut: 5,
              bindings: ["audio-bgm"],
              color: "gray",
              status: "ready",
              clipKind: "audio",
              muted: false,
            },
          ],
        },
      ],
    },
  },
];

export const initialEdges: Edge[] = [
  {
    id: "e-a",
    from: "img-a",
    to: "comp-demo",
    sourceHandle: "source-process",
    toHandle: "comp-in",
    color: "#56C7CF",
  },
  {
    id: "e-b",
    from: "img-b",
    to: "comp-demo",
    sourceHandle: "source-process",
    toHandle: "comp-in",
    color: "#7C3AED",
  },
  { id: "e-audio", from: "audio-bgm", to: "comp-demo", color: "#94A3B8" },
];
