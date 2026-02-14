import { useCallback, useRef, useState } from 'react';
import type { AIServiceStatus } from '@/types/graph';
import { cn } from '@/utils/cn';
import { WaveformIcon } from './WaveformIcon';
import styles from './InputBar.module.css';

interface InputBarProps {
  onSubmit: (text: string) => void | Promise<void>;
  isProcessing?: boolean;
  aiStatus?: AIServiceStatus;
}

function statusMessage(status?: AIServiceStatus): string {
  switch (status) {
    case 'checking': return 'Connecting to AI...';
    case 'extracting-entities':
    case 'extracting-topics': return 'Extracting topics...';
    case 'refining-hierarchy': return 'Organizing hierarchy...';
    case 'extracting-relationships':
    case 'finding-connections': return 'Finding connections...';
    case 'extracting-tasks': return 'Extracting tasks...';
    default: return 'Processing...';
  }
}

export function InputBar({ onSubmit, isProcessing = false, aiStatus }: InputBarProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (isProcessing) return;
    onSubmit(trimmed);
    setValue('');
  }, [value, onSubmit, isProcessing]);

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
    <div className={cn(styles.bar, isProcessing && styles.processing)}>
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        placeholder={isProcessing ? statusMessage(aiStatus) : "What's on your mind?"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={3000}
        disabled={isProcessing}
      />
      {isProcessing && (
        <div className={styles.processingIndicator}>
          <div className={styles.dot} />
          <div className={styles.dot} />
          <div className={styles.dot} />
        </div>
      )}
      {!isProcessing && value.trim() && (
        <button className={styles.sendButton} onClick={handleSubmit}>
          <span className={styles.sendIcon}>↑</span>
        </button>
      )}
      {!isProcessing && (
        <button className={styles.voiceButton}>
          <WaveformIcon />
        </button>
      )}
    </div>
  );
}
