import type { CanvasNode, Edge } from "@/store/canvasStore";

export const initialNodes: CanvasNode[] = [
  // 9 image nodes — 3×3 grid layout with generous spacing
  { id: "img-1", kind: "image",         x: 80,   y: 80,   data: { name: "图片节点1", src: "https://picsum.photos/seed/cf-1/400/225" } },
  { id: "img-2", kind: "generateImage", x: 580,  y: 80,   data: { name: "图片节点2", src: "https://picsum.photos/seed/cf-2/400/225" } },
  { id: "img-3", kind: "generateImage", x: 1080, y: 80,   data: { name: "图片节点3", src: "https://picsum.photos/seed/cf-3/400/225" } },
  { id: "img-4", kind: "generateImage", x: 80,   y: 460,  data: { name: "图片节点4", src: "https://picsum.photos/seed/cf-4/400/225" } },
  { id: "img-5", kind: "generateImage", x: 580,  y: 460,  data: { name: "图片节点5", src: "https://picsum.photos/seed/cf-5/400/225" } },
  { id: "img-6", kind: "generateImage", x: 1080, y: 460,  data: { name: "图片节点6", src: "https://picsum.photos/seed/cf-6/400/225" } },
  { id: "img-7", kind: "generateImage", x: 80,   y: 840,  data: { name: "图片节点7", src: "https://picsum.photos/seed/cf-7/400/225" } },
  { id: "img-8", kind: "generateImage", x: 580,  y: 840,  data: { name: "图片节点8", src: "https://picsum.photos/seed/cf-8/400/225" } },
  { id: "img-9", kind: "generateImage", x: 1080, y: 840,  data: { name: "图片节点9", src: "https://picsum.photos/seed/cf-9/400/225" } },

  // 3 videos — spaced out vertically with more room
  { id: "vid-1", kind: "generateVideo", x: 1800, y: 80,   data: { name: "山间溪流", src: "https://picsum.photos/seed/cf-v1/400/225", duration: 5 } },
  { id: "vid-2", kind: "generateVideo", x: 1800, y: 560,  data: { name: "城市夜景", src: "https://picsum.photos/seed/cf-v2/400/225", duration: 4 } },
  { id: "vid-3", kind: "generateVideo", x: 1800, y: 1040, data: { name: "烟花绽放", src: "https://picsum.photos/seed/cf-v3/400/225", duration: 6 } },

  // 4 audios — further right, well spaced
  { id: "aud-1", kind: "audio", x: 2500, y: 80,   data: { name: "古筝曲", duration: 8, waveform: "" } },
  { id: "aud-2", kind: "audio", x: 2500, y: 360,  data: { name: "雨声白噪音", duration: 12, waveform: "" } },
  { id: "aud-3", kind: "audio", x: 2500, y: 640,  data: { name: "笛子独奏", duration: 6, waveform: "" } },
  { id: "aud-4", kind: "audio", x: 2500, y: 920,  data: { name: "鸟鸣晨曲", duration: 10, waveform: "" } },

  // Text node (已上传剧本) → Script node (空白，可直接生成)
  {
    id: "text-1",
    kind: "text",
    x: 80,
    y: 1300,
    data: {
      name: "剧本",
      text: "清晨，阳光透过竹林洒下斑驳的光影。一位身着素衣的少女沿着石板小路缓缓走来，手中提着一只竹篮。她在溪边停下脚步，俯身掬起一捧清水。远处山峦叠嶂，云雾缭绕，古寺的钟声隐约传来。少女抬头望向远方，嘴角浮起一丝微笑。",
    },
  },
  {
    id: "script-1",
    kind: "script",
    x: 700,
    y: 1300,
    data: {
      name: "分镜脚本",
      script: {
        title: "分镜脚本",
        promptText: "",
        model: "GVLM 3.1",
        status: "empty" as const,
        view: "table" as const,
        shots: [],
        hiddenColumns: [],
        filter: {},
        wizardStep: 1,
      },
    },
  },
];

export const initialEdges: Edge[] = [
  { id: "edge-text-script", from: "text-1", to: "script-1", sourceHandle: "out", toHandle: "in" },
];
