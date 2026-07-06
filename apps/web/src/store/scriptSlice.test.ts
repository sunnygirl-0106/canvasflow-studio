import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanvas } from "@/store/canvasStore";
import type { CanvasNode, ScriptAsset, ScriptData } from "@canvasflow/shared";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function asset(id: string, opts: Partial<ScriptAsset> = {}): ScriptAsset {
  return { id, name: id, type: "character", ...opts };
}

function scriptData(assets: ScriptAsset[], extra: Partial<ScriptData> = {}): ScriptData {
  return {
    title: "Demo",
    promptText: "",
    model: "m",
    status: "ready",
    view: "table",
    shots: [],
    hiddenColumns: [],
    filter: {},
    assets,
    ...extra,
  };
}

function scriptNode(id: string, script: ScriptData): CanvasNode {
  return { id, kind: "script", x: 500, y: 0, data: { name: id, script } };
}

function setScript(id: string, script: ScriptData) {
  useCanvas.setState({ nodes: [scriptNode(id, script)], edges: [], past: [], future: [] });
}

const SID = "script-1";
const assetNodeId = (assetId: string) => `assetimg-${SID}-${assetId}`;
const groupId = `asset-group-${SID}`;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("materializeAssetGroups", () => {
  it("materializes a real image node + a frame group + one edge per generated asset", () => {
    setScript(
      SID,
      scriptData([
        asset("c1", { image: "http://img/c1.png", description: "少女" }),
        asset("c2", { image: "http://img/c2.png" }),
      ]),
    );

    useCanvas.getState().materializeAssetGroups(SID);
    const s = useCanvas.getState();

    const n1 = s.nodes.find((n) => n.id === assetNodeId("c1"));
    const n2 = s.nodes.find((n) => n.id === assetNodeId("c2"));
    expect(n1?.kind).toBe("image");
    expect(n2?.kind).toBe("image");
    // src + back-links to the source asset, prompt carried from description.
    expect(n1?.kind === "image" && n1.data.src).toBe("http://img/c1.png");
    expect(n1?.kind === "image" && n1.data.assetScriptId).toBe(SID);
    expect(n1?.kind === "image" && n1.data.assetId).toBe("c1");
    expect(n1?.kind === "image" && n1.data.prompt).toBe("少女");

    // Dashed-frame container present.
    expect(s.nodes.find((n) => n.id === groupId)?.kind).toBe("nodeGroup");
    // One edge per asset image → the script node.
    const assetEdges = s.edges.filter((e) => e.to === SID);
    expect(assetEdges).toHaveLength(2);
    expect(assetEdges.every((e) => e.toHandle === "in")).toBe(true);
  });

  it("skips assets that have no generated image", () => {
    setScript(
      SID,
      scriptData([asset("c1", { image: "http://img/c1.png" }), asset("c2") /* no image */]),
    );

    useCanvas.getState().materializeAssetGroups(SID);
    const s = useCanvas.getState();
    expect(s.nodes.find((n) => n.id === assetNodeId("c1"))).toBeDefined();
    expect(s.nodes.find((n) => n.id === assetNodeId("c2"))).toBeUndefined();
  });

  it("is idempotent — re-running converges to the same node/edge set", () => {
    setScript(SID, scriptData([asset("c1", { image: "http://img/c1.png" })]));

    useCanvas.getState().materializeAssetGroups(SID);
    const first = useCanvas.getState();
    const nodeCount = first.nodes.length;
    const edgeCount = first.edges.length;

    useCanvas.getState().materializeAssetGroups(SID);
    const second = useCanvas.getState();
    expect(second.nodes.length).toBe(nodeCount);
    expect(second.edges.length).toBe(edgeCount);
  });

  it("prunes the image node + edge when its asset is removed and re-run", () => {
    setScript(
      SID,
      scriptData([
        asset("c1", { image: "http://img/c1.png" }),
        asset("c2", { image: "http://img/c2.png" }),
      ]),
    );
    useCanvas.getState().materializeAssetGroups(SID);

    // Simulate removing c2 from the script, then reconcile again.
    const nextScript = scriptData([asset("c1", { image: "http://img/c1.png" })]);
    useCanvas.setState({
      nodes: useCanvas.getState().nodes.map((n) => (n.id === SID ? scriptNode(SID, nextScript) : n)),
    });
    useCanvas.getState().materializeAssetGroups(SID);

    const s = useCanvas.getState();
    expect(s.nodes.find((n) => n.id === assetNodeId("c2"))).toBeUndefined();
    expect(s.nodes.find((n) => n.id === assetNodeId("c1"))).toBeDefined();
    expect(s.edges.filter((e) => e.to === SID)).toHaveLength(1);
  });

  it("respects a deliberate ungroup (assetGroupDetached) — rebuilds nothing", () => {
    setScript(
      SID,
      scriptData([asset("c1", { image: "http://img/c1.png" })], { assetGroupDetached: true }),
    );

    useCanvas.getState().materializeAssetGroups(SID);
    const s = useCanvas.getState();
    // Only the original script node remains; no group, no asset node, no edges.
    expect(s.nodes.find((n) => n.id === groupId)).toBeUndefined();
    expect(s.nodes.find((n) => n.id === assetNodeId("c1"))).toBeUndefined();
    expect(s.edges).toHaveLength(0);
  });
});
