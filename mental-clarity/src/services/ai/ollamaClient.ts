const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'qwen2.5:14b';
const REQUEST_TIMEOUT_MS = 60_000;

/** Metrics returned alongside the response text */
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

/**
 * Generate a response from Ollama using streaming.
 * Collects the full response for JSON parsing, but invokes onProgress
 * on each token so the UI can show live metrics.
 */
export async function ollamaGenerate(
  prompt: string,
  onProgress?: OnStreamProgress,
): Promise<OllamaResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startTime = performance.now();
  let firstTokenTime = 0;

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt,
        stream: true,
        format: 'json',
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let tokenCount = 0;
    let finalMetrics: Partial<OllamaMetrics> = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      // Ollama streams newline-delimited JSON objects
      const lines = text.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        try {
          const chunk = JSON.parse(line);

          if (chunk.response) {
            accumulated += chunk.response;
            tokenCount++;

            if (tokenCount === 1) {
              firstTokenTime = performance.now() - startTime;
            }

            const elapsed = performance.now() - startTime;
            onProgress?.({
              tokens: tokenCount,
              tokensPerSec: tokenCount / (elapsed / 1000),
              elapsedMs: elapsed,
            });
          }

          // Final chunk has the metrics
          if (chunk.done) {
            finalMetrics = {
              totalDurationMs: (chunk.total_duration ?? 0) / 1e6,
              loadDurationMs: (chunk.load_duration ?? 0) / 1e6,
              promptEvalDurationMs: (chunk.prompt_eval_duration ?? 0) / 1e6,
              evalDurationMs: (chunk.eval_duration ?? 0) / 1e6,
              promptTokens: chunk.prompt_eval_count ?? 0,
              evalTokens: chunk.eval_count ?? 0,
            };
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    const totalElapsed = performance.now() - startTime;
    const evalTokens = finalMetrics.evalTokens ?? tokenCount;
    const evalDurationMs = finalMetrics.evalDurationMs ?? totalElapsed;

    const metrics: OllamaMetrics = {
      totalDurationMs: finalMetrics.totalDurationMs ?? totalElapsed,
      loadDurationMs: finalMetrics.loadDurationMs ?? 0,
      promptEvalDurationMs: finalMetrics.promptEvalDurationMs ?? 0,
      evalDurationMs,
      promptTokens: finalMetrics.promptTokens ?? 0,
      evalTokens,
      tokensPerSec: evalDurationMs > 0 ? (evalTokens / evalDurationMs) * 1000 : 0,
      timeToFirstTokenMs: firstTokenTime,
    };

    return { text: accumulated, metrics };
  } finally {
    clearTimeout(timeout);
  }
}

/** Non-streaming convenience wrapper (returns just the text) */
export async function ollamaGenerateText(prompt: string): Promise<string> {
  const { text } = await ollamaGenerate(prompt);
  return text;
}

export async function ollamaHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function getModelName(): string {
  return MODEL_NAME;
}
