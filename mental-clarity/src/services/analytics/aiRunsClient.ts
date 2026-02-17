import type { AIRunArtifacts, AIRunMeta, AIRunMode } from '@/types/graph';
import { getAIBackend, getAIModelName } from '@/services/ai/aiClient';
import { hashInput } from './runHash';

const PROMPT_VERSION = 'topics_v1';
const DEFAULT_PROMPT_PROFILE_ID = 'default/topics_v1';

interface LogAIRunArgs {
  dumpText: string;
  mode: AIRunMode;
  sessionId: string;
  inputHash?: string;
  model?: string;
  backend?: string;
  quant?: string;
  promptProfileId?: string;
  startedAt: number;
  finishedAt: number;
  nodeCount: number;
  connectionCount: number;
  aiStatus: 'success' | 'fallback' | 'error';
  errorMessage?: string;
  artifacts: AIRunArtifacts;
  quality?: {
    score?: number;
    note?: string;
  };
  meta: AIRunMeta;
}

type CreateRunMutation = (args: {
  dumpText: string;
  model: string;
  promptVersion: string;
  promptProfileId?: string;
  inputHash?: string;
  sessionId?: string;
  mode?: string;
  backend?: string;
  quant?: string;
  startedAt: number;
  finishedAt: number;
  nodeCount: number;
  connectionCount: number;
  aiStatus: string;
  errorMessage?: string;
  artifacts?: Record<string, unknown>;
  quality?: {
    score?: number;
    note?: string;
  };
  meta?: Record<string, unknown>;
}) => Promise<unknown>;

export async function logAIRun(
  createRunMutation: CreateRunMutation,
  args: LogAIRunArgs,
): Promise<string | undefined> {
  const inputHash = args.inputHash ?? hashInput(args.dumpText);
  const backend = args.backend ?? getAIBackend();
  const model = args.model ?? getAIModelName();

  try {
    const runId = await createRunMutation({
      dumpText: args.dumpText,
      model,
      promptVersion: PROMPT_VERSION,
      promptProfileId: args.promptProfileId ?? DEFAULT_PROMPT_PROFILE_ID,
      inputHash,
      sessionId: args.sessionId,
      mode: args.mode,
      backend,
      quant: args.quant,
      startedAt: args.startedAt,
      finishedAt: args.finishedAt,
      nodeCount: args.nodeCount,
      connectionCount: args.connectionCount,
      aiStatus: args.aiStatus,
      errorMessage: args.errorMessage,
      artifacts: args.artifacts as unknown as Record<string, unknown>,
      quality: args.quality,
      meta: args.meta as unknown as Record<string, unknown>,
    });
    return String(runId);
  } catch (err) {
    console.warn('[Analytics] Failed to log AI run:', err);
    return undefined;
  }
}
