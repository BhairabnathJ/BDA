import type { AIRunMeta } from '@/types/graph';
import { getModelName } from '@/services/ai/ollamaClient';

const PROMPT_VERSION = 'topics_v1';

interface LogAIRunArgs {
  dumpText: string;
  startedAt: number;
  finishedAt: number;
  nodeCount: number;
  connectionCount: number;
  aiStatus: 'success' | 'fallback' | 'error';
  errorMessage?: string;
  meta: AIRunMeta;
}

type CreateRunMutation = (args: {
  dumpText: string;
  model: string;
  promptVersion: string;
  startedAt: number;
  finishedAt: number;
  nodeCount: number;
  connectionCount: number;
  aiStatus: string;
  errorMessage?: string;
  meta?: Record<string, unknown>;
}) => Promise<unknown>;

export function logAIRun(
  createRunMutation: CreateRunMutation,
  args: LogAIRunArgs,
): void {
  createRunMutation({
    dumpText: args.dumpText,
    model: getModelName(),
    promptVersion: PROMPT_VERSION,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    nodeCount: args.nodeCount,
    connectionCount: args.connectionCount,
    aiStatus: args.aiStatus,
    errorMessage: args.errorMessage,
    meta: args.meta as unknown as Record<string, unknown>,
  }).catch((err) => {
    console.warn('[Analytics] Failed to log AI run:', err);
  });
}
