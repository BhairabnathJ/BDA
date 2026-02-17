// ── Node hierarchy ──

export type NodeKind = 'umbrella' | 'subnode';
export type NodeCategory = 'organic' | 'technical' | 'creative' | 'learning' | 'personal';

export interface NodeData {
  id: string;
  label: string;
  kind?: NodeKind;
  category?: NodeCategory;
  parentIds?: string[];
  pageId?: string | null;
  x: number;
  y: number;
  content?: string;
  archived?: boolean;
  thoughtId?: string;
  createdFromDumpId?: string;
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
  summary?: string;
}

export interface PageData {
  id: string;
  title: string;
  content: string;
  contexts: PageContext[];
  createdAt: number;
  updatedAt: number;
}

// ── Connections ──

export type ConnectionType = 'related' | 'causes' | 'part-of' | 'depends-on' | 'similar' | 'contrasts' | 'direct' | 'semantic';

export interface ConnectionData {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  type: ConnectionType;
  strength: number;   // 0.1 – 1.0
  justification?: string;
  createdAt: number;
}

// ── Brain dumps ──

export interface DumpData {
  id: string;
  text: string;
  createdAt: number;
}

// ── AI extraction types ──

export interface ExtractedTopic {
  label: string;
  level: 1 | 2;
  kind: NodeKind;
  category: NodeCategory;
  parentLabel?: string;
}

export interface TopicExtractionResponse {
  topics: ExtractedTopic[];
}

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
  justification?: string;
}

export interface EntityExtractionResponse {
  entities: ExtractedEntity[];
}

export interface RelationshipExtractionResponse {
  relationships: ExtractedRelationship[];
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

export interface ExtractedTask {
  label: string;
  relatedTopic: string;
}

export interface TaskExtractionResponse {
  tasks: ExtractedTask[];
}

export interface ExtractionResult {
  nodes: NodeData[];
  connections: ConnectionData[];
  rawText: string;
}

// ── AI service status ──

export type AIServiceStatus =
  | 'idle'
  | 'checking'
  | 'extracting-entities'
  | 'extracting-topics'
  | 'extracting-relationships'
  | 'refining-hierarchy'
  | 'finding-connections'
  | 'extracting-tasks'
  | 'error'
  | 'unavailable';

// ── AI Run analytics ──

export interface AIRunTimings {
  entitiesMs: number;
  hierarchyMs?: number;
  relationshipsMs: number;
  tasksMs?: number;
}

/** Per-prompt Ollama metrics stored with each AI run */
export interface PromptMetricsSummary {
  evalTokens: number;
  promptTokens: number;
  tokensPerSec: number;
  timeToFirstTokenMs: number;
  evalDurationMs: number;
  totalDurationMs: number;
}

export interface AIRunMeta {
  timings: AIRunTimings;
  graphDensity: number;
  avgStrength: number;
  /** Per-prompt LLM metrics (tokens, tok/s, TTFT, etc.) */
  promptMetrics?: {
    promptA?: PromptMetricsSummary;
    promptB?: PromptMetricsSummary;
    promptC?: PromptMetricsSummary;
    promptD?: PromptMetricsSummary;
  };
}

export type AIRunMode = 'apply' | 'benchmark';

export interface AIRunArtifacts {
  nodes: NodeData[];
  connections: ConnectionData[];
  tasks: ExtractedTask[];
  pages?: PageData[];
}
