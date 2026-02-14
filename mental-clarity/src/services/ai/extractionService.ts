import type {
  NodeData,
  ConnectionData,
  ExtractionResult,
  AIServiceStatus,
  AIRunMeta,
} from '@/types/graph';
import { ollamaGenerate, ollamaHealthCheck } from './ollamaClient';
import { promptA_TopicHierarchy, promptC_Relationships } from './prompts';
import { parseTopicResponse, parseRelationshipResponse } from './schemas';
import { fallbackExtract } from './fallback';
import { getCached, setCache } from './cache';

const MIN_INPUT_LENGTH = 5;
const MAX_INPUT_LENGTH = 3000;

export type StatusCallback = (status: AIServiceStatus) => void;

export interface ExtractionResultWithMeta extends ExtractionResult {
  meta: AIRunMeta;
  aiStatus: 'success' | 'fallback' | 'error';
  errorMessage?: string;
  startedAt: number;
  finishedAt: number;
}

export async function extractKnowledgeGraph(
  text: string,
  onStatus?: StatusCallback,
): Promise<ExtractionResultWithMeta> {
  const startedAt = Date.now();

  // ── Input validation ──
  const trimmed = text.trim();
  if (trimmed.length < MIN_INPUT_LENGTH) {
    const result = singleNodeResult(trimmed);
    const finishedAt = Date.now();
    return {
      ...result,
      meta: { timings: { entitiesMs: 0, relationshipsMs: 0 }, graphDensity: 0, avgStrength: 0 },
      aiStatus: 'success',
      startedAt,
      finishedAt,
    };
  }

  const input = trimmed.length > MAX_INPUT_LENGTH
    ? trimmed.slice(0, MAX_INPUT_LENGTH)
    : trimmed;

  // ── Cache check ──
  const cached = getCached(input);
  if (cached) {
    const finishedAt = Date.now();
    return {
      ...cached,
      meta: { timings: { entitiesMs: 0, relationshipsMs: 0 }, graphDensity: 0, avgStrength: 0 },
      aiStatus: 'success',
      startedAt,
      finishedAt,
    };
  }

  // ── Health check ──
  onStatus?.('checking');
  const isHealthy = await ollamaHealthCheck();
  if (!isHealthy) {
    onStatus?.('unavailable');
    const fallback = fallbackExtract(input);
    const finishedAt = Date.now();
    return {
      ...fallback,
      meta: computeMeta({ entitiesMs: 0, relationshipsMs: 0 }, fallback.nodes, fallback.connections),
      aiStatus: 'fallback',
      errorMessage: 'Ollama unavailable',
      startedAt,
      finishedAt,
    };
  }

  // ── Stage 1: Topic/Entity extraction (Prompt A) ──
  onStatus?.('extracting-topics');
  const entitiesStart = Date.now();
  let topics;
  try {
    const entityRaw = await ollamaGenerate(promptA_TopicHierarchy(input));
    topics = parseTopicResponse(entityRaw);
  } catch (err) {
    console.warn('[AI] Topic extraction failed, using fallback:', err);
    onStatus?.('error');
    const fallback = fallbackExtract(input);
    const finishedAt = Date.now();
    return {
      ...fallback,
      meta: computeMeta({ entitiesMs: finishedAt - entitiesStart, relationshipsMs: 0 }, fallback.nodes, fallback.connections),
      aiStatus: 'fallback',
      errorMessage: `Topic extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      startedAt,
      finishedAt,
    };
  }
  const entitiesMs = Date.now() - entitiesStart;

  // ── Stage 2: Relationship extraction (Prompt C) ──
  onStatus?.('extracting-relationships');
  const relationshipsStart = Date.now();
  const entityLabels = topics.topics.map((t) => t.label);
  let relationships;
  try {
    const relRaw = await ollamaGenerate(
      promptC_Relationships(
        input,
        entityLabels.map((label, i) => ({ id: `node-${i}`, label })),
      ),
    );
    relationships = parseRelationshipResponse(relRaw, entityLabels);
  } catch (err) {
    console.warn('[AI] Relationship extraction failed (topics still OK):', err);
    relationships = { relationships: [] };
  }
  const relationshipsMs = Date.now() - relationshipsStart;

  // ── Build result ──
  const now = Date.now();
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  // Separate umbrellas and subnodes
  const umbrellaTopics = topics.topics.filter((t) => t.kind === 'umbrella');
  const subnodeTopics = topics.topics.filter((t) => t.kind === 'subnode');

  // Position umbrellas in a ring
  const umbrellaAngleStep = (2 * Math.PI) / Math.max(umbrellaTopics.length, 1);
  const umbrellaRadius = Math.min(250, 80 * umbrellaTopics.length);

  const nodes: NodeData[] = [];

  // Create umbrella nodes
  for (let i = 0; i < umbrellaTopics.length; i++) {
    const t = umbrellaTopics[i];
    nodes.push({
      id: crypto.randomUUID(),
      label: t.label,
      kind: 'umbrella',
      category: t.category,
      parentIds: [],
      pageId: null,
      x: cx + umbrellaRadius * Math.cos(umbrellaAngleStep * i - Math.PI / 2),
      y: cy + umbrellaRadius * Math.sin(umbrellaAngleStep * i - Math.PI / 2),
      createdAt: now,
      updatedAt: now,
    });
  }

  // Build label → id map for parent resolution
  const labelToId = new Map(nodes.map((n) => [n.label.toLowerCase(), n.id]));

  // Create subnode nodes positioned near their parent
  for (const sub of subnodeTopics) {
    const parentId = sub.parentLabel
      ? labelToId.get(sub.parentLabel.toLowerCase())
      : undefined;
    const parent = parentId
      ? nodes.find((n) => n.id === parentId)
      : undefined;

    const baseX = parent ? parent.x : cx;
    const baseY = parent ? parent.y : cy;

    const nodeId = crypto.randomUUID();
    labelToId.set(sub.label.toLowerCase(), nodeId);

    nodes.push({
      id: nodeId,
      label: sub.label,
      kind: 'subnode',
      category: sub.category,
      parentIds: parentId ? [parentId] : [],
      pageId: null,
      x: baseX + (Math.random() - 0.5) * 160,
      y: baseY + (Math.random() - 0.5) * 160,
      createdAt: now,
      updatedAt: now,
    });
  }

  // If no umbrella/subnode distinction was made, fall back to flat circle layout
  if (umbrellaTopics.length === 0 && subnodeTopics.length === 0) {
    const flatTopics = topics.topics;
    const nodeCount = flatTopics.length;
    const radius = Math.min(200, 60 * nodeCount);
    const angleStep = (2 * Math.PI) / nodeCount;

    for (let i = 0; i < flatTopics.length; i++) {
      const t = flatTopics[i];
      const nodeId = crypto.randomUUID();
      labelToId.set(t.label.toLowerCase(), nodeId);
      nodes.push({
        id: nodeId,
        label: t.label,
        kind: t.kind,
        category: t.category,
        parentIds: [],
        pageId: null,
        x: cx + radius * Math.cos(angleStep * i - Math.PI / 2),
        y: cy + radius * Math.sin(angleStep * i - Math.PI / 2),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Map entity labels to node IDs for connections
  const connections: ConnectionData[] = [];
  for (const rel of relationships.relationships) {
    const sourceId = labelToId.get(rel.sourceLabel.toLowerCase());
    const targetId = labelToId.get(rel.targetLabel.toLowerCase());
    if (!sourceId || !targetId) continue;
    connections.push({
      id: crypto.randomUUID(),
      sourceId,
      targetId,
      label: rel.label,
      type: rel.type,
      strength: rel.strength,
      createdAt: now,
    });
  }

  const result: ExtractionResult = { nodes, connections, rawText: input };
  setCache(input, result);
  onStatus?.('idle');

  const finishedAt = Date.now();
  return {
    ...result,
    meta: computeMeta({ entitiesMs, relationshipsMs }, nodes, connections),
    aiStatus: 'success',
    startedAt,
    finishedAt,
  };
}

function computeMeta(
  timings: { entitiesMs: number; hierarchyMs?: number; relationshipsMs: number },
  nodes: NodeData[],
  connections: ConnectionData[],
): AIRunMeta {
  const graphDensity = connections.length / Math.max(nodes.length, 1);
  const avgStrength = connections.length > 0
    ? connections.reduce((sum, c) => sum + c.strength, 0) / connections.length
    : 0;

  return {
    timings,
    graphDensity: Math.round(graphDensity * 100) / 100,
    avgStrength: Math.round(avgStrength * 100) / 100,
  };
}

function singleNodeResult(text: string): ExtractionResult {
  const now = Date.now();
  return {
    nodes: [{
      id: crypto.randomUUID(),
      label: text.slice(0, 50),
      kind: 'subnode',
      category: 'personal',
      parentIds: [],
      pageId: null,
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 200,
      createdAt: now,
      updatedAt: now,
    }],
    connections: [],
    rawText: text,
  };
}
