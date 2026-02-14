// ── Node types ──

export type NodeCategory = 'organic' | 'technical' | 'creative' | 'learning' | 'personal';

export interface NodeData {
  id: string;
  label: string;
  x: number;
  y: number;
  content?: string;
  category?: NodeCategory;
  archived?: boolean;
  thoughtId?: string;
  createdAt: number;
  updatedAt: number;
}

// ── Connection types ──

export type ConnectionType = 'related' | 'causes' | 'part-of' | 'depends-on' | 'similar' | 'contrasts';

export interface ConnectionData {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  type: ConnectionType;
  strength: number;   // 0.1 – 1.0
  createdAt: number;
}

// ── AI extraction types ──

export interface ExtractedEntity {
  label: string;
  category: NodeCategory;
}

export interface ExtractedRelationship {
  sourceLabel: string;
  targetLabel: string;
  label: string;
  type: ConnectionType;
  strength: number;
}

export interface EntityExtractionResponse {
  entities: ExtractedEntity[];
}

export interface RelationshipExtractionResponse {
  relationships: ExtractedRelationship[];
}

export interface ExtractionResult {
  nodes: NodeData[];
  connections: ConnectionData[];
  rawText: string;
}

// ── AI service status ──

export type AIServiceStatus = 'idle' | 'checking' | 'extracting-entities' | 'extracting-relationships' | 'error' | 'unavailable';
