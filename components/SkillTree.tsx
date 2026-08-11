"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { skillTree } from "../lib/skillTreeData";
import {
  buildGraphIndex,
  computeLevels,
  edgesWithinSet,
  getAncestors,
  layoutGraph,
} from "../lib/graphUtils";
import type { SkillNode } from "../lib/types";
import { COLOUR_STYLES, COLOUR_LABELS } from "../lib/colors";
import { toTitleCase } from "../lib/text";

interface SkillTreeProps {
  nodes?: SkillNode[];
}

type NodeState = "selected" | "prereq" | "idle" | "dimmed";

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(40, (x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

const DRAG_THRESHOLD = 4; // px of movement before a press counts as a pan, not a click

export default function SkillTree({ nodes = skillTree }: SkillTreeProps) {
  const index = useMemo(() => buildGraphIndex(nodes), [nodes]);
  const levels = useMemo(() => computeLevels(index), [index]);
  const { positions, width, height } = useMemo(
    () => layoutGraph(index),
    [index]
  );

  // Only one exercise can be selected at a time. Selecting it highlights
  // every prerequisite required to reach it.
  const [selected, setSelected] = useState<string | null>(null);

  // Full ancestor chain of the selected exercise, including itself.
  const ancestorSet = useMemo(() => {
    if (!selected) return new Set<string>();
    return getAncestors(index, selected);
  }, [index, selected]);

  // Just the prerequisites, i.e. everything in the chain except the
  // selected exercise itself.
  const prereqSet = useMemo(() => {
    const set = new Set(ancestorSet);
    if (selected) set.delete(selected);
    return set;
  }, [ancestorSet, selected]);

  const chainEdges = useMemo(
    () => edgesWithinSet(index, ancestorSet),
    [index, ancestorSet]
  );
  const isEdgeHighlighted = (a: string, b: string) =>
    chainEdges.some(([x, y]) => x === a && y === b);

  // Ordered earliest -> latest, ending with the selected exercise itself.
  const orderedPrereqs = useMemo(
    () =>
      [...prereqSet].sort((x, y) => (levels.get(x) ?? 0) - (levels.get(y) ?? 0)),
    [prereqSet, levels]
  );

  function handleNodeClick(id: string) {
    const next = selected === id ? null : id;
    setSelected(next);
    if (next) setSidebarOpen(true); // reveal details for the new selection
  }

  function nodeState(id: string): NodeState {
    if (selected === id) return "selected";
    if (selected) return prereqSet.has(id) ? "prereq" : "dimmed";
    return "idle";
  }

  // --- Pan / zoom / drag-to-move -----------------------------------------
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 2.5;
  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  // Tracks every currently-active pointer (finger/mouse) by id, so we can
  // tell a single-finger pan apart from a two-finger pinch.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragging = useRef(false);
  const draggedRef = useRef(false); // did this gesture move enough to count as a drag (vs. a tap)?
  const lastPoint = useRef({ x: 0, y: 0 });
  const pendingClickIdRef = useRef<string | null>(null); // node under the finger/cursor at pointerdown
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
    pan: { x: number; y: number };
    midpoint: { x: number; y: number };
  } | null>(null);

  // Center the graph in the viewport on mount / whenever its size changes.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPan({
      x: (rect.width - width) / 2,
      y: (rect.height - height) / 2,
    });
  }, [width, height]);

  function resetView() {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPan({ x: (rect.width - width) / 2, y: (rect.height - height) / 2 });
    setZoom(1);
  }

  // Re-centers the view on a single node, e.g. after picking it from search
  // (a click on the graph itself doesn't need this — the node's already on
  // screen since that's what was clicked).
  function centerOnNode(id: string) {
    const pos = positions.get(id);
    const el = canvasRef.current;
    if (!pos || !el) return;
    const rect = el.getBoundingClientRect();
    setPan({ x: rect.width / 2 - pos.x * zoom, y: rect.height / 2 - pos.y * zoom });
  }

  function pointerDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function pointerMidpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  // Applies a new zoom level while keeping whatever content is under
  // `screenX, screenY` (in viewport coordinates) visually anchored in place,
  // rather than the graph jumping around as it scales.
  function zoomAround(screenX: number, screenY: number, newZoom: number, fromPan: { x: number; y: number }, fromZoom: number) {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const localX = screenX - rect.left;
    const localY = screenY - rect.top;
    const contentX = (localX - fromPan.x) / fromZoom;
    const contentY = (localY - fromPan.y) / fromZoom;
    setPan({ x: localX - contentX * newZoom, y: localY - contentY * newZoom });
    setZoom(newZoom);
  }

  // For the +/- buttons -- zooms toward the center of the canvas.
  function zoomStep(factor: number) {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomAround(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      clampZoom(zoom * factor),
      pan,
      zoom
    );
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault(); // stop the browser from starting a text/image drag-select
    // Capture immediately (not deferred) -- on touch devices, waiting even a
    // few pixels of movement before capturing lets the OS's own scroll/pan
    // gesture recognizer steal the touch sequence first, which is why drags
    // used to die right after starting on mobile. Clicks still work despite
    // capturing immediately because we hit-test for the tapped node
    // ourselves below rather than relying on the browser's native click
    // event (which capture would otherwise redirect to this container).
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no-op
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      dragging.current = true;
      draggedRef.current = false;
      lastPoint.current = { x: e.clientX, y: e.clientY };
      const target = e.target as Element;
      const nodeEl = target.closest?.("[data-node-id]");
      pendingClickIdRef.current = nodeEl?.getAttribute("data-node-id") ?? null;
      setIsDragging(true);
    } else if (pointersRef.current.size === 2) {
      // A second finger joined -- this is now a pinch, not a pan or a tap.
      dragging.current = false;
      draggedRef.current = true;
      pendingClickIdRef.current = null;
      const pts = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: pointerDistance(pts[0], pts[1]),
        zoom,
        pan,
        midpoint: pointerMidpoint(pts[0], pts[1]),
      };
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()].slice(0, 2);
      const distance = pointerDistance(pts[0], pts[1]);
      const scaleRatio = distance / (pinchRef.current.distance || 1);
      const newZoom = clampZoom(pinchRef.current.zoom * scaleRatio);
      zoomAround(
        pinchRef.current.midpoint.x,
        pinchRef.current.midpoint.y,
        newZoom,
        pinchRef.current.pan,
        pinchRef.current.zoom
      );
      return;
    }

    if (!dragging.current) return;
    const dx = e.clientX - lastPoint.current.x;
    const dy = e.clientY - lastPoint.current.y;
    if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) draggedRef.current = true;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // no-op: pointer may not be captured
    }

    if (pointersRef.current.size >= 2) {
      // Still pinching with the remaining fingers -- nothing else to do.
      return;
    }

    if (pointersRef.current.size === 1) {
      // One finger lifted out of a pinch; the remaining finger continues as
      // a pan from here, not a tap.
      pinchRef.current = null;
      dragging.current = true;
      draggedRef.current = true;
      lastPoint.current = [...pointersRef.current.values()][0];
      return;
    }

    // Last pointer lifted.
    pinchRef.current = null;
    dragging.current = false;
    setIsDragging(false);
    if (!draggedRef.current && pendingClickIdRef.current) {
      handleNodeClick(pendingClickIdRef.current);
    }
    pendingClickIdRef.current = null;
  }

  // Trackpad pinch-to-zoom arrives as wheel events with ctrlKey set (this is
  // how browsers report it, even though no keyboard key is actually held).
  // A native (non-React) listener with { passive: false } is required here
  // -- React attaches onWheel as a passive listener for scroll performance,
  // which would silently prevent preventDefault() from stopping the
  // browser's own page-zoom behavior.
  //
  // The listener is registered once (empty deps) so it isn't torn down and
  // re-attached on every pan/zoom change, so it reads current pan/zoom via
  // refs (kept in sync below) rather than closing over state directly.
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return; // plain scroll -- leave it alone
      e.preventDefault();
      const currentZoom = zoomRef.current;
      const newZoom = clampZoom(currentZoom * Math.exp(-e.deltaY * 0.01));
      zoomAround(e.clientX, e.clientY, newZoom, panRef.current, currentZoom);
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Left sidebar (prerequisite details) open/collapsed state.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Legend + category colour key, also collapsed by default to save space.
  const [legendOpen, setLegendOpen] = useState(false);

  // Ordered earliest -> latest, ending with the selected exercise itself --
  // used to drive the sidebar's title + description list.
  const sidebarList = useMemo(
    () => (selected ? [...orderedPrereqs, selected] : []),
    [orderedPrereqs, selected]
  );

  // --- Search-as-you-type -----------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return nodes.filter((n) => n.exercise.toLowerCase().includes(q)).slice(0, 8);
  }, [nodes, searchQuery]);

  function selectFromSearch(id: string) {
    setSelected(id);
    setSidebarOpen(true);
    centerOnNode(id);
    setSearchQuery("");
    setSearchActiveIndex(0);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setSearchActiveIndex(0);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (searchResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchActiveIndex((i) => (i + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchActiveIndex((i) => (i - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = searchResults[searchActiveIndex] ?? searchResults[0];
      if (target) selectFromSearch(target.id);
    } else if (e.key === "Escape") {
      setSearchQuery("");
    }
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{
        background: "#14171a",
        color: "#ededea",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      {/*
        Plain <style> tag (not styled-jsx) so this drops into any Next.js
        project — pages router or app router — with no extra setup. Class
        names are prefixed with `st-` to avoid colliding with the host app.
      */}
      <style>{`
        .st-display {
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          letter-spacing: 0.04em;
          font-weight: 700;
        }
        .st-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
            monospace;
        }
        .st-node-group {
          cursor: pointer;
          transition: filter 160ms ease, opacity 200ms ease;
        }
        .st-node-group:hover {
          filter: brightness(1.25);
        }
        .st-node-group:focus-visible rect {
          stroke: #ffb454;
          stroke-width: 3;
        }
        .st-edge-glow {
          filter: blur(3px);
          animation: st-pulse-glow 2.2s ease-in-out infinite;
        }
        @keyframes st-pulse-glow {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 0.7;
          }
        }
        .st-edge-flow {
          stroke-dasharray: 8 7;
          animation: st-dash-flow 900ms linear infinite;
        }
        @keyframes st-dash-flow {
          to {
            stroke-dashoffset: -30;
          }
        }
        .st-node-glow {
          filter: drop-shadow(0 0 5px var(--glow-color))
            drop-shadow(0 0 14px var(--glow-color));
        }
        .st-node-glow:hover {
          filter: brightness(1.15) drop-shadow(0 0 5px var(--glow-color))
            drop-shadow(0 0 14px var(--glow-color));
        }
      `}</style>

      {/* Draggable canvas, fills the whole screen */}
      <div
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          backgroundImage:
            "radial-gradient(circle, #20252b 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          backgroundPosition: `${pan.x % 28}px ${pan.y % 28}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width,
            height,
          }}
        >
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Calisthenics skill tree graph"
          >
            {/* Edges */}
            <g>
              {nodes.map((n) =>
                (index.forward.get(n.id) ?? []).map((targetId) => {
                  const from = positions.get(n.id);
                  const to = positions.get(targetId);
                  if (!from || !to) return null;
                  const d = edgePath(from.x, from.y, to.x, to.y);
                  const highlighted = isEdgeHighlighted(n.id, targetId);
                  return (
                    <g key={`${n.id}->${targetId}`}>
                      {highlighted && (
                        <path
                          d={d}
                          className="st-edge-glow"
                          fill="none"
                          stroke="#f5f5f4"
                          strokeWidth={10}
                        />
                      )}
                      <path
                        d={d}
                        className={highlighted ? "st-edge-flow" : undefined}
                        fill="none"
                        stroke={highlighted ? "#f5f5f4" : "#3a4048"}
                        strokeWidth={highlighted ? 3 : 2}
                        opacity={selected && !highlighted ? 0.25 : 1}
                      />
                    </g>
                  );
                })
              )}
            </g>

            {/* Nodes */}
            <g>
              {nodes.map((n) => {
                const pos = positions.get(n.id);
                if (!pos) return null;
                const state = nodeState(n.id);
                const nodeWidth = 250;
                const nodeHeight = 64;
                const category = COLOUR_STYLES[n.colour];
                const isHighlighted = state === "selected" || state === "prereq";

                // Nodes are always coloured by their own `colour` field.
                // Selecting an exercise doesn't swap that colour out for a
                // shared highlight colour — it just makes the node glow
                // (via the CSS --glow-color variable below) and thickens
                // the border a touch. Only "not relevant" nodes lose their
                // colour, fading to grey.
                const colors =
                  state === "dimmed"
                    ? { fill: "#191c1f", stroke: "#262b31", text: "#5b6169" }
                    : { fill: category.fill, stroke: category.stroke, text: category.text };

                return (
                  <g
                    key={n.id}
                    data-node-id={n.id}
                    className={isHighlighted ? "st-node-group st-node-glow" : "st-node-group"}
                    style={isHighlighted ? ({ "--glow-color": category.stroke } as React.CSSProperties) : undefined}
                    tabIndex={0}
                    role="button"
                    aria-pressed={state === "selected"}
                    transform={`translate(${pos.x - nodeWidth / 2}, ${
                      pos.y - nodeHeight / 2
                    })`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleNodeClick(n.id);
                      }
                    }}
                    opacity={state === "dimmed" ? 0.55 : 1}
                  >
                    <rect
                      width={nodeWidth}
                      height={nodeHeight}
                      rx={12}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={state === "selected" ? 2.5 : state === "prereq" ? 2 : 1.5}
                    />
                    <text
                      x={nodeWidth / 2}
                      y={nodeHeight / 2 - 2}
                      textAnchor="middle"
                      fontSize={14.5}
                      fontWeight={600}
                      fill={colors.text}
                    >
                      {toTitleCase(n.exercise)}
                    </text>
                    {state === "selected" && (
                      <text
                        x={nodeWidth - 16}
                        y={nodeHeight - 14}
                        textAnchor="end"
                        className="st-mono"
                        fontSize={9.5}
                        fill={category.stroke}
                        letterSpacing={1}
                      >
                        SELECTED
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Title, floating top-center. Hidden on mobile -- both panels go
          full-width there and would sit right on top of it anyway. */}
      <div className="pointer-events-none absolute left-1/2 top-6 z-10 hidden -translate-x-1/2 text-center sm:block">
        <h2 className="st-display text-2xl uppercase sm:text-3xl">
          Skill Tree
        </h2>
        <p className="mt-1 text-sm" style={{ color: "#8b929b" }}>
          Drag to move around. Select an exercise — prerequisite details
          appear in the sidebar.
        </p>
      </div>

      {/* Prerequisite details, dropdown-style sidebar floating on the left.
          Full-width on mobile (stacked above the info panel below), a fixed
          width pinned to the corner from the sm breakpoint up. */}
      <div
        className="absolute left-4 right-4 top-4 z-20 flex max-h-[70vh] flex-col rounded-xl border shadow-2xl backdrop-blur sm:right-auto sm:max-h-[calc(100vh-2rem)] sm:w-80"
        style={{
          background: "rgba(26, 30, 34, 0.85)",
          borderColor: "#262b31",
        }}
      >
        <button
          onClick={() => setSidebarOpen((open) => !open)}
          aria-expanded={sidebarOpen}
          className="st-mono flex shrink-0 items-center justify-between gap-2 p-4 text-xs uppercase tracking-wider transition-colors hover:bg-[#1e2227]"
          style={{
            color: "#8b929b",
            borderBottom: sidebarOpen ? "1px solid #262b31" : "none",
          }}
        >
          Prerequisites
          <span
            aria-hidden
            style={{
              display: "inline-block",
              transition: "transform 160ms ease",
              transform: sidebarOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </span>
        </button>

        {sidebarOpen && (
          <div className="overflow-y-auto p-4">
            {!selected && (
              <p className="text-sm" style={{ color: "#5b6169" }}>
                Select an exercise on the graph to see every prerequisite
                required to reach it, along with a short description of
                each.
              </p>
            )}

            {selected && sidebarList.length === 0 && (
              <p className="text-sm" style={{ color: "#8b929b" }}>
                This is a root movement — no prerequisites needed.
              </p>
            )}

            {selected && sidebarList.length > 0 && (
              <div className="flex flex-col gap-5">
                {sidebarList.map((id) => {
                  const node = index.byId.get(id);
                  if (!node) return null;
                  const isSelectedItem = id === selected;
                  const category = COLOUR_STYLES[node.colour];
                  return (
                    <div key={id}>
                      <h4
                        className="text-sm font-semibold"
                        style={{
                          color: isSelectedItem ? category.stroke : "#ededea",
                        }}
                      >
                        {toTitleCase(node.exercise)}
                      </h4>
                      <p
                        className="mt-1.5 text-sm leading-relaxed"
                        style={{ color: "#8b929b" }}
                      >
                        {node.description || "No description yet."}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info overlay. Full-width and stacked below the prerequisites panel
          on mobile (which is ~52px tall collapsed), pinned to the top-right
          corner with a fixed width from the sm breakpoint up. */}
      <div
        className="absolute left-4 right-4 top-20 z-10 flex max-h-[60vh] flex-col gap-4 overflow-y-auto rounded-xl border p-4 shadow-2xl backdrop-blur sm:left-auto sm:top-4 sm:max-h-[calc(100vh-2rem)] sm:w-72"
        style={{
          background: "rgba(26, 30, 34, 0.85)",
          borderColor: "#262b31",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="st-mono text-xs uppercase tracking-wider" style={{ color: "#8b929b" }}>
            View
          </span>
          <div className="flex items-center gap-2">
            <div
              className="st-mono flex items-center overflow-hidden rounded-md border text-[10px]"
              style={{ borderColor: "#3a4048", color: "#8b929b" }}
            >
              <button
                onClick={() => zoomStep(1 / 1.3)}
                aria-label="Zoom out"
                className="px-2 py-1 transition-colors hover:bg-[#1e2227]"
              >
                −
              </button>
              <span
                className="border-x px-1.5 py-1 tabular-nums"
                style={{ borderColor: "#3a4048" }}
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => zoomStep(1.3)}
                aria-label="Zoom in"
                className="px-2 py-1 transition-colors hover:bg-[#1e2227]"
              >
                +
              </button>
            </div>
            <button
              onClick={resetView}
              className="st-mono rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-wide transition-colors hover:bg-[#1e2227]"
              style={{ borderColor: "#3a4048", color: "#8b929b" }}
            >
              Recenter
            </button>
            {selected && (
              <button
                onClick={() => setSelected(null)}
                className="st-mono rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-wide transition-colors hover:bg-[#1e2227]"
                style={{ borderColor: "#3a4048", color: "#8b929b" }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div>
          <h3
            className="st-mono text-xs uppercase tracking-wider"
            style={{ color: "#8b929b" }}
          >
            Selection
          </h3>

          <div className="relative mt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search skills…"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-[#5b6169] focus:border-[#8b929b]"
              style={{
                background: "#1e2227",
                borderColor: "#262b31",
                color: "#ededea",
              }}
            />

            {searchResults.length > 0 && (
              <ul
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border shadow-2xl"
                style={{ background: "#1e2227", borderColor: "#262b31" }}
              >
                {searchResults.map((n, i) => {
                  const category = COLOUR_STYLES[n.colour];
                  const isActive = i === searchActiveIndex;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => selectFromSearch(n.id)}
                        onMouseEnter={() => setSearchActiveIndex(i)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                        style={{
                          background: isActive ? "#262b31" : "transparent",
                          color: "#ededea",
                        }}
                      >
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ background: category.stroke }}
                        />
                        {toTitleCase(n.exercise)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {searchQuery.trim() !== "" && searchResults.length === 0 && (
              <div
                className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border px-3 py-2 text-sm shadow-2xl"
                style={{ background: "#1e2227", borderColor: "#262b31", color: "#5b6169" }}
              >
                No matching skills.
              </div>
            )}
          </div>

          <div className="mt-2">
            <SelectionSlot
              label="Exercise"
              exercise={selected ? toTitleCase(index.byId.get(selected)?.exercise ?? "") : undefined}
            />
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: "#262b31" }}>
          <button
            onClick={() => setLegendOpen((open) => !open)}
            aria-expanded={legendOpen}
            className="st-mono flex w-full items-center justify-between gap-2 text-xs uppercase tracking-wider transition-colors"
            style={{ color: "#8b929b" }}
          >
            Legend
            <span
              aria-hidden
              style={{
                display: "inline-block",
                transition: "transform 160ms ease",
                transform: legendOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▾
            </span>
          </button>

          {legendOpen && (
            <div className="mt-3 flex flex-col gap-4">
              <div>
                <p className="text-xs" style={{ color: "#5b6169" }}>
                  Selected and prerequisite exercises glow in their own
                  category colour.
                </p>
                <div className="mt-2 flex flex-col gap-1.5 text-xs" style={{ color: "#8b929b" }}>
                  <LegendRow color="#f5f5f4" label="Prerequisite path" />
                  <LegendRow color="#3a4048" label="Not relevant" />
                </div>
              </div>

              <div>
                <h4
                  className="st-mono text-xs uppercase tracking-wider"
                  style={{ color: "#8b929b" }}
                >
                  Categories
                </h4>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs" style={{ color: "#8b929b" }}>
                  {(Object.keys(COLOUR_STYLES) as Array<keyof typeof COLOUR_STYLES>).map(
                    (colour) => (
                      <LegendRow
                        key={colour}
                        color={COLOUR_STYLES[colour].stroke}
                        label={COLOUR_LABELS[colour]}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectionSlot({
  label,
  exercise,
}: {
  label: string;
  exercise?: string;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border px-3 py-2"
      style={{
        borderColor: exercise ? "#ffb454" : "#262b31",
        background: "#1e2227",
      }}
    >
      <span className="st-mono text-[10px] uppercase" style={{ color: "#5b6169" }}>
        {label}
      </span>
      <span
        className="text-sm"
        style={{ color: exercise ? "#ededea" : "#5b6169" }}
      >
        {exercise ?? "—"}
      </span>
    </div>
  );
}

function LegendRow({
  color,
  label,
  outline,
}: {
  color: string;
  label: string;
  outline?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{
          background: outline ? "transparent" : color,
          border: outline ? `2px solid ${color}` : "none",
        }}
      />
      {label}
    </div>
  );
}
