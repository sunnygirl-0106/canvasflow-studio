import type { CanvasNode, Edge } from "@/store/canvasStore";

export const initialNodes: CanvasNode[] = [
  // Text node (已上传剧本) → Script node (空白，可直接生成)
  {
    id: "text-1",
    kind: "text",
    x: 80,
    y: 200,
    data: {
      name: "剧本",
      text: "清晨，阳光透过竹林洒下斑驳的光影。一位身着素衣的少女沿着石板小路缓缓走来，手中提着一只竹篮。她在溪边停下脚步，俯身掬起一捧清水。远处山峦叠嶂，云雾缭绕，古寺的钟声隐约传来。少女抬头望向远方，嘴角浮起一丝微笑。",
    },
  },
  {
    id: "script-1",
    kind: "script",
    x: 700,
    y: 200,
    data: {
      name: "分镜脚本",
      script: {
        title: "分镜脚本",
        promptText: "",
        model: "GVLM 3.1",
        status: "empty",
        view: "table",
        shots: [],
        hiddenColumns: [],
        filter: {},
        wizardStep: 1,
      },
    },
  },

  // ── 演示「挂载/版本新鲜度」改动的节点 ──────────────────────────────
  // 图片1：已生成（status ready，有 src）→ 打开面板「主图参与生成」默认勾选。
  {
    id: "image-1",
    kind: "image",
    x: 80,
    y: 520,
    data: {
      name: "图片1",
      src: "https://picsum.photos/seed/canvasflow-demo-a/400/225",
      status: "ready",
      model: "phan-nano-l",
    },
  },
  // 图片2：空节点（status empty，无 src），且有上游 图片1 连入。
  //   → 面板顶部应显示「已挂载 图片1」缩略图（派生自 edge + 上游实时 src）。
  //   → 「主图参与生成」默认不勾选（本节点尚无主图）。
  {
    id: "generateImage-2",
    kind: "generateImage",
    x: 520,
    y: 520,
    data: {
      name: "图片2",
      status: "empty",
      model: "phan-nano-l",
      prompt: "",
      estimatedCost: 36,
    },
  },
  // 独立空节点：无任何上游 → 挂载为空、不勾选主图。
  {
    id: "generateImage-3",
    kind: "generateImage",
    x: 80,
    y: 760,
    data: {
      name: "图片3",
      status: "empty",
      model: "phan-nano-l",
      prompt: "",
      estimatedCost: 36,
    },
  },
];

export const initialEdges: Edge[] = [
  { id: "edge-text-script", from: "text-1", to: "script-1", sourceHandle: "out", toHandle: "in" },
  // 图片1 → 图片2：演示「已挂载 图片1」
  {
    id: "edge-img1-img2",
    from: "image-1",
    to: "generateImage-2",
    sourceHandle: "source-process",
    toHandle: "in",
  },
];
