import { create } from "zustand";
import { placeholderImage } from "@canvasflow/shared";
import { initialNodes, initialEdges } from "@/data/mockData";
import { loadProject, saveProject } from "@/services/api";
import {
  type CanvasNode,
  type Edge,
  type NodeKind,
  type StoreState,
  type SaveStatus,
  compDuration,
  NODE_DEFAULT_NAMES,
  SCRIPT_MODELS,
} from "./types";
import { createCompositionSlice } from "./compositionSlice";
import { createStoryboardSlice } from "./storyboardSlice";
import { createGroupSlice } from "./groupSlice";
import { createScriptSlice } from "./scriptSlice";
import { storyboardMemberPos, sortNodesContainerFirst } from "@/lib/container";

// Re-export everything from types so existing component imports keep working.
// NOTE: `export *` skips names that are locally imported, so we must explicitly
// re-export the ones used in this file.
export * from "./types";
export type { CanvasNode, Edge, NodeKind, StoreState, SaveStatus };
export { compDuration, NODE_DEFAULT_NAMES, SCRIPT_MODELS };

// ── Node factory ────────────────────────────────────────────────────────────

function createNodeByKind(
  kind: NodeKind,
  id: string,
  x: number,
  y: number,
  nameOverride?: string,
): CanvasNode {
  const name = nameOverride ?? NODE_DEFAULT_NAMES[kind];
  const seed = Math.random().toString(36).slice(2, 7);

  switch (kind) {
    case "image":
      return {
        id,
        kind,
        x,
        y,
        data: {
          name,
          src: placeholderImage(seed, 400, 225),
          status: "ready",
          model: "phan-nano-l",
        },
      };
    case "generateImage":
      return {
        id,
        kind,
        x,
        y,
        data: {
          name,
          status: "empty",
          model: "phan-nano-l",
          prompt: "",
          estimatedCost: 36,
        },
      };
    case "generateVideo":
      return {
        id,
        kind,
        x,
        y,
        data: {
          name,
          status: "empty",
          videoMode: "text",
          model: "SD 2.0",
          aspect: "9:16",
          resolution: "720p",
          duration: 5,
          withSound: true,
          prompt: "",
          estimatedCost: 788,
        },
      };
    case "composition":
      return { id, kind, x, y, data: { name, width: 1200, pxPerSecond: 60, tracks: [] } };
    case "audio":
      return { id, kind, x, y, data: { name, duration: 5, waveform: "" } };
    case "nodeGroup":
      return {
        id,
        kind,
        x,
        y,
        data: { name, memberIds: [], members: [], groupColor: "#56C7CF", groupLayout: "grid" },
      };
    case "storyboard":
      return {
        id,
        kind,
        x,
        y,
        data: {
          name,
          storyboard: { rows: 0, cols: 0, ratio: "16:9", showIndex: false, memberIds: [] },
        },
      };
    case "text":
      return { id, kind, x, y, data: { name, text: "" } };
    case "director":
      return { id, kind, x, y, data: { name } };
    case "script":
      return {
        id,
        kind,
        x,
        y,
        data: {
          name,
          script: {
            title: "未命名脚本",
            promptText: "",
            model: SCRIPT_MODELS[0],
            status: "empty",
            view: "table",
            shots: [],
            hiddenColumns: [],
            filter: {},
            wizardStep: 1,
          },
        },
      };
  }
}

// ── Helpers for discriminated-union node access ─────────────────────────────

function getNodeSrc(n: CanvasNode): string | undefined {
  if (n.kind === "image" || n.kind === "generateImage" || n.kind === "generateVideo")
    return n.data.src;
  return undefined;
}

function getNodeTracks(n: CanvasNode) {
  return n.kind === "composition" ? n.data.tracks : undefined;
}

// ── Sanitise transient states after reload ───────────────────────────────────
// No background task survives a page refresh, so "in-progress" states are stale.

function sanitizeNodes(rawNodes: CanvasNode[]): CanvasNode[] {
  const fixed = rawNodes.map((n) => {
    if (n.kind === "image" || n.kind === "generateImage") {
      const status = n.data.status ?? (n.data.src ? "ready" : "empty");
      const fixed = status === "generating" ? "empty" : status;
      // Per refactor 原则 A: a node with no main image must not carry a
      // persisted `useMainImage`. Older saves baked in `true`, which would
      // keep the toggle checked on empty nodes regardless of the new
      // derived default. Strip it so the panel falls back to `?? hasMain`.
      const hasMain = !!n.data.src && fixed === "ready";
      const staleMainFlag = !hasMain && n.data.useMainImage !== undefined;
      if (fixed !== n.data.status || staleMainFlag) {
        const data = { ...n.data, status: fixed };
        if (staleMainFlag) delete (data as { useMainImage?: boolean }).useMainImage;
        return { ...n, data } as CanvasNode;
      }
    }
    if (n.kind === "generateVideo") {
      const status = n.data.status ?? (n.data.src ? "ready" : "empty");
      const fixed = status === "generating" ? "empty" : status;
      if (fixed !== n.data.status) {
        return { ...n, data: { ...n.data, status: fixed } } as CanvasNode;
      }
    }
    if (n.kind === "nodeGroup" && n.data.executing) {
      return { ...n, data: { ...n.data, executing: false } };
    }
    if (n.kind === "script" && n.data.script) {
      const s = n.data.script;
      let changed = false;
      let script = s;

      // Script-level generating → failed
      if (s.status === "generating") {
        script = { ...script, status: "failed" as const, progress: 0, error: "中断：页面已刷新" };
        changed = true;
      }

      // Shot finalPromptStatus composing → pending
      const hasComposing = s.shots.some((sh) => sh.finalPromptStatus === "composing");
      if (hasComposing) {
        script = {
          ...script,
          shots: script.shots.map((sh) =>
            sh.finalPromptStatus === "composing"
              ? { ...sh, finalPromptStatus: "pending" as const }
              : sh,
          ),
        };
        changed = true;
      }

      // Asset generating → failed
      if (s.assets?.some((a) => a.generationStatus?.state === "generating")) {
        script = {
          ...script,
          assets: script.assets?.map((a) =>
            a.generationStatus?.state === "generating"
              ? { ...a, generationStatus: { state: "failed" as const, error: "中断：页面已刷新" } }
              : a,
          ),
        };
        changed = true;
      }

      if (changed) return { ...n, data: { ...n.data, script } };
    }
    if (n.kind === "composition") {
      const hasGenerating = n.data.tracks.some((t) =>
        t.clips.some((c) => c.status === "generating"),
      );
      if (hasGenerating) {
        return {
          ...n,
          data: {
            ...n.data,
            tracks: n.data.tracks.map((t) => ({
              ...t,
              clips: t.clips.map((c) =>
                c.status === "generating" ? { ...c, status: "failed" as const } : c,
              ),
            })),
          },
        };
      }
    }
    return n;
  });
  return resnapStoryboards(migrateStoryboards(fixed));
}

// ── Re-snap storyboard members to their slots on load ───────────────────────
// Members are grid-locked, so their canvas position is always derived from the
// container geometry. Persisted saves may carry stale positions (e.g. from an
// older layout constant) — re-derive them so members align exactly with the
// container's grid cells and never overlap.
function resnapStoryboards(nodes: CanvasNode[]): CanvasNode[] {
  const liveIds = new Set(nodes.map((n) => n.id));
  // Drop dangling member references (members deleted while still referenced by
  // an older build) so the "n 个节点" count reflects真实的 live members. Returns
  // the (possibly trimmed) memberIds for a storyboard.
  const cleanMembers = (ids: string[]) => ids.filter((mid) => liveIds.has(mid));

  const pos = new Map<string, { x: number; y: number }>();
  const cleanedById = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.kind !== "storyboard") continue;
    const sb = n.data.storyboard;
    const cleaned = cleanMembers(sb.memberIds);
    cleanedById.set(n.id, cleaned);
    cleaned.forEach((mid, i) => {
      pos.set(mid, storyboardMemberPos(n.x, n.y, i, sb.cols, sb.ratio));
    });
  }
  if (cleanedById.size === 0) return nodes;
  return nodes.map((n) => {
    if (n.kind === "storyboard") {
      const cleaned = cleanedById.get(n.id);
      const sb = n.data.storyboard;
      if (cleaned && cleaned.length !== sb.memberIds.length) {
        const keep = new Set(cleaned);
        return {
          ...n,
          data: {
            ...n.data,
            storyboard: {
              ...sb,
              memberIds: cleaned,
              members: sb.members?.filter((m) => keep.has(m.id)),
            },
          },
        } as CanvasNode;
      }
      return n;
    }
    const p = pos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });
}

// ── Migrate legacy virtual-cell storyboards → real-node containers ───────────
// Old saves stored grid contents in `storyboard.cells[]` and DELETED the source
// nodes. The new model keeps members as real nodes referenced by `memberIds`.
// For each legacy storyboard: reuse the source node if it still exists (and snap
// it into its slot), otherwise rebuild a real image node from the cell's src.
// Idempotent: storyboards already on `memberIds` are skipped.
function migrateStoryboards(nodes: CanvasNode[]): CanvasNode[] {
  const needsMigration = nodes.some(
    (n) =>
      n.kind === "storyboard" &&
      n.data.storyboard.cells != null &&
      (n.data.storyboard.memberIds?.length ?? 0) === 0,
  );
  if (!needsMigration) return nodes;

  const existingById = new Map(nodes.map((n) => [n.id, n]));
  const newNodes: CanvasNode[] = [];
  const repositioned = new Map<string, { x: number; y: number }>();
  let seq = 0;

  const migrated = nodes.map((n) => {
    if (n.kind !== "storyboard") return n;
    const sb = n.data.storyboard;
    if (sb.cells == null || (sb.memberIds?.length ?? 0) > 0) return n;

    const filled = sb.cells.filter((c) => c.src);
    const memberIds: string[] = [];
    const members: { id: string; kind: NodeKind; name?: string }[] = [];

    filled.forEach((c, i) => {
      const pos = storyboardMemberPos(n.x, n.y, i, sb.cols, sb.ratio);
      let memberId: string;
      let kind: NodeKind = "image";
      const existing = c.sourceNodeId ? existingById.get(c.sourceNodeId) : undefined;
      if (existing) {
        memberId = existing.id;
        kind = existing.kind;
        repositioned.set(memberId, pos);
      } else {
        memberId = `sb-mig-${n.id}-${i}-${seq++}`;
        newNodes.push({
          id: memberId,
          kind: "image",
          x: pos.x,
          y: pos.y,
          data: { name: c.name ?? `图片 ${i + 1}`, src: c.src },
        });
      }
      memberIds.push(memberId);
      members.push({ id: memberId, kind, name: c.name });
    });

    const next = { ...sb, memberIds, members };
    delete (next as { cells?: unknown }).cells;
    return { ...n, data: { ...n.data, storyboard: next } } as CanvasNode;
  });

  const withRepos = migrated.map((n) => {
    const pos = repositioned.get(n.id);
    return pos ? { ...n, x: pos.x, y: pos.y } : n;
  });

  return sortNodesContainerFirst([...withRepos, ...newNodes]);
}

// ── Reconcile editor/selection refs after undo/redo ─────────────────────────
// A history snapshot only restores {nodes, edges}. If the restored canvas no
// longer contains the node an open editor / selection points at, those ids
// dangle (e.g. editorCompId referencing a composition that was just undone away,
// which would crash the editor). Null out any ref whose target is gone.

function reconcileEditorRefs(restoredNodes: CanvasNode[], s: StoreState): Partial<StoreState> {
  const ids = new Set(restoredNodes.map((n) => n.id));
  const patch: Partial<StoreState> = {};
  if (s.selectedId && !ids.has(s.selectedId)) patch.selectedId = null;
  if (s.editorCompId && !ids.has(s.editorCompId)) {
    patch.editorCompId = null;
    patch.selectedClipId = null;
  }
  if (s.editorScriptId && !ids.has(s.editorScriptId)) patch.editorScriptId = null;
  if (s.batchVideoSbId && !ids.has(s.batchVideoSbId)) patch.batchVideoSbId = null;
  return patch;
}

// ── Store ─────────────────────────────────────────────────────────────────────

// ── Auto-save (debounced) ──────────────────────────────────────────────────

const DEFAULT_PROJECT_ID = "proj-1";
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    useCanvas.getState().saveToServer();
  }, 2000);
}

function cancelScheduledSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

export const useCanvas = create<StoreState>((set, get) => ({
  projectId: DEFAULT_PROJECT_ID,
  projectName: "古风短片 · Demo",
  nodes: initialNodes,
  edges: initialEdges,
  selectedId: null,
  panelOpen: false,
  exportOpen: false,
  contextMenu: null,
  addPanel: { open: false },
  past: [],
  future: [],

  editorCompId: null,
  editorMode: "full",
  selectedClipId: null,
  editorScriptId: null,
  batchVideoSbId: null,
  saveStatus: "idle" as SaveStatus,
  clipboard: null,

  setProjectName: (n) => set({ projectName: n }),

  loadFromServer: async (id: string) => {
    try {
      const project = await loadProject(id);
      set({
        projectId: project.id,
        projectName: project.name,
        nodes: sanitizeNodes((project.canvas.nodes ?? []) as CanvasNode[]),
        edges: (project.canvas.edges ?? []) as Edge[],
        past: [],
        future: [],
        saveStatus: "saved",
      });
      // Self-heal: reconcile each script's asset group so generated assets are
      // mounted as real image nodes — including older projects saved before this
      // logic existed, or ones left empty by the previous one-shot latch bug.
      for (const n of get().nodes) {
        if (n.kind === "script") {
          get().materializeAssetGroups(n.id);
          // Re-space downstream groups generated with the old cramped layout.
          get().relayoutShotGroups(n.id);
          // Back-fill per-shot reference edges (asset image → storyboard/video
          // shot) for groups generated before this wiring existed.
          get().reconcileShotReferenceEdges(n.id);
        }
      }
      // The subscription below schedules a save on every nodes/edges change,
      // including this one. Cancel it so a fresh load doesn't immediately
      // round-trip back to the server.
      cancelScheduledSave();
    } catch {
      // Failed to load — keep current mock data
      console.warn(`Failed to load project ${id}, using mock data`);
      set({ projectId: id, saveStatus: "idle" });
    }
  },

  saveToServer: async () => {
    const { projectId, projectName, nodes, edges } = get();
    set({ saveStatus: "saving" });
    try {
      await saveProject(projectId, projectName, { nodes, edges });
      set({ saveStatus: "saved" });
    } catch {
      console.error("Failed to save project");
      set({ saveStatus: "error" });
    }
  },

  pushHistory: () => {
    const { nodes, edges, past } = get();
    set({
      past: [...past.slice(-49), { nodes: structuredClone(nodes), edges: structuredClone(edges) }],
      future: [],
    });
  },

  undo: () => {
    const s = get();
    if (!s.past.length) return;
    const prev = s.past[s.past.length - 1];
    set({
      past: s.past.slice(0, -1),
      future: [{ nodes: s.nodes, edges: s.edges }, ...s.future].slice(0, 50),
      nodes: prev.nodes,
      edges: prev.edges,
      ...reconcileEditorRefs(prev.nodes, s),
    });
  },

  redo: () => {
    const s = get();
    if (!s.future.length) return;
    const next = s.future[0];
    set({
      future: s.future.slice(1),
      past: [...s.past, { nodes: s.nodes, edges: s.edges }].slice(-50),
      nodes: next.nodes,
      edges: next.edges,
      ...reconcileEditorRefs(next.nodes, s),
    });
  },

  setNodes: (nodes) => set({ nodes }),

  batchUpdatePositions: (updates) => {
    set((s) => {
      // When a group is dragged, propagate the same delta to its member nodes
      // (which are real, absolutely-positioned canvas nodes) so a frame/group
      // moves together with its contents. Members already in this batch (e.g.
      // dragged together via multi-select) are left untouched to avoid
      // double-applying the offset. Card-style groups with virtual members
      // simply match no real node, so this is a no-op for them.
      const memberDeltas: Record<string, { dx: number; dy: number }> = {};
      for (const n of s.nodes) {
        const memberIds =
          n.kind === "nodeGroup"
            ? n.data.memberIds
            : n.kind === "storyboard"
              ? n.data.storyboard.memberIds
              : null;
        if (!memberIds) continue;
        const pos = updates[n.id];
        if (!pos) continue;
        const dx = pos.x - n.x;
        const dy = pos.y - n.y;
        if (dx === 0 && dy === 0) continue;
        for (const mid of memberIds) {
          if (updates[mid]) continue;
          memberDeltas[mid] = { dx, dy };
        }
      }

      return {
        nodes: s.nodes.map((n) => {
          const pos = updates[n.id];
          if (pos) return { ...n, x: pos.x, y: pos.y };
          const d = memberDeltas[n.id];
          if (d) return { ...n, x: n.x + d.dx, y: n.y + d.dy };
          return n;
        }),
      };
    });
  },

  updateNode: (id, patch) =>
    set((s) => {
      const prevNode = s.nodes.find((n) => n.id === id);
      const updated: CanvasNode[] = s.nodes.map((n) =>
        n.id === id
          ? typeof patch === "function"
            ? patch(n)
            : { ...n, ...patch, data: { ...n.data, ...(patch as Partial<CanvasNode>).data } }
          : n,
      ) as CanvasNode[];
      const changedNode = updated.find((n) => n.id === id);
      const changedSrc = changedNode ? getNodeSrc(changedNode) : undefined;
      const prevSrc = prevNode ? getNodeSrc(prevNode) : undefined;
      // Sync binding thumbnails when src changes
      if (changedSrc && changedSrc !== prevSrc) {
        return {
          nodes: updated.map((n) => {
            const tracks = getNodeTracks(n);
            if (!tracks) return n;
            const hasBound = tracks.some((t) => t.clips.some((c) => c.bindings.includes(id)));
            if (!hasBound) return n;
            return {
              ...n,
              data: {
                ...n.data,
                tracks: tracks.map((t) => ({
                  ...t,
                  clips: t.clips.map((c) =>
                    c.bindings.includes(id) ? { ...c, thumbnail: changedSrc } : c,
                  ),
                })),
              },
            } as CanvasNode;
          }),
        };
      }
      return { nodes: updated };
    }),

  addNode: (kind) => {
    const x = 600 + Math.random() * 80;
    const y = 200 + Math.random() * 80;
    return get().addNodeAtPosition(kind, x, y);
  },

  addNodeAtPosition: (kind, x, y) => {
    get().pushHistory();
    const id = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
    const existing = get().nodes;
    let name: string | undefined;
    if (kind === "composition") {
      name = `视频合成 ${existing.filter((n) => n.kind === "composition").length + 1}`;
    } else if (kind === "image" || kind === "generateImage") {
      const count = existing.filter((n) => n.kind === "image" || n.kind === "generateImage").length;
      name = `图片${count + 1}`;
    } else if (kind === "generateVideo") {
      const count = existing.filter((n) => n.kind === "generateVideo").length;
      name = `视频${count + 1}`;
    } else if (kind === "director") {
      name = `导演台 ${existing.filter((n) => n.kind === "director").length + 1}`;
    }
    const node = createNodeByKind(kind, id, x, y, name);
    set((s) => ({ nodes: [...s.nodes, node] }));
    return id;
  },

  removeNode: (id) => get().removeNodes([id]),

  removeNodes: (ids) => {
    if (ids.length === 0) return;
    const drop = new Set(ids);
    get().pushHistory();
    set((s) => ({
      // Drop the nodes, then prune them from any container that referenced them
      // so member counts (e.g. 分镜组 "n 个节点") stay真实 and never go stale.
      nodes: s.nodes
        .filter((n) => !drop.has(n.id))
        .map((n) => {
          if (n.kind === "storyboard" && n.data.storyboard.memberIds.some((mid) => drop.has(mid))) {
            const sb = n.data.storyboard;
            return {
              ...n,
              data: {
                ...n.data,
                storyboard: {
                  ...sb,
                  memberIds: sb.memberIds.filter((mid) => !drop.has(mid)),
                  members: sb.members?.filter((m) => !drop.has(m.id)),
                },
              },
            } as CanvasNode;
          }
          if (n.kind === "nodeGroup" && n.data.memberIds?.some((mid) => drop.has(mid))) {
            return {
              ...n,
              data: {
                ...n.data,
                memberIds: n.data.memberIds.filter((mid) => !drop.has(mid)),
                members: (n.data.members ?? []).filter((m) => !drop.has(m.id)),
              },
            } as CanvasNode;
          }
          // Composition tracks hold clips bound to source nodes via `bindings`.
          // When a bound node is deleted, drop the now-orphaned clip so the
          // timeline never references a node that no longer exists.
          if (
            n.kind === "composition" &&
            n.data.tracks.some((t) =>
              t.clips.some((c) => c.bindings.length > 0 && c.bindings.every((b) => drop.has(b))),
            )
          ) {
            return {
              ...n,
              data: {
                ...n.data,
                tracks: n.data.tracks.map((t) => ({
                  ...t,
                  clips: t.clips.filter(
                    (c) => c.bindings.length === 0 || !c.bindings.every((b) => drop.has(b)),
                  ),
                })),
              },
            } as CanvasNode;
          }
          return n;
        }),
      edges: s.edges.filter((e) => !drop.has(e.from) && !drop.has(e.to)),
      selectedId: s.selectedId && drop.has(s.selectedId) ? null : s.selectedId,
    }));
  },

  duplicateNodes: (ids) => {
    const { nodes } = get();
    const picked = nodes.filter((n) => ids.includes(n.id));
    if (picked.length === 0) return [];
    get().pushHistory();
    const ts = Date.now();
    const idMap = new Map<string, string>();
    picked.forEach((n, i) => idMap.set(n.id, `${n.id}-copy-${ts}-${i}`));
    const clones = picked.map(
      (n) =>
        ({
          ...structuredClone(n),
          id: idMap.get(n.id)!,
          x: n.x + 40,
          y: n.y + 40,
        }) as CanvasNode,
    );
    // Carry over edges that are fully internal to the duplicated selection.
    const newEdges: Edge[] = get()
      .edges.filter((e) => idMap.has(e.from) && idMap.has(e.to))
      .map((e, i) => ({
        ...e,
        id: `e-copy-${ts}-${i}`,
        from: idMap.get(e.from)!,
        to: idMap.get(e.to)!,
      }));
    const newIds = clones.map((n) => n.id);
    set((s) => ({
      nodes: [...s.nodes, ...clones],
      edges: [...s.edges, ...newEdges],
      selectedId: newIds[0] ?? s.selectedId,
    }));
    return newIds;
  },

  copyNodes: (ids) => {
    const { nodes } = get();
    const picked = nodes.filter((n) => ids.includes(n.id));
    if (picked.length === 0) return;
    set({ clipboard: picked.map((n) => structuredClone(n)) });
  },

  pasteNodes: () => {
    const { clipboard } = get();
    if (!clipboard || clipboard.length === 0) return [];
    get().pushHistory();
    const ts = Date.now();
    const idMap = new Map<string, string>();
    clipboard.forEach((n, i) => idMap.set(n.id, `${n.id}-paste-${ts}-${i}`));
    const clones = clipboard.map(
      (n) =>
        ({
          ...structuredClone(n),
          id: idMap.get(n.id)!,
          x: n.x + 40,
          y: n.y + 40,
        }) as CanvasNode,
    );
    const newIds = clones.map((n) => n.id);
    set((s) => ({ nodes: [...s.nodes, ...clones], selectedId: newIds[0] ?? s.selectedId }));
    return newIds;
  },

  addEdge: (from, to, sourceHandle?, toHandle?) => {
    const exists = get().edges.some((e) => e.from === from && e.to === to);
    if (exists) return;
    get().pushHistory();
    const edge: Edge = { id: `e-${Date.now()}`, from, to };
    if (sourceHandle) edge.sourceHandle = sourceHandle;
    if (toHandle) edge.toHandle = toHandle;
    set((s) => ({ edges: [...s.edges, edge] }));
    const { nodes } = get();
    const fromNode = nodes.find((n) => n.id === from);
    const toNode = nodes.find((n) => n.id === to);
    if (fromNode?.kind === "audio" && toNode?.kind === "composition") {
      get().addAudioClipFromNode(to, from);
    }
  },

  removeEdge: (id) => {
    get().pushHistory();
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
  },

  select: (id) =>
    set((s) => {
      const node = id ? s.nodes.find((n) => n.id === id) : null;
      const usesToolbarPanel =
        node?.kind === "generateVideo" || node?.kind === "generateImage" || node?.kind === "image";
      const showPanel = !!id && !!node && !usesToolbarPanel;
      return { selectedId: id, panelOpen: showPanel };
    }),

  togglePanel: (open) => set((s) => ({ panelOpen: open ?? !s.panelOpen })),
  setExport: (v) => set({ exportOpen: v }),
  setContextMenu: (m) => set({ contextMenu: m }),
  setAddPanel: (panel) => set({ addPanel: panel }),

  totalDuration: () => {
    const { nodes } = get();
    return nodes
      .filter((n): n is CanvasNode & { kind: "composition" } => n.kind === "composition")
      .reduce((max, n) => Math.max(max, compDuration(n.data.tracks)), 0);
  },

  shotCount: () =>
    get()
      .nodes.filter((n): n is CanvasNode & { kind: "composition" } => n.kind === "composition")
      .reduce((a, n) => a + n.data.tracks.reduce((sum, t) => sum + t.clips.length, 0), 0),

  compositionCount: () => get().nodes.filter((n) => n.kind === "composition").length,

  ...createCompositionSlice(set, get),
  ...createStoryboardSlice(set, get),
  ...createGroupSlice(set, get),
  ...createScriptSlice(set, get),
}));

// Persist any nodes/edges mutation. Catches every slice path (updateNode,
// asset generation, composition edits, etc.) uniformly — without this each
// mutation site would need its own scheduleSave() call, and the existing
// ones were inconsistent (image generation completion was silently dropped).
useCanvas.subscribe((curr, prev) => {
  if (curr.nodes !== prev.nodes || curr.edges !== prev.edges) {
    scheduleSave();
  }
});
