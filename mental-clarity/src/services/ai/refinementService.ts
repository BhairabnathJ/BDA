import type {
  NodeData,
  ConnectionData,
  PageData,
  PageContext,
  ExtractedTask,
} from '@/types/graph';
import { ollamaGenerate } from './ollamaClient';
import type { OllamaMetrics } from './ollamaClient';
import { promptB_NodeMatching, promptC_Relationships, promptD_Tasks } from './prompts';
import { parseNodeMatchResponse, parseRelationshipResponse, parseTaskResponse } from './schemas';
import type { StatusCallback } from './extractionService';

export interface RefinementResult {
  nodeUpdates: Map<string, Partial<NodeData>>;
  connections: ConnectionData[];
  pages: PageData[];
  tasks: ExtractedTask[];
  merges: Map<string, string>;
  timings: { matchingMs: number; relationshipsMs: number; tasksMs: number };
  promptMetrics: {
    promptB?: OllamaMetrics;
    promptC?: OllamaMetrics;
    promptD?: OllamaMetrics;
  };
}

function logPromptMetrics(name: string, metrics: OllamaMetrics) {
  console.log(
    `%c[AI] ${name}%c  ${metrics.evalTokens} tokens  ${metrics.tokensPerSec.toFixed(1)} tok/s  TTFT ${metrics.timeToFirstTokenMs.toFixed(0)}ms  eval ${(metrics.evalDurationMs / 1000).toFixed(1)}s  total ${(metrics.totalDurationMs / 1000).toFixed(1)}s  prompt ${metrics.promptTokens} tokens`,
    'color: #A8C5D1; font-weight: bold',
    'color: inherit',
  );
}

export async function refineGraph(
  dumpText: string,
  dumpId: string,
  newNodes: NodeData[],
  existingNodes: NodeData[],
  onStatus?: StatusCallback,
): Promise<RefinementResult> {
  const result: RefinementResult = {
    nodeUpdates: new Map(),
    connections: [],
    pages: [],
    tasks: [],
    merges: new Map(),
    timings: { matchingMs: 0, relationshipsMs: 0, tasksMs: 0 },
    promptMetrics: {},
  };

  const allNodes = [...existingNodes, ...newNodes];
  const now = Date.now();

  const matchingStart = Date.now();
  const [matchResult, connResult, taskResult] = await Promise.allSettled([
    // Prompt B: Node Matching
    (async () => {
      onStatus?.('refining-hierarchy');
      const existingSlim = existingNodes.map((n) => ({
        id: n.id,
        label: n.label,
        kind: n.kind ?? 'subnode',
      }));
      const newSlim = newNodes.map((n) => ({
        label: n.label,
        kind: n.kind ?? 'subnode',
      }));
      const { text: raw, metrics } = await ollamaGenerate(
        promptB_NodeMatching(dumpText, newSlim, existingSlim),
      );
      logPromptMetrics('Prompt B (Matching)', metrics);
      result.promptMetrics.promptB = metrics;
      return parseNodeMatchResponse(raw);
    })(),

    // Prompt C: Relationships
    (async () => {
      onStatus?.('finding-connections');
      const nodeSlim = allNodes.map((n) => ({ id: n.id, label: n.label }));
      const { text: raw, metrics } = await ollamaGenerate(
        promptC_Relationships(dumpText, nodeSlim),
      );
      logPromptMetrics('Prompt C (Relationships)', metrics);
      result.promptMetrics.promptC = metrics;
      return parseRelationshipResponse(
        raw,
        allNodes.map((n) => n.label),
      );
    })(),

    // Prompt D: Task Extraction
    (async () => {
      onStatus?.('extracting-tasks');
      const topicLabels = allNodes.map((n) => n.label);
      const { text: raw, metrics } = await ollamaGenerate(
        promptD_Tasks(dumpText, topicLabels),
      );
      logPromptMetrics('Prompt D (Tasks)', metrics);
      result.promptMetrics.promptD = metrics;
      return parseTaskResponse(raw);
    })(),
  ]);

  // Process Prompt B results
  if (matchResult.status === 'fulfilled') {
    result.timings.matchingMs = Date.now() - matchingStart;
    const { topics } = matchResult.value;

    for (const t of topics) {
      const node = newNodes.find(
        (n) => n.label.toLowerCase() === t.label.toLowerCase(),
      );
      if (!node) continue;

      if (t.match && t.match.similarity >= 0.75) {
        result.merges.set(node.id, t.match.existingNodeId);
      }

      if (t.parents.length > 0) {
        const parentIds = t.parents
          .map((p) => p.parentId)
          .filter((pid) => allNodes.some((n) => n.id === pid));

        if (parentIds.length > 0) {
          result.nodeUpdates.set(node.id, { parentIds });
        }

        const pageId = crypto.randomUUID();
        const contexts: PageContext[] = t.parents.map((p) => {
          const parentNode = allNodes.find((n) => n.id === p.parentId);
          return {
            parentId: p.parentId,
            parentName: parentNode?.label ?? 'Unknown',
            segments: [
              {
                text: p.contextSegment,
                timestamp: now,
                dumpId,
              },
            ],
          };
        });

        result.pages.push({
          id: pageId,
          title: node.label,
          content: '',
          contexts,
          createdAt: now,
          updatedAt: now,
        });

        result.nodeUpdates.set(node.id, {
          ...(result.nodeUpdates.get(node.id) ?? {}),
          pageId,
        });
      }
    }
  } else {
    console.warn('[AI] Prompt B failed:', matchResult.reason);
  }

  // Process Prompt C results
  if (connResult.status === 'fulfilled') {
    result.timings.relationshipsMs = Date.now() - matchingStart;
    const labelToId = new Map(
      allNodes.map((n) => [n.label.toLowerCase(), n.id]),
    );

    const conns: ConnectionData[] = [];
    for (const rel of connResult.value.relationships) {
      const srcId = labelToId.get(rel.sourceLabel.toLowerCase());
      const tgtId = labelToId.get(rel.targetLabel.toLowerCase());
      if (!srcId || !tgtId) continue;
      conns.push({
        id: crypto.randomUUID(),
        sourceId: srcId,
        targetId: tgtId,
        label: rel.label,
        type: rel.type,
        strength: rel.strength,
        createdAt: now,
      });
    }
    result.connections = conns;
  } else {
    console.warn('[AI] Prompt C failed:', connResult.reason);
  }

  // Process Prompt D results
  if (taskResult.status === 'fulfilled') {
    result.timings.tasksMs = Date.now() - matchingStart;
    result.tasks = taskResult.value.tasks;
  } else {
    console.warn('[AI] Prompt D failed:', taskResult.reason);
  }

  return result;
}
