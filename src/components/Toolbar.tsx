import { useCanvas, fmtTime } from "@/store/canvasStore";
import { Share2, Wallet, FileDown, FileText } from "lucide-react";

export function Toolbar() {
  const projectName = useCanvas((s) => s.projectName);
  const setProjectName = useCanvas((s) => s.setProjectName);
  const setExport = useCanvas((s) => s.setExport);
  const tlCount = useCanvas((s) => s.timelineCount());
  const shotCount = useCanvas((s) => s.shotCount());
  const edgeCount = useCanvas((s) => s.edges.length);
  const total = useCanvas((s) => s.totalDuration());

  return (
    <header className="frosted h-12 px-4 flex items-center gap-4 border-b border-border z-30 relative">
      <div className="flex items-center gap-3">
        <div className="text-base font-bold tracking-tight">
          <span className="text-accent">Work</span>
          <span className="text-foreground">Buddy</span>
        </div>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded px-2 py-1 outline-none focus:bg-secondary/60 focus:text-foreground w-44"
        />
      </div>

      <div className="flex-1 flex justify-center">
        <div className="text-xs text-muted-foreground bg-secondary/40 rounded-full px-4 py-1.5 border border-border/60">
          <span className="text-foreground font-medium">{tlCount}</span> 条时间线 ·{" "}
          <span className="text-foreground font-medium">{shotCount}</span> 个片段 ·{" "}
          <span className="text-foreground font-medium">{edgeCount}</span> 条连线 · 总时长{" "}
          <span className="text-accent font-mono font-semibold">{fmtTime(total)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setExport("fcpxml")}
          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/60 hover:bg-secondary text-foreground transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" /> 导出 FCPXML
        </button>
        <button
          onClick={() => setExport("edl")}
          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/60 hover:bg-secondary text-foreground transition-colors"
        >
          <FileText className="w-3.5 h-3.5" /> 导出 EDL
        </button>
        <button className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/60 hover:bg-secondary text-foreground transition-colors">
          <Share2 className="w-3.5 h-3.5" /> 分享
        </button>
        <button className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          <Wallet className="w-3.5 h-3.5" /> 充值
        </button>
      </div>
    </header>
  );
}
