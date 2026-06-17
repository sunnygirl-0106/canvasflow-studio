import type { CanvasNode, Edge, NodeKind } from "../types";

// Per refactor 原则 A: a node's upstream "mount" is derived from
// edges + the live data of the source node — never cached on the
// downstream node. Returning fresh values every render is intentional:
// regenerating an upstream image must immediately propagate to any
// "已挂载" thumbnail on a downstream panel.
//
// TextNode is the canonical source-only kind (no target handle) and
// therefore always returns []. This is not a bug — it is the data-flow
// shape.

export interface MountItem {
  nodeId: string;
  kind: NodeKind;
  name: string;
  src?: string;
  text?: string;
}

export function getUpstreamMounts(
  state: { nodes: CanvasNode[]; edges: Edge[] },
  nodeId: string,
): MountItem[] {
  const incoming = state.edges.filter((e) => e.to === nodeId);
  if (incoming.length === 0) return [];

  // Build an id→node index once (O(n)) instead of an O(n) .find() per edge,
  // which made this O(edges × nodes). This runs on every downstream render.
  const byId = new Map(state.nodes.map((n) => [n.id, n]));

  const mounts: MountItem[] = [];
  for (const e of incoming) {
    const n = byId.get(e.from);
    if (!n) continue;
    const data = n.data as { name?: string; src?: string };
    mounts.push({
      nodeId: n.id,
      kind: n.kind,
      name: data.name ?? n.id,
      src: "src" in n.data ? data.src : undefined,
      text: n.kind === "text" ? n.data.text : undefined,
    });
  }
  return mounts;
}
