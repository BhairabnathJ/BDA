import type { OllamaMetrics, OllamaResult, OnStreamProgress } from './types';

const MLX_BASE_URL = import.meta.env.VITE_MLX_BASE_URL ?? 'http://127.0.0.1:8800';
const MLX_MODEL = import.meta.env.VITE_MLX_MODEL ?? 'mlx-community/Qwen2.5-14B-Instruct-4bit';
const REQUEST_TIMEOUT_MS = 60_000;

interface MLXChunkMetrics {
  totalDurationMs?: number;
  loadDurationMs?: number;
  promptEvalDurationMs?: number;
  evalDurationMs?: number;
  promptTokens?: number;
  evalTokens?: number;
}

function toMetrics(
  finalMetrics: MLXChunkMetrics | undefined,
  tokenCount: number,
  firstTokenTime: number,
  totalElapsed: number,
): OllamaMetrics {
  const evalTokens = finalMetrics?.evalTokens ?? tokenCount;
  const evalDurationMs = finalMetrics?.evalDurationMs ?? totalElapsed;

  return {
    totalDurationMs: finalMetrics?.totalDurationMs ?? totalElapsed,
    loadDurationMs: finalMetrics?.loadDurationMs ?? 0,
    promptEvalDurationMs: finalMetrics?.promptEvalDurationMs ?? 0,
    evalDurationMs,
    promptTokens: finalMetrics?.promptTokens ?? 0,
    evalTokens,
    tokensPerSec: evalDurationMs > 0 ? (evalTokens / evalDurationMs) * 1000 : 0,
    timeToFirstTokenMs: firstTokenTime,
  };
}

export async function mlxGenerate(
  prompt: string,
  onProgress?: OnStreamProgress,
  modelOverride?: string,
): Promise<OllamaResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startTime = performance.now();
  let firstTokenTime = 0;

  try {
    const res = await fetch(`${MLX_BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelOverride ?? MLX_MODEL,
        prompt,
        stream: true,
        format: 'json',
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`MLX error: ${res.status} ${res.statusText}`);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let tokenCount = 0;
    let finalMetrics: MLXChunkMetrics | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        try {
          const chunk = JSON.parse(line);

          if (typeof chunk.response === 'string' && chunk.response.length > 0) {
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

          if (chunk.done) {
            finalMetrics = chunk.metrics;
          }
        } catch {
          // Ignore malformed lines and keep streaming.
        }
      }
    }

    const totalElapsed = performance.now() - startTime;
    return {
      text: accumulated,
      metrics: toMetrics(finalMetrics, tokenCount, firstTokenTime, totalElapsed),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function mlxHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${MLX_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function getMLXModelName(): string {
  return MLX_MODEL;
}
