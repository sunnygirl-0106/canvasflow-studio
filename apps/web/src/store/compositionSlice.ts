import {
  type Clip,
  type Track,
  type TrackKind,
  type CanvasNode,
  type Edge,
  type NodeKind,
  type SetState,
  type GetState,
  MAX_VIDEO_TRACKS,
  clipEnd,
  overlaps,
  isV1,
  patchTracks,
  colorByIndex,
  colorHexMap,
  createVideoClip,
  createAudioClip,
} from "./types";

export function createCompositionSlice(set: SetState, get: GetState) {
  return {
    // ── Core composition actions ──────────────────────────────────────────────

    mergeToComposition: (nodeIds: string[]) => {
      const { nodes } = get();
      const videoKinds: NodeKind[] = ["image", "generateImage", "generateVideo"];
      const allKinds: NodeKind[] = [...videoKinds, "audio"];
      const picked = nodes
        .filter((n) => nodeIds.includes(n.id) && allKinds.includes(n.kind))
        .sort((a, b) => a.x - b.x || a.y - b.y);
      if (picked.length < 2) return null;

      const videoPicked = picked.filter(
        (n): n is Extract<CanvasNode, { kind: "image" | "generateImage" | "generateVideo" }> =>
          videoKinds.includes(n.kind),
      );
      const audioPicked = picked.filter(
        (n): n is Extract<CanvasNode, { kind: "audio" }> => n.kind === "audio",
      );

      get().pushHistory();

      const ts = Date.now();
      const compId = `composition-${ts}`;
      const maxX = Math.max(...picked.map((n) => n.x));
      const minY = Math.min(...picked.map((n) => n.y));
      const maxY = Math.max(...picked.map((n) => n.y));

      // Build video clips on V1
      let videoCursor = 0;
      const v1Clips: Clip[] = videoPicked.map((n, i) => {
        const dur =
          "duration" in n.data && typeof n.data.duration === "number" ? n.data.duration : 3;
        const clip = createVideoClip({
          index: i,
          name: `${n.data.name ?? "Shot"} · ${String(i + 1).padStart(2, "0")}`,
          startSec: videoCursor,
          duration: dur,
          bindings: [n.id],
          thumbnail: n.data.src,
        });
        videoCursor += dur;
        return clip;
      });

      // Build audio clips on A1
      let audioCursor = 0;
      const a1Clips: Clip[] = audioPicked.map((n, i) => {
        const dur = n.data.duration;
        const clip = createAudioClip({
          index: i,
          name: n.data.name ?? "音频",
          startSec: audioCursor,
          duration: dur,
          bindings: [n.id],
          thumbnail: n.data.waveform,
        });
        audioCursor += dur;
        return clip;
      });

      const tracks: Track[] = [];
      if (v1Clips.length > 0) {
        tracks.push({ id: `track-v1-${ts}`, kind: "video", name: "V1", clips: v1Clips });
      }
      if (a1Clips.length > 0) {
        tracks.push({ id: `track-a1-${ts}`, kind: "audio", name: "A1", clips: a1Clips });
      }

      const compNode: CanvasNode = {
        id: compId,
        kind: "composition",
        x: maxX + 400,
        y: (minY + maxY) / 2,
        data: {
          name: `视频合成 ${get().nodes.filter((n) => n.kind === "composition").length + 1}`,
          width: Math.max(1200, picked.length * 320),
          pxPerSecond: 60,
          tracks,
        },
      };

      const newEdges: Edge[] = picked.map((n, i) => ({
        id: `e-${ts}-${i}`,
        from: n.id,
        to: compId,
        sourceHandle: n.kind === "audio" ? "source-process" : "source-process",
        toHandle: "comp-in",
        color: n.kind === "audio" ? colorHexMap.gray : colorHexMap[colorByIndex(i)],
      }));

      set((s) => ({
        nodes: [...s.nodes, compNode],
        edges: [...s.edges, ...newEdges],
        selectedId: compId,
        panelOpen: true,
      }));
      return compId;
    },

    addToComposition: (nodeId: string) => {
      const { nodes } = get();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;

      const compositions = nodes.filter(
        (n): n is Extract<CanvasNode, { kind: "composition" }> => n.kind === "composition",
      );
      const existingComp = compositions[compositions.length - 1] ?? null;
      const ts = Date.now();
      const compId = existingComp?.id ?? `composition-${ts}`;

      // Audio node path
      if (node.kind === "audio") {
        if (!existingComp) return null;
        get().pushHistory();
        const tracks = existingComp.data.tracks;
        const audioTracks = tracks.filter((t) => t.kind === "audio");
        const targetTrackId =
          audioTracks.length > 0 ? audioTracks[audioTracks.length - 1].id : `track-a1-${ts}`;
        const targetTrack = tracks.find((t) => t.id === targetTrackId);
        const dur = node.data.duration;
        const startSec = targetTrack
          ? targetTrack.clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0)
          : 0;
        const newClip = createAudioClip({
          index: targetTrack ? targetTrack.clips.length : 0,
          name: node.data.name ?? "音频",
          startSec,
          duration: dur,
          bindings: [nodeId],
          thumbnail: node.data.waveform,
        });
        const newEdge: Edge = {
          id: `e-${ts}`,
          from: nodeId,
          to: compId,
          color: colorHexMap.gray,
        };
        set((s) => ({
          nodes: s.nodes.map((n) => {
            if (n.id !== compId || n.kind !== "composition") return n;
            const trks = n.data.tracks;
            let newTracks: Track[];
            if (audioTracks.length === 0) {
              newTracks = [
                ...trks,
                { id: targetTrackId, kind: "audio" as TrackKind, name: "A1", clips: [newClip] },
              ];
            } else {
              newTracks = trks.map((t) =>
                t.id === targetTrackId ? { ...t, clips: [...t.clips, newClip] } : t,
              );
            }
            return { ...n, data: { ...n.data, tracks: newTracks } } as CanvasNode;
          }),
          edges: [...s.edges, newEdge],
          selectedId: compId,
          panelOpen: true,
        }));
        return compId;
      }

      // Video node path
      const mediaKinds: NodeKind[] = ["image", "generateImage", "generateVideo"];
      if (!mediaKinds.includes(node.kind)) return null;

      get().pushHistory();

      const newEdge: Edge = {
        id: `e-${ts}`,
        from: nodeId,
        to: compId,
        sourceHandle: "source-process",
        toHandle: "comp-in",
        color: colorHexMap[colorByIndex(0)],
      };

      // node is narrowed: not "audio" and is one of mediaKinds — treat as image-like
      const nodeSrc = "src" in node.data ? (node.data as { src?: string }).src : undefined;
      const nodeDur =
        "duration" in node.data ? ((node.data as { duration?: number }).duration ?? 3) : 3;

      set((s) => {
        let nextNodes: CanvasNode[];
        let edgeColor = colorHexMap[colorByIndex(0)];

        if (existingComp) {
          nextNodes = s.nodes.map((n) => {
            if (n.id !== compId || n.kind !== "composition") return n;
            const trks = n.data.tracks;
            const v1 = trks.find(isV1);
            const idx = v1 ? v1.clips.length : 0;
            edgeColor = colorHexMap[colorByIndex(idx)];
            const newClip = createVideoClip({
              index: idx,
              name: `${node.data.name ?? "Shot"} · ${String(idx + 1).padStart(2, "0")}`,
              startSec: v1 ? v1.clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0) : 0,
              duration: nodeDur,
              bindings: [nodeId],
              thumbnail: nodeSrc,
            });
            let newTracks: Track[];
            if (v1) {
              newTracks = trks.map((t) => (isV1(t) ? { ...t, clips: [...t.clips, newClip] } : t));
            } else {
              newTracks = [
                ...trks,
                { id: `track-v1-${ts}`, kind: "video" as TrackKind, name: "V1", clips: [newClip] },
              ];
            }
            return { ...n, data: { ...n.data, tracks: newTracks } } as CanvasNode;
          });
        } else {
          const newComp: CanvasNode = {
            id: compId,
            kind: "composition",
            x: node.x + 400,
            y: node.y,
            data: {
              name: `视频合成 ${s.nodes.filter((n) => n.kind === "composition").length + 1}`,
              width: 1200,
              pxPerSecond: 60,
              tracks: [
                {
                  id: `track-v1-${ts}`,
                  kind: "video",
                  name: "V1",
                  clips: [
                    createVideoClip({
                      index: 0,
                      name: `${node.data.name ?? "Shot"} · 01`,
                      startSec: 0,
                      duration: nodeDur,
                      bindings: [nodeId],
                      thumbnail: nodeSrc,
                    }),
                  ],
                },
              ],
            },
          };
          nextNodes = [...s.nodes, newComp];
        }
        return {
          nodes: nextNodes,
          edges: [...s.edges, { ...newEdge, color: edgeColor }],
          selectedId: compId,
          panelOpen: true,
        };
      });
      return compId;
    },

    // ── Editor actions ──────────────────────────────────────────────────────────

    openComposition: (id: string) =>
      set({ editorCompId: id, editorMode: "full", selectedClipId: null }),
    closeComposition: () => set({ editorCompId: null, selectedClipId: null }),
    setEditorMode: (m: "full" | "collapsed") => set({ editorMode: m }),
    selectClip: (id: string | null) => set({ selectedClipId: id }),

    // ── Track operations ──────────────────────────────────────────────────────

    addVideoTrack: (compId: string) => {
      const { nodes } = get();
      const comp = nodes.find((n) => n.id === compId);
      if (!comp || comp.kind !== "composition") return;
      const videoTracks = comp.data.tracks.filter((t) => t.kind === "video");
      if (videoTracks.length >= MAX_VIDEO_TRACKS) return;
      get().pushHistory();
      const ts = Date.now();
      const newTrack: Track = {
        id: `track-v${videoTracks.length + 1}-${ts}`,
        kind: "video",
        name: `V${videoTracks.length + 1}`,
        clips: [],
      };
      set((s) => ({
        nodes: patchTracks(s.nodes, compId, (tracks) => [...tracks, newTrack]),
      }));
    },

    addAudioTrack: (compId: string) => {
      get().pushHistory();
      const { nodes } = get();
      const comp = nodes.find((n) => n.id === compId);
      if (!comp || comp.kind !== "composition") return;
      const audioTracks = comp.data.tracks.filter((t) => t.kind === "audio");
      const ts = Date.now();
      const newTrack: Track = {
        id: `track-a${audioTracks.length + 1}-${ts}`,
        kind: "audio",
        name: `A${audioTracks.length + 1}`,
        clips: [],
      };
      set((s) => ({
        nodes: patchTracks(s.nodes, compId, (tracks) => [...tracks, newTrack]),
      }));
    },

    removeTrack: (compId: string, trackId: string) => {
      get().pushHistory();
      set((s) => ({
        nodes: patchTracks(s.nodes, compId, (tracks) => tracks.filter((t) => t.id !== trackId)),
      }));
    },

    // ── Clip operations ───────────────────────────────────────────────────────

    updateClip: (compId: string, clipId: string, patch: Partial<Clip>) =>
      set((s) => ({
        nodes: patchTracks(s.nodes, compId, (tracks) =>
          tracks.map((t) => ({
            ...t,
            clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
          })),
        ),
      })),

    removeClip: (compId: string, clipId: string) => {
      get().pushHistory();
      set((s) => ({
        nodes: patchTracks(s.nodes, compId, (tracks) =>
          tracks.map((t) => ({ ...t, clips: t.clips.filter((c) => c.id !== clipId) })),
        ),
      }));
    },

    moveClip: (compId: string, clipId: string, toTrackId: string, toStartSec: number) => {
      get().pushHistory();
      set((s) => {
        const comp = s.nodes.find((n) => n.id === compId);
        if (!comp || comp.kind !== "composition") return {};
        const tracks = comp.data.tracks;

        let sourceClip: Clip | null = null;
        for (const t of tracks) {
          const c = t.clips.find((c) => c.id === clipId);
          if (c) {
            sourceClip = c;
            break;
          }
        }
        if (!sourceClip) return {};

        const toTrack = tracks.find((t) => t.id === toTrackId);
        if (!toTrack) return {};
        if (sourceClip.clipKind !== toTrack.kind) return {};

        let newTracks = tracks.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => c.id !== clipId),
        }));

        const updatedClip: Clip = { ...sourceClip, startSec: toStartSec };

        const targetAfterRemoval = newTracks.find((t) => t.id === toTrackId);
        if (targetAfterRemoval) {
          const hasOverlap = targetAfterRemoval.clips.some((c) => overlaps(c, updatedClip));
          if (hasOverlap) return {};
        }

        newTracks = newTracks.map((t) =>
          t.id !== toTrackId ? t : { ...t, clips: [...t.clips, updatedClip] },
        );

        return {
          nodes: s.nodes.map((n) =>
            n.id !== compId ? n : { ...n, data: { ...n.data, tracks: newTracks } },
          ) as CanvasNode[],
        };
      });
    },

    reorderVideoTrack: (compId: string, trackId: string, clipIds: string[]) =>
      set((s) => ({
        nodes: patchTracks(s.nodes, compId, (tracks) =>
          tracks.map((t) => {
            if (t.id !== trackId) return t;
            const map = new Map(t.clips.map((c) => [c.id, c]));
            const clips = clipIds.filter((id) => map.has(id)).map((id) => map.get(id)!);
            return { ...t, clips };
          }),
        ),
      })),

    toggleClipMute: (compId: string, clipId: string) => {
      get().pushHistory();
      set((s) => ({
        nodes: patchTracks(s.nodes, compId, (tracks) =>
          tracks.map((t) => ({
            ...t,
            clips: t.clips.map((c) => (c.id === clipId ? { ...c, muted: !c.muted } : c)),
          })),
        ),
      }));
    },

    splitClip: (compId: string, clipId: string, atSec: number) => {
      get().pushHistory();
      set((s) => ({
        nodes: patchTracks(s.nodes, compId, (tracks) =>
          tracks.map((t) => {
            const idx = t.clips.findIndex((c) => c.id === clipId);
            if (idx === -1) return t;
            const clip = t.clips[idx];
            if (atSec <= 0 || atSec >= clip.duration) return t;

            const leftDur = atSec;
            const rightDur = clip.duration - atSec;
            const leftBase = leftDur * clip.speed;
            const rightBase = rightDur * clip.speed;
            const ts = Date.now();

            const left: Clip = {
              ...clip,
              duration: leftDur,
              baseDuration: leftBase,
              sourceOut: clip.sourceIn + leftBase,
            };
            const right: Clip = {
              ...clip,
              id: `${clip.id}-split-${ts}`,
              name: `${clip.name} (2)`,
              duration: rightDur,
              baseDuration: rightBase,
              sourceIn: clip.sourceIn + leftBase,
              startSec: clip.startSec + atSec,
            };
            return {
              ...t,
              clips: [...t.clips.slice(0, idx), left, right, ...t.clips.slice(idx + 1)],
            };
          }),
        ),
      }));
    },

    cropClip: (compId: string, clipId: string, side: "left" | "right", atSec: number) => {
      get().pushHistory();
      set((s) => ({
        nodes: patchTracks(s.nodes, compId, (tracks) =>
          tracks.map((t) => {
            const idx = t.clips.findIndex((c) => c.id === clipId);
            if (idx === -1) return t;
            const clip = t.clips[idx];
            if (atSec <= 0 || atSec >= clip.duration) return t;

            let updated: Clip;
            if (side === "right") {
              const newDur = atSec;
              const newBase = newDur * clip.speed;
              updated = {
                ...clip,
                duration: newDur,
                baseDuration: newBase,
                sourceOut: clip.sourceIn + newBase,
              };
            } else {
              const newDur = clip.duration - atSec;
              const newBase = newDur * clip.speed;
              updated = {
                ...clip,
                duration: newDur,
                baseDuration: newBase,
                sourceIn: clip.sourceOut - newBase,
                startSec: clip.startSec + atSec,
              };
            }
            return { ...t, clips: t.clips.map((c, i) => (i === idx ? updated : c)) };
          }),
        ),
      }));
    },

    setClipSpeed: (compId: string, clipId: string, speed: number) => {
      if (speed <= 0) return;
      get().pushHistory();
      set((s) => ({
        nodes: patchTracks(s.nodes, compId, (tracks) =>
          tracks.map((t) => ({
            ...t,
            clips: t.clips.map((c) =>
              c.id !== clipId ? c : { ...c, speed, duration: c.baseDuration / speed },
            ),
          })),
        ),
      }));
    },

    // ── Audio clip from node ──────────────────────────────────────────────────

    addAudioClipFromNode: (compId: string, nodeId: string, atSec?: number) => {
      get().pushHistory();
      const { nodes } = get();
      const audioNode = nodes.find((n) => n.id === nodeId);
      const comp = nodes.find((n) => n.id === compId);
      if (!audioNode || audioNode.kind !== "audio" || !comp || comp.kind !== "composition") return;

      const ts = Date.now();
      const tracks = comp.data.tracks;
      const audioTracks = tracks.filter((t) => t.kind === "audio");
      const targetTrackId =
        audioTracks.length > 0 ? audioTracks[audioTracks.length - 1].id : `track-a1-${ts}`;
      const targetTrack = tracks.find((t) => t.id === targetTrackId);
      const dur = audioNode.data.duration;
      const startSec =
        atSec ??
        (targetTrack ? targetTrack.clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0) : 0);

      const newClip = createAudioClip({
        index: targetTrack ? targetTrack.clips.length : 0,
        name: audioNode.data.name ?? "音频",
        startSec,
        duration: dur,
        bindings: [nodeId],
        thumbnail: audioNode.data.waveform,
      });

      set((s) => ({
        nodes: s.nodes.map((n) => {
          if (n.id !== compId || n.kind !== "composition") return n;
          const trks = n.data.tracks;
          let newTracks: Track[];
          if (audioTracks.length === 0) {
            newTracks = [
              ...trks,
              { id: targetTrackId, kind: "audio" as TrackKind, name: "A1", clips: [newClip] },
            ];
          } else {
            newTracks = trks.map((t) =>
              t.id === targetTrackId ? { ...t, clips: [...t.clips, newClip] } : t,
            );
          }
          return { ...n, data: { ...n.data, tracks: newTracks } } as CanvasNode;
        }),
      }));
    },
  };
}
