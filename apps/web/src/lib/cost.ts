import type { VideoMode } from "@/store/canvasStore";

export function estimateImageCost(prompt: string, _model?: string): number {
  const base = 36;
  const len = prompt.trim().length;
  const promptFactor = Math.min(15, Math.ceil(len / 2));
  return base + promptFactor;
}

export function estimateVideoCost(opts: {
  prompt?: string;
  mode?: VideoMode;
  duration?: number;
  resolution?: string;
  withSound?: boolean;
}): number {
  const base = 488;
  const durFactor = (opts.duration ?? 5) * 40;
  const resFactor = opts.resolution === "1080p" ? 100 : 50;
  const modeFactor = opts.mode === "ref" ? 88 : 50;
  return base + durFactor + resFactor + modeFactor;
}
