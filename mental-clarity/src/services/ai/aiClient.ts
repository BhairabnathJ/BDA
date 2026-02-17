import { getMLXModelName, mlxGenerate, mlxHealthCheck } from './mlxClient';
import { getModelName as getOllamaModelName, ollamaGenerate, ollamaHealthCheck } from './ollamaClient';
import type { OllamaResult, OnStreamProgress } from './types';

type AIBackend = 'ollama' | 'mlx';
type AIQuantProfile = 'q6' | 'q8' | 'q4-fallback';

const backend = ((import.meta.env.VITE_AI_BACKEND ?? 'ollama').toLowerCase() === 'mlx'
  ? 'mlx'
  : 'ollama') as AIBackend;

async function generateWithBackend(
  selected: AIBackend,
  prompt: string,
  onProgress?: OnStreamProgress,
): Promise<OllamaResult> {
  if (selected === 'mlx') {
    return mlxGenerate(prompt, onProgress);
  }
  return ollamaGenerate(prompt, onProgress);
}

async function healthWithBackend(selected: AIBackend): Promise<boolean> {
  if (selected === 'mlx') return mlxHealthCheck();
  return ollamaHealthCheck();
}

function modelWithBackend(selected: AIBackend): string {
  if (selected === 'mlx') return getMLXModelName();
  return getOllamaModelName();
}

export async function aiGenerate(
  prompt: string,
  onProgress?: OnStreamProgress,
): Promise<OllamaResult> {
  if (backend !== 'mlx') {
    return generateWithBackend('ollama', prompt, onProgress);
  }

  try {
    return await generateWithBackend('mlx', prompt, onProgress);
  } catch (err) {
    console.warn('[AI] MLX generation failed, falling back to Ollama:', err);
    return generateWithBackend('ollama', prompt, onProgress);
  }
}

export async function aiHealthCheck(): Promise<boolean> {
  const healthy = await healthWithBackend(backend);
  if (healthy) return true;

  // If MLX is selected but unavailable, allow transparent fallback to Ollama.
  if (backend === 'mlx') {
    return healthWithBackend('ollama');
  }
  return false;
}

export function getAIModelName(): string {
  if (backend !== 'mlx') return modelWithBackend('ollama');

  // Model label in analytics should reflect the configured primary backend.
  return modelWithBackend('mlx');
}

export function getAIBackend(): AIBackend {
  return backend;
}

export function getAIQuantProfile(): AIQuantProfile {
  const configured = (import.meta.env.VITE_AI_QUANT_DEFAULT ?? 'q6').toLowerCase();
  if (configured === 'q8') return 'q8';
  if (configured === 'q4-fallback') return 'q4-fallback';
  return 'q6';
}

export type { OllamaMetrics, OnStreamProgress, StreamProgress } from './types';
