import type { NodeKind } from '@/types/graph';

export function computeNodeSize(label: string, kind?: NodeKind): number {
  if (kind === 'umbrella') {
    const len = label.length;
    if (len <= 6) return 110;
    if (len <= 12) return 130;
    return 150;
  }

  const len = label.length;
  if (len <= 4) return 60;
  if (len <= 8) return 80;
  if (len <= 14) return 100;
  return 120;
}

export function computeNodeRadius(label: string, kind?: NodeKind): number {
  const size = computeNodeSize(label, kind);
  return size / 2 + 12;
}
