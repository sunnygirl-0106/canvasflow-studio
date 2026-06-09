import type { Shot } from "@/store/canvasStore";

export interface ClipStyle {
  bg: string;
  border: string;
  thumbBg: string;
  timeColor: string;
}

export const CLIP_STYLES: Record<Shot["color"], ClipStyle> = {
  cyan:    { bg: "#0E7490", border: "#67E8F9", thumbBg: "#155E75", timeColor: "#CFFAFE" },
  purple:  { bg: "#5B21B6", border: "#A78BFA", thumbBg: "#6D28D9", timeColor: "#EDE9FE" },
  yellow:  { bg: "#C2410C", border: "#FDBA74", thumbBg: "#9A3412", timeColor: "#FFEDD5" },
  rose:    { bg: "#9F1239", border: "#FDA4AF", thumbBg: "#881337", timeColor: "#FFE4E6" },
  emerald: { bg: "#047857", border: "#6EE7B7", thumbBg: "#065F46", timeColor: "#D1FAE5" },
  gray:    { bg: "#475569", border: "#94A3B8", thumbBg: "#334155", timeColor: "#E2E8F0" },
};
