import { useEffect, useState } from "react";
import type { Shot } from "@/store/canvasStore";

export function PreviewPopover({ shot, bindingName }: { shot: Shot; bindingName?: string }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => (x + 0.1) % shot.duration), 100);
    return () => clearInterval(id);
  }, [shot.duration]);
  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 frosted rounded-lg border border-border node-shadow p-2 z-50 pointer-events-none fade-in">
      <div className="aspect-video bg-secondary rounded overflow-hidden mb-2">
        {shot.thumbnail ? (
          <img src={shot.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">未绑定</div>
        )}
      </div>
      <div className="text-[11px] text-foreground font-medium truncate">{shot.name}</div>
      <div className="text-[10px] text-muted-foreground truncate">{bindingName ?? "—"}</div>
      <div className="mt-1.5 h-1 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${(t / shot.duration) * 100}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
        <span>{t.toFixed(1)}s</span>
        <span>{shot.duration.toFixed(1)}s</span>
      </div>
    </div>
  );
}
