export type NodeCategory = 'organic' | 'technical' | 'creative' | 'learning' | 'personal';

export interface NodeData {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  category: NodeCategory;
}
