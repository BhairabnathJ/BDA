import { useMemo, useRef, useState } from 'react';
import type { NodeData, EdgeData } from '../Node';
import { ConnectionCard } from './ConnectionCard';
import styles from './NodeDetailPanel.module.css';

interface ConnectionsSectionProps {
  currentNodeId: string;
  nodes: NodeData[];
  edges: EdgeData[];
  onAddEdge: (sourceId: string, targetId: string) => void;
  onRemoveEdge: (edgeId: string) => void;
  onNavigate: (nodeId: string) => void;
}

export function ConnectionsSection({
  currentNodeId,
  nodes,
  edges,
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

  const connectedNodeIds = useMemo(
    () =>
      new Set(
        connectedEdges.map((e) =>
          e.sourceId === currentNodeId ? e.targetId : e.sourceId,
        ),
      ),
    [connectedEdges, currentNodeId],
  );

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

  return (
    <div className={styles.connectionsSection}>
      <div className={styles.sectionLabel}>Connected Thoughts</div>

      {connectedEdges.length === 0 && !showPicker && (
        <div className={styles.emptyConnections}>
          No connections yet. Link related thoughts together.
        </div>
      )}

      <div className={styles.connectionsList}>
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
