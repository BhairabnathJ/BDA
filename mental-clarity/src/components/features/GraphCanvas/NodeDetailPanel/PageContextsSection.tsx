import type { PageData, NodeData, ExtractedTask } from '@/types/graph';
import { useLazySummary } from '@/hooks/useLazySummary';
import { ContextCard } from './ContextCard';
import styles from './NodeDetailPanel.module.css';

interface PageContextsSectionProps {
  page: PageData | undefined;
  node: NodeData;
  nodes: NodeData[];
  tasks: ExtractedTask[];
  onNavigate: (nodeId: string) => void;
  onUpdatePage?: (pageId: string, updates: Partial<PageData>) => void;
}

export function PageContextsSection({
  page,
  node,
  nodes,
  tasks,
  onNavigate,
  onUpdatePage,
}: PageContextsSectionProps) {
  const { summary, isGenerating } = useLazySummary(page, node.label, onUpdatePage);

  const parentNodes = (node.parentIds ?? [])
    .map((pid) => nodes.find((n) => n.id === pid))
    .filter(Boolean) as NodeData[];
  const childNodes = nodes.filter((candidate) =>
    (candidate.parentIds ?? []).includes(node.id),
  );

  const hasContexts = page && page.contexts.length > 0;
  const relatedTasks = tasks.filter(
    (t) => t.relatedTopic.toLowerCase() === node.label.toLowerCase(),
  );

  if (!hasContexts && parentNodes.length === 0 && childNodes.length === 0 && relatedTasks.length === 0) {
    return null;
  }

  return (
    <>
      {/* AI-generated summary */}
      {(summary || isGenerating) && (
        <div className={styles.contextsSection}>
          <div className={styles.sectionLabel}>
            Summary {isGenerating && <span className={styles.generatingDot} />}
          </div>
          {summary ? (
            <div className={styles.contextSummary}>{summary}</div>
          ) : (
            <div className={styles.emptyContexts}>Generating summary...</div>
          )}
        </div>
      )}

      {/* "Belongs to" multi-parent indicator */}
      {parentNodes.length > 0 && (
        <div className={styles.contextsSection}>
          <div className={styles.sectionLabel}>Belongs to</div>
          <div className={styles.alsoInSection}>
            {parentNodes.map((parent) => (
              <button
                key={parent.id}
                className={styles.alsoInTag}
                onClick={() => onNavigate(parent.id)}
              >
                {parent.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Child topics for umbrella/parent nodes */}
      {childNodes.length > 0 && (
        <div className={styles.contextsSection}>
          <div className={styles.sectionLabel}>Subtopics</div>
          <div className={styles.alsoInSection}>
            {childNodes.map((child) => (
              <button
                key={child.id}
                className={styles.alsoInTag}
                onClick={() => onNavigate(child.id)}
              >
                {child.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Context segments per parent */}
      {hasContexts && (
        <div className={styles.contextsSection}>
          <div className={styles.sectionLabel}>Context</div>
          {page.contexts.map((ctx, i) => (
            <ContextCard
              key={i}
              context={ctx}
              onNavigateParent={onNavigate}
            />
          ))}
        </div>
      )}

      {/* Tasks */}
      {relatedTasks.length > 0 && (
        <div className={styles.tasksSection}>
          <div className={styles.sectionLabel}>Tasks</div>
          <div className={styles.tasksList}>
            {relatedTasks.map((task, i) => (
              <div key={i} className={styles.taskItem}>
                <input type="checkbox" className={styles.taskCheckbox} />
                <span className={styles.taskLabel}>{task.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
