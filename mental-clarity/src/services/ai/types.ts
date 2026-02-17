export interface OllamaMetrics {
  totalDurationMs: number;
  loadDurationMs: number;
  promptEvalDurationMs: number;
  evalDurationMs: number;
  promptTokens: number;
  evalTokens: number;
  tokensPerSec: number;
  timeToFirstTokenMs: number;
}

export interface OllamaResult {
  text: string;
  metrics: OllamaMetrics;
}

/** Callback invoked on each streamed chunk with running stats */
export interface StreamProgress {
  tokens: number;
  tokensPerSec: number;
  elapsedMs: number;
}

export type OnStreamProgress = (progress: StreamProgress) => void;
