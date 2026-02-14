import type {
  EntityExtractionResponse,
  ExtractedEntity,
  ExtractedRelationship,
  ExtractedTopic,
  NodeCategory,
  NodeKind,
  ConnectionType,
  RelationshipExtractionResponse,
  TopicExtractionResponse,
  NodeMatchingResponse,
  NodeMatchResult,
  TaskExtractionResponse,
} from '@/types/graph';

const VALID_KINDS: NodeKind[] = ['umbrella', 'subnode'];
const VALID_CATEGORIES: NodeCategory[] = ['organic', 'technical', 'creative', 'learning', 'personal'];
const VALID_CONN_TYPES: ConnectionType[] = ['related', 'causes', 'part-of', 'depends-on', 'similar', 'contrasts', 'direct', 'semantic'];

// ── Prompt A parser ──

export function parseTopicResponse(raw: string): TopicExtractionResponse {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.topics)) throw new Error('Missing topics array');

  const topics: ExtractedTopic[] = parsed.topics
    .filter((t: Record<string, unknown>) => typeof t?.label === 'string' && (t.label as string).length > 0)
    .map((t: Record<string, unknown>) => ({
      label: String(t.label).slice(0, 50),
      level: t.level === 1 ? 1 as const : 2 as const,
      kind: VALID_KINDS.includes(t.kind as NodeKind) ? (t.kind as NodeKind) : 'subnode' as const,
      category: VALID_CATEGORIES.includes(t.category as NodeCategory) ? (t.category as NodeCategory) : 'organic' as const,
      parentLabel: t.kind === 'subnode' && typeof t.parentLabel === 'string'
        ? t.parentLabel as string : undefined,
    }));

  if (topics.length === 0) throw new Error('No valid topics');
  return { topics };
}

// ── Prompt B parser ──

export function parseNodeMatchResponse(raw: string): NodeMatchingResponse {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.topics)) return { topics: [] };

  const topics: NodeMatchResult[] = parsed.topics
    .filter((t: Record<string, unknown>) => typeof t?.label === 'string')
    .map((t: Record<string, unknown>) => ({
      label: String(t.label),
      match: t.match && typeof (t.match as Record<string, unknown>).existingNodeId === 'string'
        ? { existingNodeId: (t.match as Record<string, unknown>).existingNodeId as string, similarity: Number((t.match as Record<string, unknown>).similarity) || 0 }
        : null,
      parents: Array.isArray((t as Record<string, unknown>).parents)
        ? ((t as Record<string, unknown>).parents as Record<string, unknown>[])
            .filter((p: Record<string, unknown>) => typeof p?.parentId === 'string')
            .map((p: Record<string, unknown>) => ({
              parentId: String(p.parentId),
              contextSegment: String(p.contextSegment || ''),
            }))
        : [],
    }));

  return { topics };
}

// ── Prompt C / legacy relationship parser ──

export function parseRelationshipResponse(
  raw: string,
  validLabels: string[],
): RelationshipExtractionResponse {
  const parsed = JSON.parse(raw);

  if (!parsed.relationships || !Array.isArray(parsed.relationships)) {
    return { relationships: [] };
  }

  const labelSet = new Set(validLabels.map((l) => l.toLowerCase()));

  const relationships: ExtractedRelationship[] = parsed.relationships
    .filter((r: Record<string, unknown>) => {
      if (typeof r !== 'object' || r === null) return false;
      return (
        typeof r.sourceLabel === 'string' &&
        typeof r.targetLabel === 'string' &&
        labelSet.has(String(r.sourceLabel).toLowerCase()) &&
        labelSet.has(String(r.targetLabel).toLowerCase()) &&
        String(r.sourceLabel).toLowerCase() !== String(r.targetLabel).toLowerCase()
      );
    })
    .map((r: Record<string, unknown>) => ({
      sourceLabel: String(r.sourceLabel),
      targetLabel: String(r.targetLabel),
      label: typeof r.label === 'string' ? r.label.slice(0, 60) : 'related to',
      type: VALID_CONN_TYPES.includes(r.type as ConnectionType)
        ? (r.type as ConnectionType)
        : 'related' as ConnectionType,
      strength: typeof r.strength === 'number'
        ? Math.max(0.1, Math.min(1.0, r.strength))
        : 0.5,
    }));

  return { relationships };
}

// ── Prompt D parser ──

export function parseTaskResponse(raw: string): TaskExtractionResponse {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.tasks)) return { tasks: [] };

  return {
    tasks: parsed.tasks
      .filter((t: Record<string, unknown>) => typeof t?.label === 'string')
      .map((t: Record<string, unknown>) => ({
        label: String(t.label).slice(0, 100),
        relatedTopic: String(t.relatedTopic || ''),
      })),
  };
}

// ── Legacy compatibility ──

export function parseEntityResponse(raw: string): EntityExtractionResponse {
  // Try parsing as topic response first (new format), fall back to entity format
  try {
    const topicResult = parseTopicResponse(raw);
    return {
      entities: topicResult.topics.map((t) => ({
        label: t.label,
        category: t.category,
      })),
    };
  } catch {
    // Fall back to direct entity parsing
    const parsed = JSON.parse(raw);
    if (!parsed.entities || !Array.isArray(parsed.entities)) {
      throw new Error('Missing or invalid "entities" array');
    }

    const entities: ExtractedEntity[] = parsed.entities
      .filter((e: Record<string, unknown>) =>
        typeof e === 'object' && e !== null && typeof e.label === 'string'
      )
      .map((e: Record<string, unknown>) => ({
        label: String(e.label).slice(0, 50),
        category: VALID_CATEGORIES.includes(e.category as NodeCategory)
          ? (e.category as NodeCategory)
          : 'organic' as NodeCategory,
      }));

    if (entities.length === 0) {
      throw new Error('No valid entities extracted');
    }

    return { entities };
  }
}
