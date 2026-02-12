import { useCallback, useRef, useState } from 'react';
import { WaveformIcon } from './WaveformIcon';
import styles from './InputBar.module.css';

interface InputBarProps {
  onSubmit: (text: string) => void;
}

export function InputBar({ onSubmit }: InputBarProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const label = trimmed.length > 50 ? trimmed.slice(0, 50) + '...' : trimmed;
    onSubmit(label);
    setValue('');
  }, [value, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        setValue('');
        inputRef.current?.blur();
      }
    },
    [handleSubmit],
  );

  return (
    <div className={styles.bar}>
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        placeholder="What's on your mind?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={53}
      />
      {value.trim() && (
        <button className={styles.sendButton} onClick={handleSubmit}>
          <span className={styles.sendIcon}>↑</span>
        </button>
      )}
      <button className={styles.voiceButton}>
        <WaveformIcon />
      </button>
    </div>
  );
}
