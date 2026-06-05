import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
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
import { CompositionNode } from "@/components/nodes/CompositionNode";
import { LeftRail } from "@/components/LeftRail";
import { MultiSelectionCTA } from "@/components/MultiSelectionCTA";
import { CompositionCoachToast } from "@/components/CompositionCoachToast";
import { ContextMenu } from "@/components/ContextMenu";
import { CompositionEditor } from "@/components/composition/CompositionEditor";

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
        <CompositionCoachToast />
        <ContextMenu />
      </div>
      <CompositionEditor />
      <ExportDialog />
    </div>
  );
}

const nodeTypes = {
  image: ({ id, data }: any) => <ImageNode data={data} />,
  generateImage: ({ id, data }: any) => <GenerateImageNode id={id} data={data} />,
  generateVideo: ({ id, data }: any) => <GenerateVideoNode id={id} data={data} />,
  composition: ({ id, data }: any) => <CompositionNode id={id} data={data} />,
};

function Canvas() {
  const nodes = useCanvas((s) => s.nodes);
  const edges = useCanvas((s) => s.edges);
  const updateNode = useCanvas((s) => s.updateNode);
  const select = useCanvas((s) => s.select);
  const addEdgeFn = useCanvas((s) => s.addEdge);
  const addToComposition = useCanvas((s) => s.addToComposition);
  const removeEdgeFn = useCanvas((s) => s.removeEdge);
  const undo = useCanvas((s) => s.undo);
  const redo = useCanvas((s) => s.redo);
  const setContextMenu = useCanvas((s) => s.setContextMenu);

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
        sourceHandle: e.sourceHandle ?? "out",
        target: findHostNodeId(nodes, e.to),
        targetHandle: e.toHandle ?? (isShotId(nodes, e.to) ? e.to : undefined),
        type: "default",
        animated: true,
        style: { stroke: e.color ?? "#56C7CF", strokeWidth: 2 },
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
    // Any connection to a composition node → add as shot
    const targetNode = nodes.find((n) => n.id === c.target);
    if (targetNode?.kind === "composition") {
      addToComposition(c.source);
      return;
    }
    const target = c.targetHandle ?? c.target;
    addEdgeFn(c.source, target);
  };

  // Track which node started the connection drag
  const connectingSourceRef = useRef<string | null>(null);

  const onConnectStart = useCallback((_: any, params: { nodeId: string | null }) => {
    connectingSourceRef.current = params.nodeId;
  }, []);

  // When connection drag ends without hitting a handle,
  // check if mouse is over a composition node and auto-connect
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const sourceId = connectingSourceRef.current;
      connectingSourceRef.current = null;
      if (!sourceId) return;

      // Get the mouse/touch position
      const clientX = "changedTouches" in event ? event.changedTouches[0].clientX : event.clientX;
      const clientY = "changedTouches" in event ? event.changedTouches[0].clientY : event.clientY;

      // Find the element under the cursor
      const elementsUnder = document.elementsFromPoint(clientX, clientY);
      // Walk up from each element to find a ReactFlow node wrapper with data-id
      for (const el of elementsUnder) {
        const nodeEl = (el as HTMLElement).closest?.(".react-flow__node");
        if (!nodeEl) continue;
        const targetId = nodeEl.getAttribute("data-id");
        if (!targetId) continue;
        const targetNode = useCanvas.getState().nodes.find((n) => n.id === targetId);
        if (targetNode?.kind === "composition" && targetId !== sourceId) {
          addToComposition(sourceId);
          return;
        }
      }
    },
    [addToComposition],
  );

  return (
    <div className="absolute inset-0 canvas-bg">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onPaneClick={() => {
          select(null);
          setContextMenu(null);
        }}
        onPaneContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({
            x: "clientX" in e ? e.clientX : 0,
            y: "clientY" in e ? e.clientY : 0,
            targetNodeId: null,
          });
        }}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          select(node.id);
          setContextMenu({ x: e.clientX, y: e.clientY, targetNodeId: node.id });
        }}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 0.9 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        panOnScroll={false}
        panOnDrag={[1, 2]}
        selectionOnDrag
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(15,23,42,0.10)" />
        <MultiSelectionCTA />
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

