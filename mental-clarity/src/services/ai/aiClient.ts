import { getMLXModelName, mlxGenerate, mlxHealthCheck } from './mlxClient';
import { getModelName as getOllamaModelName, ollamaGenerate, ollamaHealthCheck } from './ollamaClient';
import type { AIBackend, AIQuantProfile, AIResult, OnStreamProgress } from './types';

const MLX_MODEL_Q6 = import.meta.env.VITE_MLX_MODEL_Q6 ?? 'mlx-community/Qwen2.5-14B-Instruct-6bit';
const MLX_MODEL_Q8 = import.meta.env.VITE_MLX_MODEL_Q8 ?? 'mlx-community/Qwen2.5-14B-Instruct-8bit';
const MLX_MODEL_Q4_FALLBACK = import.meta.env.VITE_MLX_MODEL_Q4 ?? getMLXModelName();

const backend = ((import.meta.env.VITE_AI_BACKEND ?? 'ollama').toLowerCase() === 'mlx'
  ? 'mlx'
  : 'ollama') as AIBackend;

function modelForQuant(quant: AIQuantProfile): string {
  if (quant === 'q8') return MLX_MODEL_Q8;
  if (quant === 'q6') return MLX_MODEL_Q6;
  return MLX_MODEL_Q4_FALLBACK;
}

async function generateWithBackend(
  selected: AIBackend,
  prompt: string,
  quantProfile: AIQuantProfile,
  onProgress?: OnStreamProgress,
): Promise<AIResult> {
  if (selected === 'mlx') {
    const model = modelForQuant(quantProfile);
    const res = await mlxGenerate(prompt, onProgress, model);
    return {
      ...res,
      backend: 'mlx',
      model,
      quant: quantProfile,
    };
  }
  const res = await ollamaGenerate(prompt, onProgress);
  return {
    ...res,
    backend: 'ollama',
    model: getOllamaModelName(),
    quant: quantProfile,
  };
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
  quantProfile: AIQuantProfile = getAIQuantProfile(),
  onProgress?: OnStreamProgress,
): Promise<AIResult> {
  if (backend !== 'mlx') {
    return generateWithBackend('ollama', prompt, quantProfile, onProgress);
  }

  try {
    return await generateWithBackend('mlx', prompt, quantProfile, onProgress);
  } catch (err) {
    console.warn('[AI] MLX generation failed for quant', quantProfile, err);
    if (quantProfile !== 'q4-fallback') {
      try {
        const fallback = await generateWithBackend('mlx', prompt, 'q4-fallback', onProgress);
        console.warn('[AI] Applied MLX q4 emergency fallback');
        return fallback;
      } catch (fallbackErr) {
        console.warn('[AI] MLX q4 fallback failed, falling back to Ollama:', fallbackErr);
      }
    }
    return generateWithBackend('ollama', prompt, 'q4-fallback', onProgress);
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

export function getAIBenchmarkQuantProfile(): AIQuantProfile {
  const configured = (import.meta.env.VITE_AI_QUANT_BENCHMARK ?? 'q8').toLowerCase();
  if (configured === 'q6') return 'q6';
  if (configured === 'q4-fallback') return 'q4-fallback';
  return 'q8';
}

export type { AIBackend, AIQuantProfile, OllamaMetrics, OnStreamProgress, StreamProgress } from './types';
