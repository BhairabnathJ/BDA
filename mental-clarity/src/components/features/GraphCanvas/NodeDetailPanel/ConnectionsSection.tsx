import { useMemo, useRef, useState } from 'react';
import type { NodeData, EdgeData } from '../Node';
import type { ConnectionData } from '@/types/graph';
import { ConnectionCard } from './ConnectionCard';
import styles from './NodeDetailPanel.module.css';

interface ConnectionsSectionProps {
  currentNodeId: string;
  nodes: NodeData[];
  edges: EdgeData[];
  connections?: ConnectionData[];
  onAddEdge: (sourceId: string, targetId: string) => void;
  onRemoveEdge: (edgeId: string) => void;
  onNavigate: (nodeId: string) => void;
}

export function ConnectionsSection({
  currentNodeId,
  nodes,
  edges,
  connections = [],
  onAddEdge,
  onRemoveEdge,
  onNavigate,
}: ConnectionsSectionProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const connectedEdges = useMemo(
    () =>
      edges.filter(
        (e) => e.sourceId === currentNodeId || e.targetId === currentNodeId,
      ),
    [edges, currentNodeId],
  );

  // AI-generated connections for this node
  const nodeConnections = useMemo(
    () =>
      connections.filter(
        (c) => c.sourceId === currentNodeId || c.targetId === currentNodeId,
      ),
    [connections, currentNodeId],
  );

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of connectedEdges) {
      ids.add(e.sourceId === currentNodeId ? e.targetId : e.sourceId);
    }
    for (const c of nodeConnections) {
      ids.add(c.sourceId === currentNodeId ? c.targetId : c.sourceId);
    }
    return ids;
  }, [connectedEdges, nodeConnections, currentNodeId]);

  const availableNodes = useMemo(() => {
    const q = search.toLowerCase().trim();
    return nodes.filter(
      (n) =>
        n.id !== currentNodeId &&
        !connectedNodeIds.has(n.id) &&
        (q === '' || n.label.toLowerCase().includes(q)),
    );
  }, [nodes, currentNodeId, connectedNodeIds, search]);

  const handleOpenPicker = () => {
    setShowPicker(true);
    setSearch('');
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const handleSelectNode = (targetId: string) => {
    onAddEdge(currentNodeId, targetId);
    setShowPicker(false);
    setSearch('');
  };

  const hasAny = connectedEdges.length > 0 || nodeConnections.length > 0;

  return (
    <div className={styles.connectionsSection}>
      <div className={styles.sectionLabel}>Connected Thoughts</div>

      {!hasAny && !showPicker && (
        <div className={styles.emptyConnections}>
          No connections yet. Link related thoughts together.
        </div>
      )}

      <div className={styles.connectionsList}>
        {/* AI connections */}
        {nodeConnections.map((conn) => {
          const otherId =
            conn.sourceId === currentNodeId ? conn.targetId : conn.sourceId;
          const otherNode = nodes.find((n) => n.id === otherId);
          if (!otherNode) return null;

          return (
            <div key={conn.id} className={styles.aiConnectionCard}>
              <div className={styles.aiConnectionBtn}>
                <button
                  className={styles.aiConnectionNodeChip}
                  onClick={() => onNavigate(otherId)}
                >
                  <span className={styles.connectionDot} />
                  <span className={styles.aiConnectionLabel}>{otherNode.label}</span>
                </button>
                <span className={styles.aiConnectionMeta}>
                  {conn.type} · {conn.label}
                </span>
              </div>
              <div className={styles.aiConnectionJustification}>
                {conn.justification ?? `Inferred via ${conn.type} relationship from this brain dump.`}
              </div>
            </div>
          );
        })}

        {/* Manual edges */}
        {connectedEdges.map((edge) => {
          const otherId =
            edge.sourceId === currentNodeId ? edge.targetId : edge.sourceId;
          const otherNode = nodes.find((n) => n.id === otherId);
          if (!otherNode) return null;

          return (
            <ConnectionCard
              key={edge.id}
              node={otherNode}
              edge={edge}
              onNavigate={onNavigate}
              onRemove={onRemoveEdge}
            />
          );
        })}
      </div>

      {showPicker ? (
        <div className={styles.nodePicker}>
          <input
            ref={searchRef}
            className={styles.nodePickerInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search thoughts..."
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowPicker(false);
                setSearch('');
              }
            }}
          />
          <div className={styles.nodePickerList}>
            {availableNodes.length === 0 ? (
              <div className={styles.emptyConnections}>No matching thoughts</div>
            ) : (
              availableNodes.map((n) => (
                <button
                  key={n.id}
                  className={styles.nodePickerItem}
                  onClick={() => handleSelectNode(n.id)}
                >
                  <div className={styles.connectionDot} />
                  {n.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <button className={styles.addConnectionBtn} onClick={handleOpenPicker}>
          + Add connection
        </button>
      )}
    </div>
  );
}
