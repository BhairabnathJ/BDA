import styles from './InputBar.module.css';

export function InputBar() {
  return (
    <div className={styles.bar}>
      <button className={styles.voiceButton}>
        <span className={styles.icon}>🎤</span>
        <span className={styles.buttonText}>Hold to speak</span>
      </button>
      <button className={styles.textButton}>
        <span className={styles.buttonText}>Type your thoughts</span>
        <span className={styles.icon}>⌨️</span>
      </button>
    </div>
  );
}
