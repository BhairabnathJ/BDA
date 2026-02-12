import styles from './EmptyState.module.css';

export function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <p className={styles.text}>What's on your mind?</p>
    </div>
  );
}
