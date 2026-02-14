import type { NodeCategory, ExtractionResult, NodeData, ConnectionData } from '@/types/graph';

export function fallbackExtract(text: string): ExtractionResult {
  const chunks = text
    .split(/[.,;!?]+|\band\b|\bbut\b|\balso\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && s.length <= 50);

  const seen = new Set<string>();
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const now = Date.now();

  const nodes: NodeData[] = [];
  for (const chunk of chunks.slice(0, 8)) {
    const label = chunk.length > 40 ? chunk.slice(0, 40) + '\u2026' : chunk;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    nodes.push({
      id: crypto.randomUUID(),
      label,
      kind: 'subnode',
      category: guessCategory(label),
      parentIds: [],
      pageId: null,
      x: cx - 250 + Math.random() * 500,
      y: cy - 200 + Math.random() * 400,
      createdAt: now,
      updatedAt: now,
    });
  }

  const connections: ConnectionData[] = [];
  for (let i = 1; i < nodes.length; i++) {
    connections.push({
      id: crypto.randomUUID(),
      sourceId: nodes[i - 1].id,
      targetId: nodes[i].id,
      label: 'related to',
      type: 'related',
      strength: 0.4,
      createdAt: now,
    });
  }

  return { nodes, connections, rawText: text };
}

function guessCategory(text: string): NodeCategory {
  const lower = text.toLowerCase();
  if (/code|api|server|data|bug|deploy|react|typescript|firmware|esp/i.test(lower)) return 'technical';
  if (/design|art|music|write|creative|color|guitar/i.test(lower)) return 'creative';
  if (/learn|study|read|course|book|practice|quiz|calc|physics/i.test(lower)) return 'learning';
  if (/me|my|feel|health|sleep|habit|goal|family/i.test(lower)) return 'personal';
  return 'organic';
}
