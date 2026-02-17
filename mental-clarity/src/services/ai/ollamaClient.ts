const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'llama3.2:3b';
const REQUEST_TIMEOUT_MS = 30_000;

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: false;
  format: 'json';
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration: number;
}

export async function ollamaGenerate(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt,
        stream: false,
        format: 'json',
      } satisfies OllamaGenerateRequest),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    const data: OllamaGenerateResponse = await res.json();
    return data.response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function ollamaHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
