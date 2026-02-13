import type {
  NodeData,
  ConnectionData,
  ExtractionResult,
  AIServiceStatus,
} from '@/types/graph';
import { ollamaGenerate, ollamaHealthCheck } from './ollamaClient';
import { buildEntityPrompt, buildRelationshipPrompt } from './prompts';
import { parseEntityResponse, parseRelationshipResponse } from './schemas';
import { fallbackExtract } from './fallback';
import { getCached, setCache } from './cache';

const MIN_INPUT_LENGTH = 5;
const MAX_INPUT_LENGTH = 3000;

export type StatusCallback = (status: AIServiceStatus) => void;

export async function extractKnowledgeGraph(
  text: string,
  onStatus?: StatusCallback,
): Promise<ExtractionResult> {
  // ── Input validation ──
  const trimmed = text.trim();
  if (trimmed.length < MIN_INPUT_LENGTH) {
    // Too short for AI — create a single node
    return singleNodeResult(trimmed);
  }

  const input = trimmed.length > MAX_INPUT_LENGTH
    ? trimmed.slice(0, MAX_INPUT_LENGTH)
    : trimmed;

  // ── Cache check ──
  const cached = getCached(input);
  if (cached) return cached;

  // ── Health check ──
  onStatus?.('checking');
  const isHealthy = await ollamaHealthCheck();
  if (!isHealthy) {
    onStatus?.('unavailable');
    return fallbackExtract(input);
  }

  // ── Stage 1: Entity extraction ──
  onStatus?.('extracting-entities');
  let entities;
  try {
    const entityRaw = await ollamaGenerate(buildEntityPrompt(input));
    entities = parseEntityResponse(entityRaw);
  } catch (err) {
    console.warn('[AI] Entity extraction failed, using fallback:', err);
    onStatus?.('error');
    return fallbackExtract(input);
  }

  // ── Stage 2: Relationship extraction ──
  onStatus?.('extracting-relationships');
  const entityLabels = entities.entities.map((e) => e.label);
  let relationships;
  try {
    const relRaw = await ollamaGenerate(
      buildRelationshipPrompt(input, entityLabels),
    );
    relationships = parseRelationshipResponse(relRaw, entityLabels);
  } catch (err) {
    console.warn('[AI] Relationship extraction failed (entities still OK):', err);
    relationships = { relationships: [] };
  }

  // ── Build result ──
  const now = Date.now();
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  // Position nodes in a circle layout around center
  const nodeCount = entities.entities.length;
  const radius = Math.min(200, 60 * nodeCount);
  const angleStep = (2 * Math.PI) / nodeCount;

  const nodes: NodeData[] = entities.entities.map((entity, i) => ({
    id: crypto.randomUUID(),
    label: entity.label,
    category: entity.category,
    x: cx + radius * Math.cos(angleStep * i - Math.PI / 2),
    y: cy + radius * Math.sin(angleStep * i - Math.PI / 2),
    createdAt: now,
    updatedAt: now,
  }));

  // Map entity labels to node IDs for connections
  const labelToId = new Map(nodes.map((n) => [n.label.toLowerCase(), n.id]));

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
  return result;
}

function singleNodeResult(text: string): ExtractionResult {
  const now = Date.now();
  return {
    nodes: [{
      id: crypto.randomUUID(),
      label: text.slice(0, 50),
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 200,
      createdAt: now,
      updatedAt: now,
    }],
    connections: [],
    rawText: text,
  };
}
