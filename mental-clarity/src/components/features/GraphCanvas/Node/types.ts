export type { NodeData } from '@/types/graph';

export interface EdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  strength?: number;
}
