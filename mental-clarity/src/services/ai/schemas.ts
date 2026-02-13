import type {
  EntityExtractionResponse,
  ExtractedEntity,
  ExtractedRelationship,
  NodeCategory,
  ConnectionType,
  RelationshipExtractionResponse,
} from '@/types/graph';

const VALID_CATEGORIES: NodeCategory[] = ['organic', 'technical', 'creative', 'learning', 'personal'];
const VALID_CONN_TYPES: ConnectionType[] = ['related', 'causes', 'part-of', 'depends-on', 'similar', 'contrasts'];

export function parseEntityResponse(raw: string): EntityExtractionResponse {
  const parsed = JSON.parse(raw);

  if (!parsed.entities || !Array.isArray(parsed.entities)) {
    throw new Error('Missing or invalid "entities" array');
  }

  const entities: ExtractedEntity[] = parsed.entities
    .filter((e: unknown): e is Record<string, unknown> =>
      typeof e === 'object' && e !== null && typeof (e as Record<string, unknown>).label === 'string'
    )
    .map((e: Record<string, unknown>) => ({
      label: String(e.label).slice(0, 50),
      category: VALID_CATEGORIES.includes(e.category as NodeCategory)
        ? (e.category as NodeCategory)
        : 'organic',
    }));

  if (entities.length === 0) {
    throw new Error('No valid entities extracted');
  }

  return { entities };
}

export function parseRelationshipResponse(
  raw: string,
  validLabels: string[],
): RelationshipExtractionResponse {
  const parsed = JSON.parse(raw);

  if (!parsed.relationships || !Array.isArray(parsed.relationships)) {
    return { relationships: [] }; // Relationships are optional
  }

  const labelSet = new Set(validLabels.map((l) => l.toLowerCase()));

  const relationships: ExtractedRelationship[] = parsed.relationships
    .filter((r: unknown): r is Record<string, unknown> => {
      if (typeof r !== 'object' || r === null) return false;
      const rec = r as Record<string, unknown>;
      return (
        typeof rec.sourceLabel === 'string' &&
        typeof rec.targetLabel === 'string' &&
        labelSet.has(String(rec.sourceLabel).toLowerCase()) &&
        labelSet.has(String(rec.targetLabel).toLowerCase()) &&
        String(rec.sourceLabel).toLowerCase() !== String(rec.targetLabel).toLowerCase()
      );
    })
    .map((r: Record<string, unknown>) => ({
      sourceLabel: String(r.sourceLabel),
      targetLabel: String(r.targetLabel),
      label: typeof r.label === 'string' ? r.label.slice(0, 60) : 'related to',
      type: VALID_CONN_TYPES.includes(r.type as ConnectionType)
        ? (r.type as ConnectionType)
        : 'related',
      strength: typeof r.strength === 'number'
        ? Math.max(0.1, Math.min(1.0, r.strength))
        : 0.5,
    }));

  return { relationships };
}
