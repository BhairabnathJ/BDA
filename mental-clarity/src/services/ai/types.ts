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

export type AIBackend = 'ollama' | 'mlx';
export type AIQuantProfile = 'q6' | 'q8' | 'q4-fallback';

export interface AIResult extends OllamaResult {
  backend: AIBackend;
  model: string;
  quant: AIQuantProfile;
}

/** Callback invoked on each streamed chunk with running stats */
export interface StreamProgress {
  tokens: number;
  tokensPerSec: number;
  elapsedMs: number;
}

export type OnStreamProgress = (progress: StreamProgress) => void;
