import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanvas } from "@/store/canvasStore";
import type { CanvasNode, Clip, Edge, NodeKind } from "@canvasflow/shared";

// ── Minimal node fixtures ────────────────────────────────────────────────────

function imageNode(id: string): CanvasNode {
  return { id, kind: "image", x: 0, y: 0, data: { name: id } };
}

function memberRefs(ids: string[]) {
  return ids.map((id) => ({ id, kind: "image" as NodeKind, name: id }));
}

function storyboardNode(id: string, memberIds: string[]): CanvasNode {
  return {
    id,
    kind: "storyboard",
    x: 0,
    y: 0,
    data: {
      name: id,
      storyboard: {
        rows: 1,
        cols: 3,
        ratio: "16:9",
        showIndex: true,
        memberIds,
        members: memberRefs(memberIds),
      },
    },
  };
}

function groupNode(id: string, memberIds: string[]): CanvasNode {
  return {
    id,
    kind: "nodeGroup",
    x: 0,
    y: 0,
    data: {
      name: id,
      memberIds,
      members: memberRefs(memberIds),
      groupColor: "#000",
      groupLayout: "grid",
    },
  };
}

function clip(id: string, bindings: string[]): Clip {
  return {
    id,
    name: id,
    index: 0,
    startSec: 0,
    duration: 1,
    baseDuration: 1,
    speed: 1,
    sourceIn: 0,
    sourceOut: 1,
    bindings,
    color: "cyan",
    status: "ready",
    clipKind: "video",
  };
}

function compositionNode(id: string, clips: Clip[]): CanvasNode {
  return {
    id,
    kind: "composition",
    x: 0,
    y: 0,
    data: {
      name: id,
      width: 800,
      pxPerSecond: 60,
      tracks: [{ id: `${id}-v1`, kind: "video", name: "V1", clips }],
    },
  };
}

function reset(nodes: CanvasNode[], edges: Edge[] = [], selectedId: string | null = null) {
  useCanvas.setState({ nodes, edges, selectedId, past: [], future: [] });
}

const ids = (ns: { id: string }[]) => ns.map((n) => n.id);

// Fake timers keep the store's 2s debounced auto-save (a setTimeout in the
// subscribe listener) from ever firing during tests.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("removeNodes — cascade cleanup", () => {
  it("drops the node, prunes storyboard members, touching edges, and selection", () => {
    reset(
      [imageNode("a"), imageNode("b"), storyboardNode("sb", ["a", "b"])],
      [
        { id: "e1", from: "a", to: "sb" },
        { id: "e2", from: "b", to: "other" },
      ],
      "a",
    );

    useCanvas.getState().removeNodes(["a"]);
    const s = useCanvas.getState();

    expect(s.nodes.find((n) => n.id === "a")).toBeUndefined();
    const sb = s.nodes.find((n) => n.id === "sb");
    expect(sb?.kind === "storyboard" && sb.data.storyboard.memberIds).toEqual(["b"]);
    expect(sb?.kind === "storyboard" && sb.data.storyboard.members).toEqual(memberRefs(["b"]));
    // e1 touches removed "a" → gone; e2 (b → other) survives.
    expect(ids(s.edges)).toEqual(["e2"]);
    // selectedId pointed at the removed node → cleared.
    expect(s.selectedId).toBeNull();
  });

  it("prunes nodeGroup memberIds + members", () => {
    reset([imageNode("a"), imageNode("b"), groupNode("g", ["a", "b"])]);
    useCanvas.getState().removeNodes(["b"]);
    const g = useCanvas.getState().nodes.find((n) => n.id === "g");
    expect(g?.kind === "nodeGroup" && g.data.memberIds).toEqual(["a"]);
    expect(g?.kind === "nodeGroup" && g.data.members).toEqual(memberRefs(["a"]));
  });

  it("removes a composition clip only when ALL its bindings are deleted", () => {
    reset([
      imageNode("a"),
      imageNode("b"),
      compositionNode("comp", [
        clip("orphan", ["a"]), // fully bound to the deleted node → dropped
        clip("survivor", ["a", "b"]), // still bound to surviving "b" → kept
        clip("unbound", []), // no bindings → always kept
      ]),
    ]);

    useCanvas.getState().removeNodes(["a"]);
    const comp = useCanvas.getState().nodes.find((n) => n.id === "comp");
    const clipIds =
      comp?.kind === "composition" ? comp.data.tracks[0].clips.map((c) => c.id) : [];
    expect(clipIds).toEqual(["survivor", "unbound"]);
  });

  it("is a no-op for an empty id list", () => {
    reset([imageNode("a")]);
    const before = useCanvas.getState().nodes;
    useCanvas.getState().removeNodes([]);
    expect(useCanvas.getState().nodes).toBe(before);
  });
});

describe("undo / redo / pushHistory", () => {
  it("restores the previous snapshot and re-applies it on redo", () => {
    reset([imageNode("a")]);
    useCanvas.getState().pushHistory();
    useCanvas.setState({ nodes: [imageNode("a"), imageNode("b")] });

    useCanvas.getState().undo();
    expect(ids(useCanvas.getState().nodes)).toEqual(["a"]);

    useCanvas.getState().redo();
    expect(ids(useCanvas.getState().nodes)).toEqual(["a", "b"]);
  });

  it("removeNodes is undoable (it snapshots before mutating)", () => {
    reset([imageNode("a"), imageNode("b")]);
    useCanvas.getState().removeNodes(["a"]);
    expect(ids(useCanvas.getState().nodes)).toEqual(["b"]);

    useCanvas.getState().undo();
    expect(ids(useCanvas.getState().nodes)).toEqual(["a", "b"]);
  });

  it("undo with empty history is a no-op", () => {
    reset([imageNode("a")]);
    const before = useCanvas.getState().nodes;
    useCanvas.getState().undo();
    expect(useCanvas.getState().nodes).toBe(before);
  });

  it("a fresh pushHistory clears the redo (future) stack", () => {
    reset([imageNode("a")]);
    useCanvas.getState().pushHistory();
    useCanvas.setState({ nodes: [imageNode("a"), imageNode("b")] });
    useCanvas.getState().undo(); // builds a future entry
    expect(useCanvas.getState().future.length).toBe(1);

    useCanvas.getState().pushHistory();
    expect(useCanvas.getState().future.length).toBe(0);
  });
});
