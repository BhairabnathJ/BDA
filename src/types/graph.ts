// ── Node hierarchy ──

export type NodeKind = 'umbrella' | 'subnode';
export type NodeCategory = 'organic' | 'technical' | 'creative' | 'learning' | 'personal';

export interface NodeData {
  id: string;
  label: string;
  kind: NodeKind;
  category: NodeCategory;
  parentIds: string[];          // empty for top-level umbrellas
  pageId: string | null;
  x: number;
  y: number;
  createdFromDumpId?: string;
  archived?: boolean;           // Added for archive feature
  thoughtId?: string;           // Convex ID
  createdAt: number;
  updatedAt: number;
}

// ── Pages & Contexts ──

export interface ContextSegment {
  text: string;
  timestamp: number;
  dumpId: string;
}

export interface PageContext {
  parentId: string;
  parentName: string;
  segments: ContextSegment[];
  summary?: string;             // filled by Prompt E later
}

export interface PageData {
  id: string;
  title: string;
  content: string;              // user-editable rich text / markdown
  contexts: PageContext[];
  createdAt: number;
  updatedAt: number;
}

// ── Connections ──

export type ConnectionType = 'related' | 'causes' | 'part-of' | 'contrasts';

export interface ConnectionData {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  type: ConnectionType;
  strength: number;             // 0.0–1.0
  createdAt: number;
}

// ── Brain dumps ──

export interface DumpData {
  id: string;
  text: string;
  createdAt: number;
}

// ── AI response shapes ──

export interface ExtractedTopic {
  label: string;
  level: 1 | 2;
  kind: NodeKind;
  category: NodeCategory;
  parentLabel?: string;         // only for subnodes
}

export interface TopicExtractionResponse {
  topics: ExtractedTopic[];
}

export interface NodeMatchResult {
  label: string;
  match: { existingNodeId: string; similarity: number } | null;
  parents: {
    parentId: string;
    contextSegment: string;
  }[];
}

export interface NodeMatchingResponse {
  topics: NodeMatchResult[];
}

export interface ExtractedRelationship {
  sourceLabel: string;
  targetLabel: string;
  label: string;
  type: ConnectionType;
  strength: number;
}

export interface RelationshipResponse {
  relationships: ExtractedRelationship[];
}

export interface ExtractedTask {
  label: string;
  relatedTopic: string;
}

export interface TaskExtractionResponse {
  tasks: ExtractedTask[];
}

// ── Service status ──

export type AIServiceStatus =
  | 'idle'
  | 'checking'
  | 'extracting-topics'         // Prompt A
  | 'refining-hierarchy'        // Prompt B
  | 'finding-connections'       // Prompt C
  | 'extracting-tasks'          // Prompt D
  | 'error'
  | 'unavailable';
