import { Handle, Position } from "@xyflow/react";
import { DemoImg } from "@/components/DemoImg";
import { memo } from "react";
import { Layers, ArrowRight, ExternalLink } from "lucide-react";
import { useCanvas, type DirectorNodeData, type CanvasNode } from "@/store/canvasStore";
import { NODE_COLORS as COLORS } from "./nodeTheme";

// Dark palette — matches TextNode / GenerateImageNode.
const BG = "#1F2125";
const DASH = "#3F4248";
const TEXT = "#E5E7EB";
const MUTED = "#9CA3AF";
const FONT = "PingFang SC, Inter, system-ui";

// The 3D director stage only accepts 2:1 scenes, so the card mirrors that ratio.
const WIDTH = 560;
const HEIGHT = WIDTH / 2; // 2:1

// A built-in sample panorama so the "已有全景图" state is visible without a real
// 3D render. Mirrors a dusk landscape: graded sky, soft sun glow, layered
// mountains and a grassy foreground.
const SAMPLE_PANORAMA = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1b2740"/>
        <stop offset="0.55" stop-color="#3a4a63"/>
        <stop offset="1" stop-color="#7c8a93"/>
      </linearGradient>
      <radialGradient id="sun" cx="0.74" cy="0.42" r="0.4">
        <stop offset="0" stop-color="#f2ead0" stop-opacity="0.9"/>
        <stop offset="0.4" stop-color="#cdbf95" stop-opacity="0.45"/>
        <stop offset="1" stop-color="#cdbf95" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#56624a"/>
        <stop offset="1" stop-color="#39432f"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="600" fill="url(#sky)"/>
    <rect width="1200" height="600" fill="url(#sun)"/>
    <path d="M0 360 L160 300 L320 350 L470 290 L640 345 L820 285 L980 340 L1140 300 L1200 330 L1200 600 L0 600 Z" fill="#2d3a4c" opacity="0.85"/>
    <path d="M0 400 L200 350 L380 400 L560 345 L760 395 L960 350 L1200 390 L1200 600 L0 600 Z" fill="#283442" opacity="0.9"/>
    <rect y="395" width="1200" height="205" fill="url(#ground)"/>
  </svg>`,
)}`;

export const DirectorNode = memo(DirectorNodeImpl);

function DirectorNodeImpl({ id, data }: { id: string; data: DirectorNodeData }) {
  const updateNode = useCanvas((s) => s.updateNode);
  const hasPanorama = Boolean(data.panorama);
  // Real panoramas are uploaded and referenced by URL; the "sample" sentinel
  // resolves to the inline SVG so the saved canvas never carries base64 data
  // (the project-save API rejects any "data:image/" payload).
  const panoramaSrc = data.panorama === "sample" ? SAMPLE_PANORAMA : data.panorama;

  // Simulate "opening the stage": building a scene captures a 2:1 panorama.
  const openStage = () =>
    updateNode(id, (n) => ({ ...n, data: { ...n.data, panorama: "sample" } }) as CanvasNode);

  return (
    <div className="fade-in group relative" style={{ width: WIDTH }}>
      {/* Header row (outside the box) */}
      <div className="flex items-center gap-1.5" style={{ padding: "0 4px 8px 4px", color: TEXT }}>
        <Layers
          className="w-[15px] h-[15px] flex-shrink-0"
          style={{ color: MUTED }}
          strokeWidth={1.8}
        />
        <span
          className="text-[14px] font-semibold truncate"
          style={{ color: TEXT, fontFamily: FONT }}
        >
          {data.name ?? "导演台"}
        </span>
      </div>

      {/* Body box — fixed 2:1 ratio */}
      <div
        className="relative rounded-2xl flex flex-col items-center justify-center"
        style={{
          height: HEIGHT,
          background: BG,
          border: hasPanorama ? `1px solid ${DASH}` : `1.5px dashed ${DASH}`,
          overflow: "hidden",
        }}
      >
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{ background: COLORS.handle }}
        />

        {hasPanorama ? (
          <>
            {/* Panorama thumbnail */}
            <DemoImg
              src={panoramaSrc}
              alt="场景全景图"
              draggable={false}
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: "cover" }}
            />
            {/* Subtle darkening so the button stays legible */}
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.18)" }} />
            {/* Frosted "enter" pill */}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="relative flex items-center gap-2 rounded-full transition-colors"
              style={{
                padding: "11px 24px",
                background: "rgba(28,30,34,0.55)",
                border: "1px solid rgba(255,255,255,0.16)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "#FFFFFF",
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(40,43,48,0.7)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(28,30,34,0.55)")}
            >
              <ExternalLink className="w-[17px] h-[17px]" strokeWidth={2} />
              进入导演台
            </button>
          </>
        ) : (
          <>
            <Layers className="w-11 h-11" style={{ color: "#4B5056" }} strokeWidth={1.4} />
            <div className="text-[14px]" style={{ color: MUTED, fontFamily: FONT, marginTop: 16 }}>
              {data.description ?? "在 3D 空间中搭建场景"}
            </div>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={openStage}
              className="flex items-center gap-2 rounded-full transition-colors"
              style={{
                marginTop: 18,
                padding: "10px 22px",
                background: "#2A2D33",
                border: `1px solid ${DASH}`,
                color: TEXT,
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#33373E")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#2A2D33")}
            >
              <ArrowRight className="w-[17px] h-[17px]" strokeWidth={2} />
              打开导演台
            </button>
          </>
        )}
      </div>
    </div>
  );
}
