import type {
  NodeData,
  DumpData,
  AIServiceStatus,
} from '@/types/graph';
import { ollamaGenerate, ollamaHealthCheck } from './ollamaClient';
import type { OllamaMetrics, OnStreamProgress } from './ollamaClient';
import { promptA_TopicHierarchy } from './prompts';
import { parseTopicResponse } from './schemas';
import { fallbackExtract } from './fallback';

const MIN_INPUT_LENGTH = 5;
const MAX_INPUT_LENGTH = 3000;

/** Result from Phase 1 only — nodes + dump, no connections yet */
export interface Phase1Result {
  nodes: NodeData[];
  dump: DumpData;
  aiStatus: 'success' | 'fallback' | 'error';
  errorMessage?: string;
  entitiesMs: number;
  promptMetrics?: OllamaMetrics;
}

export type StatusCallback = (status: AIServiceStatus) => void;

function logPromptMetrics(name: string, metrics: OllamaMetrics) {
  console.log(
    `%c[AI] ${name}%c  ${metrics.evalTokens} tokens  ${metrics.tokensPerSec.toFixed(1)} tok/s  TTFT ${metrics.timeToFirstTokenMs.toFixed(0)}ms  eval ${(metrics.evalDurationMs / 1000).toFixed(1)}s  total ${(metrics.totalDurationMs / 1000).toFixed(1)}s  prompt ${metrics.promptTokens} tokens`,
    'color: #A8C5D1; font-weight: bold',
    'color: inherit',
  );
}

export async function extractTopics(
  text: string,
  onStatus?: StatusCallback,
  onProgress?: OnStreamProgress,
): Promise<Phase1Result | null> {
  const trimmed = text.trim();
  if (trimmed.length < MIN_INPUT_LENGTH) return null;

  const input = trimmed.length > MAX_INPUT_LENGTH
    ? trimmed.slice(0, MAX_INPUT_LENGTH)
    : trimmed;

  const dumpId = crypto.randomUUID();
  const now = Date.now();
  const dump: DumpData = { id: dumpId, text: input, createdAt: now };

  // Health check
  onStatus?.('checking');
  const isHealthy = await ollamaHealthCheck();
  if (!isHealthy) {
    onStatus?.('unavailable');
    const fb = fallbackExtract(input, dumpId);
    return { nodes: fb, dump, aiStatus: 'fallback', errorMessage: 'Ollama unavailable', entitiesMs: 0 };
  }

  // Prompt A: Topic Hierarchy
  onStatus?.('extracting-topics');
  const entitiesStart = Date.now();

  try {
    const { text: raw, metrics } = await ollamaGenerate(
      promptA_TopicHierarchy(input),
      onProgress,
    );
    logPromptMetrics('Prompt A (Topics)', metrics);

    const { topics } = parseTopicResponse(raw);
    const entitiesMs = Date.now() - entitiesStart;

    // Layout: umbrellas in a ring, subnodes near their parent
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    const umbrellas = topics.filter((t) => t.kind === 'umbrella');
    const subnodes = topics.filter((t) => t.kind === 'subnode');

    const umbrellaAngleStep = (2 * Math.PI) / Math.max(umbrellas.length, 1);
    const umbrellaRadius = Math.min(250, 80 * umbrellas.length);

    const nodes: NodeData[] = umbrellas.map((t, i) => ({
      id: crypto.randomUUID(),
      label: t.label,
      kind: 'umbrella' as const,
      category: t.category,
      parentIds: [],
      pageId: null,
      x: cx + umbrellaRadius * Math.cos(umbrellaAngleStep * i - Math.PI / 2),
      y: cy + umbrellaRadius * Math.sin(umbrellaAngleStep * i - Math.PI / 2),
      createdFromDumpId: dumpId,
      createdAt: now,
      updatedAt: now,
    }));

    const labelToId = new Map(nodes.map((n) => [n.label.toLowerCase(), n.id]));

    for (const sub of subnodes) {
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
        createdFromDumpId: dumpId,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (umbrellas.length === 0 && subnodes.length === 0) {
      const nodeCount = topics.length;
      const radius = Math.min(200, 60 * nodeCount);
      const angleStep = (2 * Math.PI) / nodeCount;

      for (let i = 0; i < topics.length; i++) {
        const t = topics[i];
        const nodeId = crypto.randomUUID();
        nodes.push({
          id: nodeId,
          label: t.label,
          kind: t.kind,
          category: t.category,
          parentIds: [],
          pageId: null,
          x: cx + radius * Math.cos(angleStep * i - Math.PI / 2),
          y: cy + radius * Math.sin(angleStep * i - Math.PI / 2),
          createdFromDumpId: dumpId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { nodes, dump, aiStatus: 'success', entitiesMs, promptMetrics: metrics };
  } catch (err) {
    console.warn('[AI] Prompt A failed, using fallback:', err);
    onStatus?.('error');
    const entitiesMs = Date.now() - entitiesStart;
    return {
      nodes: fallbackExtract(input, dumpId),
      dump,
      aiStatus: 'fallback',
      errorMessage: `Topic extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      entitiesMs,
    };
  }
}
