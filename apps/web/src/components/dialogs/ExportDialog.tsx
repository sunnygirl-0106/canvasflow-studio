import { useCanvas } from "@/store/canvasStore";
import { useState } from "react";
import { Copy, X, Check, Download } from "lucide-react";

export function ExportDialog() {
  const exportOpen = useCanvas((s) => s.exportOpen);
  const setExport = useCanvas((s) => s.setExport);
  const nodes = useCanvas((s) => s.nodes);
  const [copied, setCopied] = useState(false);

  if (!exportOpen) return null;

  const tl = nodes.find((n) => n.kind === "composition");
  const shots = (tl?.data.tracks ?? []).find((t) => t.kind === "video")?.clips ?? [];
  const text =
    exportOpen === "fcpxml" ? buildFcpxml(shots, tl?.data.name ?? "composition") : buildEdl(shots);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6 fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl p-5 node-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-semibold">
            导出 {exportOpen === "fcpxml" ? "FCPXML" : "EDL"}
          </div>
          <button
            onClick={() => setExport(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          readOnly
          value={text}
          className="w-full h-72 bg-background border border-border rounded-md p-3 text-xs font-mono text-foreground/90 resize-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            演示模式 · 文件已"下载"到 ~/Downloads (mock)
          </div>
          <div className="flex gap-2">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-secondary hover:bg-secondary/70"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-accent" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  复制
                </>
              )}
            </button>
            <button
              onClick={() => setExport(false)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground"
            >
              <Download className="w-3.5 h-3.5" />
              确认下载
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function tc(sec: number) {
  const f = Math.round(sec * 24);
  const h = Math.floor(f / 86400);
  const m = Math.floor((f % 86400) / 1440);
  const s = Math.floor((f % 1440) / 24);
  const fr = f % 24;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}:${p(fr)}`;
}

function buildFcpxml(shots: { name: string; duration: number }[], name: string) {
  let cur = 0;
  const clips = shots
    .map((s, i) => {
      const start = tc(cur);
      const dur = tc(s.duration);
      cur += s.duration;
      return `      <clip name="${s.name}" offset="${start}" duration="${dur}" tcFormat="NDF">\n        <video ref="r${i + 1}" />\n      </clip>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <format id="r0" name="FFVideoFormat1080p24" frameDuration="100/2400s" width="1920" height="1080"/>
  </resources>
  <library>
    <event name="WorkBuddy Export">
      <project name="${name}">
        <sequence format="r0" duration="${tc(cur)}">
          <spine>
${clips}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;
}

function buildEdl(shots: { name: string; duration: number; sourceIn: number }[]) {
  let cur = 0;
  const lines = shots
    .map((s, i) => {
      const inT = tc(cur);
      cur += s.duration;
      const outT = tc(cur);
      return `${String(i + 1).padStart(3, "0")}  AX       V     C        ${tc(s.sourceIn)} ${tc(s.sourceIn + s.duration)} ${inT} ${outT}\n* FROM CLIP NAME: ${s.name}`;
    })
    .join("\n");
  return `TITLE: WorkBuddy Export\nFCM: NON-DROP FRAME\n\n${lines}`;
}
