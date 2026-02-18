import type { NodeKind } from '@/types/graph';

function mentionBonus(mentionCount?: number): number {
  if (!mentionCount || mentionCount <= 1) return 0;
  if (mentionCount <= 3) return 6;
  if (mentionCount <= 6) return 12;
  if (mentionCount <= 10) return 18;
  return 24;
}

export function computeNodeSize(label: string, kind?: NodeKind, mentionCount?: number): number {
  const bonus = mentionBonus(mentionCount);

  if (kind === 'umbrella') {
    const len = label.length;
    if (len <= 6) return 118 + bonus;
    if (len <= 12) return 136 + bonus;
    return 154 + bonus;
  }

  const len = label.length;
  if (len <= 4) return 64 + bonus;
  if (len <= 8) return 84 + bonus;
  if (len <= 14) return 102 + bonus;
  return 122 + bonus;
}

export function computeNodeRadius(label: string, kind?: NodeKind, mentionCount?: number): number {
  const size = computeNodeSize(label, kind, mentionCount);
  return size / 2 + 12;
}
