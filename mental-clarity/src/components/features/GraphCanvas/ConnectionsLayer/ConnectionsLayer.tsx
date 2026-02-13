import type { ConnectionData, NodeData } from '@/types/graph';
import styles from './ConnectionsLayer.module.css';

interface ConnectionsLayerProps {
  connections: ConnectionData[];
  nodes: NodeData[];
}

export function ConnectionsLayer({ connections, nodes }: ConnectionsLayerProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg className={styles.svg} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Arrowhead marker */}
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="var(--color-text-secondary)" fillOpacity="0.4" />
        </marker>
      </defs>
      {connections.map((conn) => {
        const source = nodeMap.get(conn.sourceId);
        const target = nodeMap.get(conn.targetId);
        if (!source || !target) return null;

        const opacity = 0.2 + conn.strength * 0.6;
        const strokeWidth = 1 + conn.strength * 2;

        // Calculate midpoint for label
        const mx = (source.x + target.x) / 2;
        const my = (source.y + target.y) / 2;

        return (
          <g key={conn.id}>
            <line
              x1={source.x} y1={source.y}
              x2={target.x} y2={target.y}
              className={styles.connectionLine}
              style={{ opacity, strokeWidth }}
              markerEnd={conn.type !== 'related' && conn.type !== 'similar' ? 'url(#arrowhead)' : undefined}
            />
            {conn.label && (
              <text
                x={mx} y={my - 6}
                className={styles.connectionLabel}
                style={{ opacity: opacity + 0.1 }}
              >
                {conn.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
