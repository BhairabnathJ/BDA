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
const WEAK_UMBRELLA_LABELS = new Set(['stuff', 'things', 'other', 'misc', 'general', 'life']);
const CATEGORY_UMBRELLA_FALLBACK: Record<NodeCategory, string> = {
  technical: 'Technical Work',
  learning: 'Learning',
  personal: 'Personal',
  organic: 'Health & Life',
  creative: 'Creative',
};

function normalizeLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim();
}

function normalizeKey(label: string): string {
  return normalizeLabel(label).toLowerCase();
}

// ── Prompt A parser ──

export function parseTopicResponse(raw: string): TopicExtractionResponse {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.topics)) throw new Error('Missing topics array');

  const initialTopics: ExtractedTopic[] = parsed.topics
    .filter((t: Record<string, unknown>) => typeof t?.label === 'string' && (t.label as string).length > 0)
    .map((t: Record<string, unknown>) => ({
      label: normalizeLabel(String(t.label).slice(0, 50)),
      level: t.level === 1 ? 1 as const : 2 as const,
      kind: VALID_KINDS.includes(t.kind as NodeKind) ? (t.kind as NodeKind) : 'subnode' as const,
      category: VALID_CATEGORIES.includes(t.category as NodeCategory) ? (t.category as NodeCategory) : 'organic' as const,
      parentLabel: t.kind === 'subnode' && typeof t.parentLabel === 'string'
        ? normalizeLabel(String(t.parentLabel)) : undefined,
    }));

  if (initialTopics.length === 0) throw new Error('No valid topics');

  const umbrellas: ExtractedTopic[] = [];
  const umbrellaKeySet = new Set<string>();

  for (const topic of initialTopics) {
    const labelKey = normalizeKey(topic.label);
    const isUmbrella = topic.kind === 'umbrella' || topic.level === 1;
    if (!isUmbrella) continue;
    if (WEAK_UMBRELLA_LABELS.has(labelKey)) continue;
    if (umbrellaKeySet.has(labelKey)) continue;

    umbrellas.push({
      label: topic.label,
      level: 1,
      kind: 'umbrella',
      category: topic.category,
    });
    umbrellaKeySet.add(labelKey);
  }

  if (umbrellas.length === 0) {
    const categoryOrder: NodeCategory[] = ['technical', 'learning', 'personal', 'organic', 'creative'];
    for (const category of categoryOrder) {
      if (!initialTopics.some((topic) => topic.category === category)) continue;
      umbrellas.push({
        label: CATEGORY_UMBRELLA_FALLBACK[category],
        level: 1,
        kind: 'umbrella',
        category,
      });
    }
  }

  const umbrellaByKey = new Map(umbrellas.map((u) => [normalizeKey(u.label), u]));
  const subnodes: ExtractedTopic[] = [];
  const subnodeDedup = new Set<string>();

  for (const topic of initialTopics) {
    const isSubnode = topic.kind === 'subnode' || topic.level === 2;
    if (!isSubnode) continue;

    const explicitParent = topic.parentLabel ? umbrellaByKey.get(normalizeKey(topic.parentLabel)) : undefined;
    const categoryParent = umbrellas.find((u) => u.category === topic.category);
    const resolvedParent = explicitParent ?? categoryParent ?? umbrellas[0];
    if (!resolvedParent) continue;

    const dedupKey = `${normalizeKey(topic.label)}::${normalizeKey(resolvedParent.label)}`;
    if (subnodeDedup.has(dedupKey)) continue;
    subnodeDedup.add(dedupKey);

    subnodes.push({
      label: topic.label,
      level: 2,
      kind: 'subnode',
      category: topic.category,
      parentLabel: resolvedParent.label,
    });
  }

  const topics = [...umbrellas.slice(0, 6), ...subnodes];
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
      justification:
        typeof r.justification === 'string'
          ? r.justification.slice(0, 220)
          : typeof r.reason === 'string'
          ? r.reason.slice(0, 220)
          : undefined,
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
