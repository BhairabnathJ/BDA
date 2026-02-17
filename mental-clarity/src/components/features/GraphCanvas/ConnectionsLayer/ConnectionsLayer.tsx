import { useCallback, useState } from 'react';
import type { ConnectionData, ConnectionType, NodeData } from '@/types/graph';
import styles from './ConnectionsLayer.module.css';

interface ConnectionsLayerProps {
  connections: ConnectionData[];
  nodes: NodeData[];
}

interface TooltipState {
  x: number;
  y: number;
  label: string;
  type: string;
  strength: number;
}

/** Dash pattern per connection type */
function getDashArray(type: ConnectionType): string | undefined {
  switch (type) {
    case 'semantic':
    case 'similar':
      return '6 4';       // short dash
    case 'contrasts':
      return '2 4';       // dotted
    case 'causes':
    case 'depends-on':
      return '10 4 2 4';  // dash-dot
    default:
      return undefined;   // solid for direct, related, part-of
  }
}

/** Whether this type gets an arrowhead (directional relationships) */
function hasArrow(type: ConnectionType): boolean {
  return type === 'causes' || type === 'depends-on' || type === 'part-of';
}

export function ConnectionsLayer({ connections, nodes }: ConnectionsLayerProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleMouseEnter = useCallback((conn: ConnectionData, mx: number, my: number) => {
    setTooltip({
      x: mx,
      y: my - 16,
      label: conn.label || 'connected',
      type: conn.type,
      strength: conn.strength,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <svg className={styles.svg} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="var(--color-text-secondary)" fillOpacity="0.4" />
        </marker>
      </defs>
      {connections.map((conn) => {
        const source = nodeMap.get(conn.sourceId);
        const target = nodeMap.get(conn.targetId);
        if (!source || !target) return null;

        const opacity = 0.25 + conn.strength * 0.55;
        const strokeWidth = 1 + conn.strength * 1.5;
        const dashArray = getDashArray(conn.type);

        const mx = (source.x + target.x) / 2;
        const my = (source.y + target.y) / 2;

        return (
          <g key={conn.id}>
            <line
              x1={source.x} y1={source.y}
              x2={target.x} y2={target.y}
              className={styles.hitArea}
              onMouseEnter={() => handleMouseEnter(conn, mx, my)}
              onMouseLeave={handleMouseLeave}
            />
            <line
              x1={source.x} y1={source.y}
              x2={target.x} y2={target.y}
              className={styles.connectionLine}
              style={{ opacity, strokeWidth, strokeDasharray: dashArray }}
              markerEnd={hasArrow(conn.type) ? 'url(#arrowhead)' : undefined}
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

      {tooltip && (
        <foreignObject
          x={tooltip.x - 80}
          y={tooltip.y - 40}
          width="160"
          height="50"
          className={styles.tooltipContainer}
        >
          <div className={styles.tooltip}>
            <span className={styles.tooltipLabel}>{tooltip.label}</span>
            <span className={styles.tooltipMeta}>
              {tooltip.type} · {Math.round(tooltip.strength * 100)}%
            </span>
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
