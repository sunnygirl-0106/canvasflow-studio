import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  type NodeProps,
  type Node as RFNode,
  type Edge as RFEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCanvas, type CanvasNode } from "@/store/canvasStore";
import { Toolbar } from "@/components/Toolbar";
import { BottomDock } from "@/components/BottomDock";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { ExportDialog } from "@/components/dialogs/ExportDialog";
import { ImageNode } from "@/components/nodes/ImageNode";
import { GenerateImageNode } from "@/components/nodes/GenerateImageNode";
import { GenerateVideoNode } from "@/components/nodes/GenerateVideoNode";
import { CompositionNode } from "@/components/nodes/CompositionNode";
import { AudioNode } from "@/components/nodes/AudioNode";
import { StoryboardGroupNode } from "@/components/nodes/StoryboardGroupNode";
import { GroupNode } from "@/components/nodes/GroupNode";
import { LeftRail } from "@/components/LeftRail";
import { MultiSelectionCTA } from "@/components/MultiSelectionCTA";
import { CompositionCoachToast } from "@/components/CompositionCoachToast";
import { ContextMenu } from "@/components/ContextMenu";
import { CompositionEditor } from "@/components/composition/CompositionEditor";
import { StoryboardToolbar } from "@/components/storyboard/StoryboardToolbar";
import { GroupToolbar } from "@/components/group/GroupToolbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
        <ErrorBoundary>
          <Canvas />
        </ErrorBoundary>
        <LeftRail />
        <BottomDock />
        <PropertiesPanel />
        <CompositionCoachToast />
        <ContextMenu />
      </div>
      <ErrorBoundary>
        <CompositionEditor />
      </ErrorBoundary>
      <ExportDialog />
    </div>
  );
}

// Node type components — defined at module level to avoid recreation on each render
const nodeTypes = {
  image: (props: NodeProps) => <ImageNode data={props.data as CanvasNode["data"]} />,
  generateImage: (props: NodeProps) => (
    <GenerateImageNode id={props.id} data={props.data as CanvasNode["data"]} />
  ),
  generateVideo: (props: NodeProps) => (
    <GenerateVideoNode id={props.id} data={props.data as CanvasNode["data"]} />
  ),
  composition: (props: NodeProps) => (
    <CompositionNode id={props.id} data={props.data as CanvasNode["data"]} />
  ),
  audio: (props: NodeProps) => <AudioNode data={props.data as CanvasNode["data"]} />,
  storyboard: (props: NodeProps) => (
    <StoryboardGroupNode id={props.id} data={props.data as CanvasNode["data"]} />
  ),
  nodeGroup: (props: NodeProps) => (
    <GroupNode id={props.id} data={props.data as CanvasNode["data"]} />
  ),
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

  // Build shotId → hostNodeId index once per nodes change — O(n) vs O(n×m) per edge
  const shotHostMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of nodes) {
      for (const sh of n.data.shots ?? []) {
        map.set(sh.id, n.id);
      }
    }
    return map;
  }, [nodes]);

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
        target: shotHostMap.get(e.to) ?? e.to,
        targetHandle: shotHostMap.has(e.to) ? e.to : (e.toHandle ?? undefined),
        type: "default",
        animated: true,
        style: { stroke: e.color ?? "#56C7CF", strokeWidth: 2 },
      })),
    [edges, shotHostMap],
  );

  const mergeToStoryboard = useCanvas((s) => s.mergeToStoryboard);
  const createGroup = useCanvas((s) => s.createGroup);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      // Cmd+Alt+G / Ctrl+Alt+G → merge selected images to storyboard
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        const selectedRfNodes = document.querySelectorAll(".react-flow__node.selected");
        const selectedIds = Array.from(selectedRfNodes)
          .map((el) => el.getAttribute("data-id"))
          .filter(Boolean) as string[];
        if (selectedIds.length >= 2) {
          mergeToStoryboard(selectedIds);
        }
      }
      // Cmd+Shift+G / Ctrl+Shift+G → create group
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        const selectedRfNodes = document.querySelectorAll(".react-flow__node.selected");
        const selectedIds = Array.from(selectedRfNodes)
          .map((el) => el.getAttribute("data-id"))
          .filter(Boolean) as string[];
        if (selectedIds.length >= 2) {
          createGroup(selectedIds);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, mergeToStoryboard, createGroup]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const c of changes) {
        if (c.type === "position" && c.position) {
          updateNode(c.id, { x: c.position.x, y: c.position.y });
        }
        if (c.type === "select" && c.selected) select(c.id);
      }
    },
    [updateNode, select],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const c of changes) {
        if (c.type === "remove") removeEdgeFn(c.id);
      }
    },
    [removeEdgeFn],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      const sourceNode = nodes.find((n) => n.id === c.source);
      const targetNode = nodes.find((n) => n.id === c.target);
      if (targetNode?.kind === "composition") {
        if (sourceNode?.kind === "audio") {
          // Audio → Composition: route to the specific target composition with correct handles
          addEdgeFn(
            c.source,
            c.target,
            c.sourceHandle ?? "source-process",
            c.targetHandle ?? "comp-in",
          );
        } else {
          addToComposition(c.source);
        }
        return;
      }
      const target = c.targetHandle ?? c.target;
      addEdgeFn(c.source, target);
    },
    [nodes, addEdgeFn, addToComposition],
  );

  const connectingSourceRef = useRef<string | null>(null);

  const onConnectStart = useCallback((_: unknown, params: { nodeId: string | null }) => {
    connectingSourceRef.current = params.nodeId;
  }, []);

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const sourceId = connectingSourceRef.current;
      connectingSourceRef.current = null;
      if (!sourceId) return;

      const clientX = "changedTouches" in event ? event.changedTouches[0].clientX : event.clientX;
      const clientY = "changedTouches" in event ? event.changedTouches[0].clientY : event.clientY;

      const elementsUnder = document.elementsFromPoint(clientX, clientY);
      for (const el of elementsUnder) {
        const nodeEl = (el as HTMLElement).closest?.(".react-flow__node");
        if (!nodeEl) continue;
        const targetId = nodeEl.getAttribute("data-id");
        if (!targetId) continue;
        const { nodes: currentNodes } = useCanvas.getState();
        const sourceNode = currentNodes.find((n) => n.id === sourceId);
        const targetNode = currentNodes.find((n) => n.id === targetId);
        if (targetNode?.kind === "composition" && targetId !== sourceId) {
          if (sourceNode?.kind === "audio") {
            addEdgeFn(sourceId, targetId, "source-process", "comp-in");
          } else {
            addToComposition(sourceId);
          }
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(15,23,42,0.10)"
        />
        <MultiSelectionCTA />
        <StoryboardToolbar />
        <GroupToolbar />
      </ReactFlow>
    </div>
  );
}
