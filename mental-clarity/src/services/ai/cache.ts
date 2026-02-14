import type { Phase1Result } from './extractionService';

const MAX_CACHE_SIZE = 50;
const cache = new Map<string, Phase1Result>();

function normalizeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getCached(text: string): Phase1Result | undefined {
  return cache.get(normalizeKey(text));
}

export function setCache(text: string, result: Phase1Result): void {
  const key = normalizeKey(text);
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, result);
}
