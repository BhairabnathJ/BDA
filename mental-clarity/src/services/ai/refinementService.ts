import type {
  NodeData,
  ConnectionData,
  PageData,
  PageContext,
} from '@/types/graph';
import { ollamaGenerate } from './ollamaClient';
import { promptB_NodeMatching, promptC_Relationships } from './prompts';
import { parseNodeMatchResponse, parseRelationshipResponse } from './schemas';
import type { StatusCallback } from './extractionService';

export interface RefinementResult {
  /** Nodes whose parentIds/kind changed, keyed by id */
  nodeUpdates: Map<string, Partial<NodeData>>;
  /** New connections to add */
  connections: ConnectionData[];
  /** Pages to create/update */
  pages: PageData[];
  /** Node IDs to merge (new -> existing) */
  merges: Map<string, string>;
  /** Timing for analytics */
  timings: { matchingMs: number; relationshipsMs: number };
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
    merges: new Map(),
    timings: { matchingMs: 0, relationshipsMs: 0 },
  };

  const allNodes = [...existingNodes, ...newNodes];
  const now = Date.now();

  // Run B + C in parallel
  const matchingStart = Date.now();
  const [matchResult, connResult] = await Promise.allSettled([
    // Prompt B: Node Matching + Multi-Parent
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
      const raw = await ollamaGenerate(
        promptB_NodeMatching(dumpText, newSlim, existingSlim),
      );
      return parseNodeMatchResponse(raw);
    })(),

    // Prompt C: Relationships
    (async () => {
      onStatus?.('finding-connections');
      const nodeSlim = allNodes.map((n) => ({ id: n.id, label: n.label }));
      const raw = await ollamaGenerate(
        promptC_Relationships(dumpText, nodeSlim),
      );
      return parseRelationshipResponse(
        raw,
        allNodes.map((n) => n.label),
      );
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

      // If there's a match to an existing node, merge
      if (t.match && t.match.similarity >= 0.75) {
        result.merges.set(node.id, t.match.existingNodeId);
      }

      // Update parentIds from Prompt B
      if (t.parents.length > 0) {
        const parentIds = t.parents
          .map((p) => p.parentId)
          .filter((pid) => allNodes.some((n) => n.id === pid));

        if (parentIds.length > 0) {
          result.nodeUpdates.set(node.id, { parentIds });
        }

        // Create page with context segments
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

  return result;
}
