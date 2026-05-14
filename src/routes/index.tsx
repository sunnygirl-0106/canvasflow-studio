import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  type Node as RFNode,
  type Edge as RFEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCanvas } from "@/store/canvasStore";
import { Toolbar } from "@/components/Toolbar";
import { BottomDock } from "@/components/BottomDock";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { ExportDialog } from "@/components/dialogs/ExportDialog";
import { ImageNode } from "@/components/nodes/ImageNode";
import { GenerateImageNode } from "@/components/nodes/GenerateImageNode";
import { GenerateVideoNode } from "@/components/nodes/GenerateVideoNode";
import { TimelineNode } from "@/components/nodes/TimelineNode";
import { LeftRail } from "@/components/LeftRail";
import { Wand2 } from "lucide-react";

export const Route = createFileRoute("/")({ component: IndexPage });

function IndexPage() {
  return (
    <ReactFlowProvider>
      <Workspace />
    </ReactFlowProvider>
  );
}

function Workspace() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <Toolbar />
      <div className="flex-1 relative">
        <Canvas />
        <LeftRail />
        <BottomDock />
        <PropertiesPanel />
        <DemoButton />
      </div>
      <ExportDialog />
    </div>
  );
}

const nodeTypes = {
  image: ({ id, data }: any) => <ImageNode data={data} />,
  generateImage: ({ id, data }: any) => <GenerateImageNode id={id} data={data} />,
  generateVideo: ({ id, data }: any) => <GenerateVideoNode id={id} data={data} />,
  timeline: ({ id, data }: any) => <TimelineNode id={id} data={data} />,
};

function Canvas() {
  const nodes = useCanvas((s) => s.nodes);
  const edges = useCanvas((s) => s.edges);
  const updateNode = useCanvas((s) => s.updateNode);
  const select = useCanvas((s) => s.select);
  const addEdgeFn = useCanvas((s) => s.addEdge);
  const removeEdgeFn = useCanvas((s) => s.removeEdge);
  const undo = useCanvas((s) => s.undo);
  const redo = useCanvas((s) => s.redo);

  const rfNodes = useMemo<RFNode[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: n.kind,
        position: { x: n.x, y: n.y },
        data: n.data,
        draggable: true,
        selectable: true,
      })),
    [nodes],
  );

  const rfEdges = useMemo<RFEdge[]>(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.from,
        target: findHostNodeId(nodes, e.to),
        targetHandle: isShotId(nodes, e.to) ? e.to : undefined,
        type: "default",
        animated: true,
        style: { stroke: "#5cdcfa", strokeWidth: 2 },
      })),
    [edges, nodes],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const onNodesChange = (changes: NodeChange[]) => {
    for (const c of changes) {
      if (c.type === "position" && c.position) {
        updateNode(c.id, { x: c.position.x, y: c.position.y });
      }
      if (c.type === "select" && c.selected) select(c.id);
    }
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    for (const c of changes) {
      if (c.type === "remove") removeEdgeFn(c.id);
    }
  };

  const onConnect = (c: Connection) => {
    if (!c.source || !c.target) return;
    const target = c.targetHandle ?? c.target;
    addEdgeFn(c.source, target);
  };

  return (
    <div className="absolute inset-0 canvas-bg">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={() => select(null)}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 0.9 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        panOnScroll={false}
        panOnDrag={[1, 2]}
        selectionOnDrag
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.06)" />
        <Controls className="!bg-card !border-border" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function isShotId(nodes: any[], id: string) {
  return nodes.some((n) => n.data.shots?.some((s: any) => s.id === id));
}
function findHostNodeId(nodes: any[], id: string): string {
  for (const n of nodes) if (n.data.shots?.some((s: any) => s.id === id)) return n.id;
  return id;
}

function DemoButton() {
  const nodes = useCanvas.getState().nodes;
  const setExport = useCanvas((s) => s.setExport);
  const updateShot = useCanvas((s) => s.updateShot);
  const bind = useCanvas((s) => s.bindNodeToShot);

  const run = async () => {
    const tl = useCanvas.getState().nodes.find((n) => n.kind === "timeline");
    if (!tl) return;
    const shots = tl.data.shots ?? [];
    // 1. bind shot 04 (index 3) to img-2
    const target = shots[3];
    if (target) {
      bind("img-2", target.id);
    }
    await wait(900);
    // 2. shrink shot 02 from 5.6 -> 3
    const s2 = shots[1];
    if (s2) {
      for (let d = s2.duration; d >= 3; d -= 0.2) {
        updateShot(tl.id, s2.id, { duration: Math.round(d * 10) / 10 });
        await wait(40);
      }
    }
    await wait(500);
    // 3. trigger play (visual via custom event)
    window.dispatchEvent(new CustomEvent("wb:play", { detail: { tlId: tl.id } }));
    await wait(2500);
    // 4. open export
    setExport("fcpxml");
  };

  return (
    <button
      onClick={run}
      className="absolute top-3 right-4 z-30 flex items-center gap-1.5 text-xs bg-accent text-accent-foreground px-3 py-2 rounded-full font-medium hover:opacity-90 node-shadow"
    >
      <Wand2 className="w-3.5 h-3.5" /> 演示流程
    </button>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
