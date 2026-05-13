import { useCanvas } from "@/store/canvasStore";
import { X } from "lucide-react";

export function PropertiesPanel() {
  const open = useCanvas((s) => s.panelOpen);
  const togglePanel = useCanvas((s) => s.togglePanel);
  const selectedId = useCanvas((s) => s.selectedId);
  const selectedShotId = useCanvas((s) => s.selectedShotId);
  const nodes = useCanvas((s) => s.nodes);
  const updateNode = useCanvas((s) => s.updateNode);
  const updateShot = useCanvas((s) => s.updateShot);

  const node = nodes.find((n) => n.id === selectedId);
  const shotEntry = (() => {
    if (!selectedShotId) return null;
    for (const n of nodes) {
      const sh = n.data.shots?.find((s) => s.id === selectedShotId);
      if (sh) return { tlId: n.id, shot: sh };
    }
    return null;
  })();

  if (!open || (!node && !shotEntry)) return null;

  return (
    <aside className="absolute top-12 right-0 bottom-0 w-72 frosted border-l border-border z-20 p-4 overflow-y-auto fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">属性</div>
        <button onClick={() => togglePanel(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {node && (
        <div className="space-y-3 text-xs">
          <Row label="ID"><code className="text-muted-foreground">{node.id}</code></Row>
          <Row label="类型"><span className="text-accent">{node.kind}</span></Row>
          <Row label="名称">
            <input
              value={node.data.name ?? ""}
              onChange={(e) => updateNode(node.id, { data: { ...node.data, name: e.target.value } } as any)}
              className="w-full bg-secondary/60 rounded px-2 py-1 text-foreground"
            />
          </Row>
          {node.data.src && (
            <div className="rounded-md overflow-hidden border border-border">
              <img src={node.data.src} alt="" className="w-full" />
            </div>
          )}
        </div>
      )}

      {shotEntry && (
        <div className="space-y-3 text-xs">
          <Row label="名称">
            <input
              value={shotEntry.shot.name}
              onChange={(e) => updateShot(shotEntry.tlId, shotEntry.shot.id, { name: e.target.value })}
              className="w-full bg-secondary/60 rounded px-2 py-1"
            />
          </Row>
          <Row label="时长 (秒)">
            <input
              type="number"
              step="0.1"
              value={shotEntry.shot.duration}
              onChange={(e) => updateShot(shotEntry.tlId, shotEntry.shot.id, { duration: Number(e.target.value) })}
              className="w-full bg-secondary/60 rounded px-2 py-1"
            />
          </Row>
          <Row label="入点">
            <input
              type="number"
              step="0.1"
              value={shotEntry.shot.sourceIn}
              onChange={(e) => updateShot(shotEntry.tlId, shotEntry.shot.id, { sourceIn: Number(e.target.value) })}
              className="w-full bg-secondary/60 rounded px-2 py-1"
            />
          </Row>
          <Row label="状态"><span className="text-accent">{shotEntry.shot.status}</span></Row>
          <Row label="绑定">{shotEntry.shot.bindings.join(", ") || "—"}</Row>
          {shotEntry.shot.thumbnail && (
            <img src={shotEntry.shot.thumbnail} alt="" className="w-full rounded-md border border-border" />
          )}
        </div>
      )}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground mb-1">{label}</div>
      <div>{children}</div>
    </div>
  );
}
