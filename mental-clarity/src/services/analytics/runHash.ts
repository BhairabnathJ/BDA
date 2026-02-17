const SPACE_RE = /\s+/g;

export function normalizeInput(text: string): string {
  return text.trim().toLowerCase().replace(SPACE_RE, ' ');
}

/**
 * Fast deterministic non-crypto hash for grouping same-input runs in local analytics.
 * FNV-1a 32-bit keeps this sync and browser-friendly.
 */
export function hashInput(text: string): string {
  const normalized = normalizeInput(text);
  let hash = 0x811c9dc5;

  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
