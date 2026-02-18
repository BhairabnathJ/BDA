type NodeCategory = 'organic' | 'technical' | 'creative' | 'learning' | 'personal' | string;

interface WorkerNode {
  id: string;
  x: number;
  y: number;
  radius?: number;
  category?: NodeCategory;
  kind?: string;
  parentIds?: string[];
  pinned?: boolean;
}

interface WorkerEdge {
  sourceId: string;
  targetId: string;
  strength?: number;
}

interface LayoutConfig {
  nodeRadius: number;
  repulsionStrength: number;
  attractionStrength: number;
  centerGravity: number;
  iterations: number;
  initialSpread: number;
}

interface LayoutRequest {
  requestId: number;
  width: number;
  height: number;
  reset: boolean;
  newNodeIds: string[];
  movableNodeIds: string[];
  nodes: WorkerNode[];
  edges: WorkerEdge[];
  config: LayoutConfig;
}

interface LayoutResponse {
  requestId: number;
  positions: Array<{ id: string; x: number; y: number }>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function hashFloat(seed: string, salt = 0): number {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function categoryAnchor(category: NodeCategory | undefined, width: number, height: number): { x: number; y: number } {
  const centerX = width * 0.5;
  const centerY = height * 0.5;

  switch ((category ?? '').toLowerCase()) {
    case 'technical':
      return { x: width * 0.28, y: centerY };
    case 'learning':
      return { x: width * 0.72, y: centerY };
    case 'personal':
    case 'organic':
      return { x: centerX, y: height * 0.74 };
    case 'creative':
      return { x: centerX, y: height * 0.26 };
    default:
      return { x: centerX, y: centerY };
  }
}

function buildNeighborStrength(edges: WorkerEdge[]): Map<string, Map<string, number>> {
  const graph = new Map<string, Map<string, number>>();
  for (const edge of edges) {
    const strength = clamp(finiteOr(edge.strength ?? 0.6, 0.6), 0.1, 1);

    const sourceMap = graph.get(edge.sourceId) ?? new Map<string, number>();
    sourceMap.set(edge.targetId, (sourceMap.get(edge.targetId) ?? 0) + strength);
    graph.set(edge.sourceId, sourceMap);

    const targetMap = graph.get(edge.targetId) ?? new Map<string, number>();
    targetMap.set(edge.sourceId, (targetMap.get(edge.sourceId) ?? 0) + strength);
    graph.set(edge.targetId, targetMap);
  }
  return graph;
}

function computeClusterKeys(
  nodes: WorkerNode[],
  edges: WorkerEdge[],
): Map<string, string> {
  const umbrellaIds = nodes
    .filter((node) => node.kind === 'umbrella')
    .map((node) => node.id);
  const umbrellaSet = new Set(umbrellaIds);
  const neighborStrength = buildNeighborStrength(edges);
  const clusterByNode = new Map<string, string>();

  for (const node of nodes) {
    if (node.kind === 'umbrella') {
      clusterByNode.set(node.id, node.id);
      continue;
    }

    const parentCandidates = (node.parentIds ?? []).filter((id) => umbrellaSet.has(id));
    let strongestParent: string | null = null;
    let strongestScore = -1;
    const scores = neighborStrength.get(node.id) ?? new Map<string, number>();

    for (const parentId of parentCandidates) {
      const score = scores.get(parentId) ?? 0;
      if (score > strongestScore) {
        strongestParent = parentId;
        strongestScore = score;
      }
    }

    if (!strongestParent) {
      for (const [neighborId, score] of scores.entries()) {
        if (!umbrellaSet.has(neighborId)) continue;
        if (score > strongestScore) {
          strongestParent = neighborId;
          strongestScore = score;
        }
      }
    }

    if (strongestParent) {
      clusterByNode.set(node.id, strongestParent);
      continue;
    }

    const categoryKey = `category:${(node.category ?? 'misc').toLowerCase()}`;
    clusterByNode.set(node.id, categoryKey);
  }

  return clusterByNode;
}

function buildClusterAnchors(
  clusterByNode: Map<string, string>,
  nodes: WorkerNode[],
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const anchorByCluster = new Map<string, { x: number; y: number }>();
  const clusterEntries = new Set(clusterByNode.values());

  const umbrellaClusters = [...clusterEntries].filter((key) => !key.startsWith('category:')).sort();
  const categoryClusters = [...clusterEntries].filter((key) => key.startsWith('category:')).sort();

  const umbrellaRadius = clamp(Math.min(width, height) * 0.32, 180, 420);
  for (let index = 0; index < umbrellaClusters.length; index += 1) {
    const key = umbrellaClusters[index];
    const angle = (index / Math.max(umbrellaClusters.length, 1)) * Math.PI * 2 - Math.PI / 2;
    anchorByCluster.set(key, {
      x: centerX + Math.cos(angle) * umbrellaRadius,
      y: centerY + Math.sin(angle) * umbrellaRadius,
    });
  }

  for (const key of categoryClusters) {
    const node = nodes.find((candidate) => clusterByNode.get(candidate.id) === key);
    anchorByCluster.set(key, categoryAnchor(node?.category, width, height));
  }

  return anchorByCluster;
}

function gridKey(x: number, y: number, cellSize: number): string {
  const gx = Math.floor(x / cellSize);
  const gy = Math.floor(y / cellSize);
  return `${gx}:${gy}`;
}

function buildSpatialGrid(xs: number[], ys: number[], cellSize: number): Map<string, number[]> {
  const grid = new Map<string, number[]>();
  for (let i = 0; i < xs.length; i++) {
    const key = gridKey(xs[i], ys[i], cellSize);
    const bucket = grid.get(key);
    if (bucket) {
      bucket.push(i);
    } else {
      grid.set(key, [i]);
    }
  }
  return grid;
}

function initializePositions(
  req: LayoutRequest,
  degree: Map<string, number>,
  neighbors: Map<string, string[]>,
  indexById: Map<string, number>,
  clusterByNode: Map<string, string>,
  anchorByCluster: Map<string, { x: number; y: number }>,
  ids: string[],
  canMove: boolean[],
  xs: number[],
  ys: number[],
): void {
  const centerX = req.width * 0.5;
  const centerY = req.height * 0.5;
  const newSet = new Set(req.newNodeIds);
  const hubs = ids.filter((id) => (degree.get(id) ?? 0) >= 3);
  const hubSet = new Set(hubs);
  const hubIndex = new Map(hubs.map((id, index) => [id, index]));

  const shouldSeed = (node: WorkerNode, index: number): boolean =>
    canMove[index] && (req.reset || newSet.has(node.id) || !Number.isFinite(node.x) || !Number.isFinite(node.y));

  for (let i = 0; i < req.nodes.length; i++) {
    const node = req.nodes[i];
    const clusterKey = clusterByNode.get(node.id);
    const fallbackAnchor = clusterKey
      ? anchorByCluster.get(clusterKey) ?? categoryAnchor(node.category, req.width, req.height)
      : categoryAnchor(node.category, req.width, req.height);
    const safeX = finiteOr(node.x, fallbackAnchor.x);
    const safeY = finiteOr(node.y, fallbackAnchor.y);

    if (!canMove[i]) {
      xs[i] = safeX;
      ys[i] = safeY;
      continue;
    }

    if (!shouldSeed(node, i)) {
      xs[i] = safeX;
      ys[i] = safeY;
      continue;
    }

    const r1 = hashFloat(node.id, 17);
    const r2 = hashFloat(node.id, 29);
    const angle = r1 * Math.PI * 2;
    const anchor = fallbackAnchor;
    const spread = req.config.initialSpread;

    if (hubSet.has(node.id)) {
      const index = hubIndex.get(node.id) ?? 0;
      const hubAngle = (index / Math.max(hubs.length, 1)) * Math.PI * 2;
      xs[i] = centerX + Math.cos(hubAngle) * 120;
      ys[i] = centerY + Math.sin(hubAngle) * 120;
      continue;
    }

    const nodeNeighbors = neighbors.get(node.id) ?? [];
    const hubNeighbor = nodeNeighbors.find((neighbor) => hubSet.has(neighbor));
    if (hubNeighbor) {
      const hubNodeIndex = indexById.get(hubNeighbor) ?? -1;
      const hubX = hubNodeIndex >= 0 ? xs[hubNodeIndex] : centerX;
      const hubY = hubNodeIndex >= 0 ? ys[hubNodeIndex] : centerY;
      const ringRadius = 150 + r2 * 180;
      xs[i] = hubX + Math.cos(angle) * ringRadius;
      ys[i] = hubY + Math.sin(angle) * ringRadius;
      continue;
    }

    const radial = spread * (0.18 + 0.22 * r2);
    xs[i] = anchor.x + Math.cos(angle) * radial;
    ys[i] = anchor.y + Math.sin(angle) * radial;
  }
}

function resolveCollisions(
  xs: number[],
  ys: number[],
  radii: number[],
  canMove: boolean[],
  cellSize: number,
  padding = 8,
): boolean {
  const grid = buildSpatialGrid(xs, ys, cellSize);
  let hadOverlap = false;

  for (let i = 0; i < xs.length; i++) {
    const gx = Math.floor(xs[i] / cellSize);
    const gy = Math.floor(ys[i] / cellSize);

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const bucket = grid.get(`${gx + ox}:${gy + oy}`);
        if (!bucket) continue;

        for (const j of bucket) {
          if (j <= i) continue;

          const dx = xs[j] - xs[i];
          const dy = ys[j] - ys[i];
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const minDistance = radii[i] + radii[j] + padding;

          if (distance >= minDistance) continue;
          hadOverlap = true;

          const overlap = minDistance - distance;
          const ux = dx / distance;
          const uy = dy / distance;
          const iCanMove = canMove[i];
          const jCanMove = canMove[j];

          if (!iCanMove && !jCanMove) continue;

          if (iCanMove && jCanMove) {
            const half = overlap * 0.5;
            xs[i] -= ux * half;
            ys[i] -= uy * half;
            xs[j] += ux * half;
            ys[j] += uy * half;
          } else if (iCanMove) {
            xs[i] -= ux * overlap;
            ys[i] -= uy * overlap;
          } else if (jCanMove) {
            xs[j] += ux * overlap;
            ys[j] += uy * overlap;
          }
        }
      }
    }
  }

  return hadOverlap;
}

function runLayout(req: LayoutRequest): LayoutResponse {
  const width = Math.max(req.width, 500);
  const height = Math.max(req.height, 400);
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const config = req.config;

  const ids = req.nodes.map((node) => node.id);
  const indexById = new Map(ids.map((id, index) => [id, index]));
  const clusterByNode = computeClusterKeys(req.nodes, req.edges);
  const anchorByCluster = buildClusterAnchors(clusterByNode, req.nodes, width, height);

  const degree = new Map<string, number>();
  const neighbors = new Map<string, string[]>();
  for (const edge of req.edges) {
    degree.set(edge.sourceId, (degree.get(edge.sourceId) ?? 0) + 1);
    degree.set(edge.targetId, (degree.get(edge.targetId) ?? 0) + 1);

    const sourceNeighbors = neighbors.get(edge.sourceId) ?? [];
    sourceNeighbors.push(edge.targetId);
    neighbors.set(edge.sourceId, sourceNeighbors);

    const targetNeighbors = neighbors.get(edge.targetId) ?? [];
    targetNeighbors.push(edge.sourceId);
    neighbors.set(edge.targetId, targetNeighbors);
  }

  const movableSet = req.reset
    ? null
    : new Set<string>([...req.newNodeIds, ...req.movableNodeIds]);

  const canMove = req.nodes.map((node) => {
    if (node.pinned) return false;
    if (movableSet === null) return true;
    return movableSet.has(node.id);
  });

  const nodeCount = req.nodes.length;
  const xs = new Array<number>(nodeCount);
  const ys = new Array<number>(nodeCount);
  const velocitiesX = new Array<number>(nodeCount).fill(0);
  const velocitiesY = new Array<number>(nodeCount).fill(0);
  const radii = req.nodes.map((node) => clamp(finiteOr(node.radius ?? config.nodeRadius, config.nodeRadius), 18, 220));

  initializePositions(req, degree, neighbors, indexById, clusterByNode, anchorByCluster, ids, canMove, xs, ys);

  const maxRadius = Math.max(config.nodeRadius, ...radii);
  const spreadOverflow = Math.max(config.initialSpread * 0.65, 320);
  const minX = centerX - width * 0.5 - spreadOverflow;
  const maxX = centerX + width * 0.5 + spreadOverflow;
  const minY = centerY - height * 0.5 - spreadOverflow;
  const maxY = centerY + height * 0.5 + spreadOverflow;
  const cellSize = Math.max(maxRadius * 2.8, 110);
  const damping = 0.86;

  for (let iteration = 0; iteration < config.iterations; iteration++) {
    const forcesX = new Array<number>(nodeCount).fill(0);
    const forcesY = new Array<number>(nodeCount).fill(0);
    const grid = buildSpatialGrid(xs, ys, cellSize);

    for (let i = 0; i < nodeCount; i++) {
      if (!canMove[i]) continue;
      const x = xs[i];
      const y = ys[i];
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const bucket = grid.get(`${gx + ox}:${gy + oy}`);
          if (!bucket) continue;

          for (const j of bucket) {
            if (i === j) continue;
            const dx = x - xs[j];
            const dy = y - ys[j];
            const distanceSq = dx * dx + dy * dy + 0.01;
            const distance = Math.sqrt(distanceSq);
            const sameCluster = clusterByNode.get(ids[i]) === clusterByNode.get(ids[j]);
            const clusterBoost = sameCluster ? 1 : 1.35;
            const force = (config.repulsionStrength * clusterBoost) / distanceSq;
            forcesX[i] += (dx / distance) * force;
            forcesY[i] += (dy / distance) * force;
          }
        }
      }
    }

    for (const edge of req.edges) {
      const sourceIndex = indexById.get(edge.sourceId);
      const targetIndex = indexById.get(edge.targetId);
      if (sourceIndex === undefined || targetIndex === undefined) continue;

      const dx = xs[targetIndex] - xs[sourceIndex];
      const dy = ys[targetIndex] - ys[sourceIndex];
      const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const strength = clamp(finiteOr(edge.strength ?? 0.7, 0.7), 0.1, 1);
      const targetDistance = radii[sourceIndex] + radii[targetIndex] + (1 - strength) * 150;
      const sameCluster = clusterByNode.get(edge.sourceId) === clusterByNode.get(edge.targetId);
      const clusterFactor = sameCluster ? 1 : 0.58;
      const pull = (distance - targetDistance) * config.attractionStrength * (0.65 + strength) * 0.02 * clusterFactor;
      const forceX = (dx / distance) * pull;
      const forceY = (dy / distance) * pull;

      if (canMove[sourceIndex]) {
        forcesX[sourceIndex] += forceX;
        forcesY[sourceIndex] += forceY;
      }
      if (canMove[targetIndex]) {
        forcesX[targetIndex] -= forceX;
        forcesY[targetIndex] -= forceY;
      }
    }

    for (let i = 0; i < nodeCount; i++) {
      if (!canMove[i]) continue;
      const anchor = categoryAnchor(req.nodes[i].category, width, height);
      const clusterKey = clusterByNode.get(ids[i]);
      const clusterAnchor = clusterKey
        ? anchorByCluster.get(clusterKey) ?? anchor
        : anchor;
      forcesX[i] += (width * 0.5 - xs[i]) * config.centerGravity * 0.02;
      forcesY[i] += (height * 0.5 - ys[i]) * config.centerGravity * 0.02;
      forcesX[i] += (anchor.x - xs[i]) * 0.0015;
      forcesY[i] += (anchor.y - ys[i]) * 0.0015;
      forcesX[i] += (clusterAnchor.x - xs[i]) * 0.0055;
      forcesY[i] += (clusterAnchor.y - ys[i]) * 0.0055;
    }

    for (let i = 0; i < nodeCount; i++) {
      if (!canMove[i]) continue;
      velocitiesX[i] = (velocitiesX[i] + forcesX[i]) * damping;
      velocitiesY[i] = (velocitiesY[i] + forcesY[i]) * damping;
      xs[i] += velocitiesX[i];
      ys[i] += velocitiesY[i];
    }

    resolveCollisions(xs, ys, radii, canMove, cellSize);

    for (let i = 0; i < nodeCount; i++) {
      if (!canMove[i]) continue;
      const padding = radii[i] + 18;
      xs[i] = clamp(xs[i], minX + padding, maxX - padding);
      ys[i] = clamp(ys[i], minY + padding, maxY - padding);
    }
  }

  // Strict post-sweep to ensure no residual overlap remains.
  for (let sweep = 0; sweep < 24; sweep++) {
    const hadOverlap = resolveCollisions(xs, ys, radii, canMove, cellSize);

    for (let i = 0; i < nodeCount; i++) {
      if (!canMove[i]) continue;
      const padding = radii[i] + 18;
      xs[i] = clamp(xs[i], minX + padding, maxX - padding);
      ys[i] = clamp(ys[i], minY + padding, maxY - padding);
    }

    if (!hadOverlap) break;
  }

  return {
    requestId: req.requestId,
    positions: ids.map((id, index) => ({
      id,
      x: finiteOr(xs[index], centerX),
      y: finiteOr(ys[index], centerY),
    })),
  };
}

self.onmessage = (event: MessageEvent<LayoutRequest>) => {
  const request = event.data;
  const response = runLayout(request);
  self.postMessage(response);
};
