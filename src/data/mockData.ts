import type { CanvasNode, Edge } from "@/store/canvasStore";

export const initialNodes: CanvasNode[] = [
  // 9 images
  { id: "img-1", kind: "image", x: 80,  y: 60,  data: { name: "海边日落", src: "https://picsum.photos/seed/cf-1/400/225" } },
  { id: "img-2", kind: "image", x: 420, y: 30,  data: { name: "山林晨雾", src: "https://picsum.photos/seed/cf-2/400/225" } },
  { id: "img-3", kind: "image", x: 760, y: 90,  data: { name: "古镇小巷", src: "https://picsum.photos/seed/cf-3/400/225" } },
  { id: "img-4", kind: "image", x: 150, y: 320, data: { name: "雪山湖泊", src: "https://picsum.photos/seed/cf-4/400/225" } },
  { id: "img-5", kind: "image", x: 500, y: 280, data: { name: "沙漠驼铃", src: "https://picsum.photos/seed/cf-5/400/225" } },
  { id: "img-6", kind: "image", x: 830, y: 340, data: { name: "竹林深处", src: "https://picsum.photos/seed/cf-6/400/225" } },
  { id: "img-7", kind: "image", x: 60,  y: 560, data: { name: "江南水乡", src: "https://picsum.photos/seed/cf-7/400/225" } },
  { id: "img-8", kind: "image", x: 440, y: 530, data: { name: "草原星空", src: "https://picsum.photos/seed/cf-8/400/225" } },
  { id: "img-9", kind: "image", x: 780, y: 580, data: { name: "梯田日出", src: "https://picsum.photos/seed/cf-9/400/225" } },

  // 3 videos
  { id: "vid-1", kind: "generateVideo", x: 1140, y: 80,  data: { name: "山间溪流", src: "https://picsum.photos/seed/cf-v1/400/225", duration: 5 } },
  { id: "vid-2", kind: "generateVideo", x: 1160, y: 310, data: { name: "城市夜景", src: "https://picsum.photos/seed/cf-v2/400/225", duration: 4 } },
  { id: "vid-3", kind: "generateVideo", x: 1120, y: 550, data: { name: "烟花绽放", src: "https://picsum.photos/seed/cf-v3/400/225", duration: 6 } },

  // 4 audios
  { id: "aud-1", kind: "audio", x: 1480, y: 50,  data: { name: "古筝曲", duration: 8, waveform: "" } },
  { id: "aud-2", kind: "audio", x: 1520, y: 240, data: { name: "雨声白噪音", duration: 12, waveform: "" } },
  { id: "aud-3", kind: "audio", x: 1460, y: 430, data: { name: "笛子独奏", duration: 6, waveform: "" } },
  { id: "aud-4", kind: "audio", x: 1500, y: 600, data: { name: "鸟鸣晨曲", duration: 10, waveform: "" } },
];

export const initialEdges: Edge[] = [];
