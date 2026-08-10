import { SkillNode } from "./types";

export interface GraphIndex {
  byId: Map<string, SkillNode>;
  /** exercise -> exercises it progresses into */
  forward: Map<string, string[]>;
  /** exercise -> exercises that progress into it (derived, not trusted from input) */
  backward: Map<string, string[]>;
}

/**
 * `progressions` is treated as the single source of truth for edges.
 * `prerequisites` on the input data is display-only; the actual graph
 * (and therefore pathfinding) is derived from progressions links so the
 * two can never silently disagree.
 */
export function buildGraphIndex(nodes: SkillNode[]): GraphIndex {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const forward = new Map<string, string[]>();
  const backward = new Map<string, string[]>();

  nodes.forEach((n) => {
    forward.set(
      n.id,
      n.progressions.filter((id) => byId.has(id)),
    );
    if (!backward.has(n.id)) backward.set(n.id, []);
  });

  nodes.forEach((n) => {
    n.progressions.forEach((targetId) => {
      if (!byId.has(targetId)) return;
      backward.set(targetId, [...(backward.get(targetId) ?? []), n.id]);
    });
  });

  return { byId, forward, backward };
}

/** Longest-path-from-a-root depth, used to lay nodes out in columns. */
export function computeLevels(index: GraphIndex): Map<string, number> {
  const levels = new Map<string, number>();
  const visiting = new Set<string>();

  function levelOf(id: string): number {
    if (levels.has(id)) return levels.get(id)!;
    if (visiting.has(id)) return 0; // guard against accidental cycles
    visiting.add(id);
    const parents = index.backward.get(id) ?? [];
    const level =
      parents.length === 0 ? 0 : 1 + Math.max(...parents.map(levelOf));
    visiting.delete(id);
    levels.set(id, level);
    return level;
  }

  index.byId.forEach((_, id) => levelOf(id));
  return levels;
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  level: number;
}

export interface LayoutResult {
  positions: Map<string, LayoutNode>;
  width: number;
  height: number;
}

export interface LayoutOptions {
  colGap: number;
  rowGap: number;
  paddingX: number;
  paddingY: number;
}

const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  colGap: 350,
  rowGap: 110,
  paddingX: 140,
  paddingY: 80,
};

/**
 * Places nodes into columns by level, then orders each column by the
 * average x-index of its parents in the previous column (a simple
 * barycenter pass) to keep lines reasonably untangled.
 */
export function layoutGraph(
  index: GraphIndex,
  options: Partial<LayoutOptions> = {},
): LayoutResult {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const levels = computeLevels(index);
  const maxLevel = Math.max(0, ...Array.from(levels.values()));

  const columns: string[][] = Array.from({ length: maxLevel + 1 }, () => []);
  levels.forEach((lvl, id) => columns[lvl].push(id));

  for (let c = 1; c <= maxLevel; c++) {
    const prevIndex = new Map(columns[c - 1].map((id, i) => [id, i]));
    const avg = (ids: string[]) =>
      ids.length === 0
        ? 0
        : ids.reduce((sum, id) => sum + (prevIndex.get(id) ?? 0), 0) /
          ids.length;
    columns[c].sort(
      (a, b) =>
        avg(index.backward.get(a) ?? []) - avg(index.backward.get(b) ?? []),
    );
  }

  const maxRows = Math.max(1, ...columns.map((c) => c.length));
  const positions = new Map<string, LayoutNode>();

  columns.forEach((col, c) => {
    const colHeight = (col.length - 1) * opts.rowGap;
    const totalHeight = (maxRows - 1) * opts.rowGap;
    const startY = opts.paddingY + (totalHeight - colHeight) / 2;
    col.forEach((id, i) => {
      positions.set(id, {
        id,
        level: c,
        x: opts.paddingX + c * opts.colGap,
        y: startY + i * opts.rowGap,
      });
    });
  });

  return {
    positions,
    width: opts.paddingX * 2 + maxLevel * opts.colGap,
    height: opts.paddingY * 2 + (maxRows - 1) * opts.rowGap,
  };
}

export type PathResult =
  | { status: "not-found" }
  | {
      status: "found";
      /** ordered from the earlier exercise to the later one, regardless of click order */
      orderedIds: string[];
      relevant: Set<string>;
      edges: Array<[string, string]>;
    };

function collectReachable(
  index: GraphIndex,
  startId: string,
  direction: "forward" | "backward",
): Set<string> {
  const map = direction === "forward" ? index.forward : index.backward;
  const visited = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of map.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

/** Every exercise required (directly or transitively) to reach `id`, including `id` itself. */
export function getAncestors(index: GraphIndex, id: string): Set<string> {
  return collectReachable(index, id, "backward");
}

/** Every exercise `id` eventually progresses into, including `id` itself. */
export function getDescendants(index: GraphIndex, id: string): Set<string> {
  return collectReachable(index, id, "forward");
}

/** All progressions edges whose endpoints are both inside `nodeSet`. */
export function edgesWithinSet(
  index: GraphIndex,
  nodeSet: Set<string>,
): Array<[string, string]> {
  const edges: Array<[string, string]> = [];
  nodeSet.forEach((id) => {
    (index.forward.get(id) ?? []).forEach((next) => {
      if (nodeSet.has(next)) edges.push([id, next]);
    });
  });
  return edges;
}

/**
 * Finds every exercise that sits on *some* path between the two chosen
 * exercises (not just one shortest path), so branching progressions like
 * "weighted pullups" AND "assisted one arm pullups" both show up when
 * connecting rows -> one arm pullups.
 */
export function findConnectingPath(
  index: GraphIndex,
  aId: string,
  bId: string,
): PathResult {
  if (aId === bId || !index.byId.has(aId) || !index.byId.has(bId)) {
    return { status: "not-found" };
  }

  const descendantsOfA = collectReachable(index, aId, "forward");
  let relevant: Set<string> | null = null;

  if (descendantsOfA.has(bId)) {
    const ancestorsOfB = collectReachable(index, bId, "backward");
    relevant = new Set(
      [...descendantsOfA].filter((id) => ancestorsOfB.has(id)),
    );
  } else {
    const descendantsOfB = collectReachable(index, bId, "forward");
    if (descendantsOfB.has(aId)) {
      const ancestorsOfA = collectReachable(index, aId, "backward");
      relevant = new Set(
        [...descendantsOfB].filter((id) => ancestorsOfA.has(id)),
      );
    }
  }

  if (!relevant) return { status: "not-found" };

  const levels = computeLevels(index);
  const orderedIds = [...relevant].sort(
    (x, y) => levels.get(x)! - levels.get(y)!,
  );

  return {
    status: "found",
    orderedIds,
    relevant,
    edges: edgesWithinSet(index, relevant),
  };
}
