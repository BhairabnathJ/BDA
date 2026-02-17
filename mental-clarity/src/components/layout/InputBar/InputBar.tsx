import { useCallback, useRef, useState } from 'react';
import type { AIServiceStatus } from '@/types/graph';
import type { StreamProgress } from '@/services/ai/aiClient';
import { cn } from '@/utils/cn';
import { WaveformIcon } from './WaveformIcon';
import styles from './InputBar.module.css';

interface InputBarProps {
  onSubmit: (text: string) => void | Promise<void>;
  onBenchmark?: (text: string) => void | Promise<void>;
  isProcessing?: boolean;
  aiStatus?: AIServiceStatus;
  streamProgress?: StreamProgress | null;
}

function statusMessage(status?: AIServiceStatus): string {
  switch (status) {
    case 'checking': return 'Connecting to AI...';
    case 'extracting-entities':
    case 'extracting-topics': return 'Extracting topics';
    case 'refining-hierarchy': return 'Organizing hierarchy';
    case 'extracting-relationships':
    case 'finding-connections': return 'Finding connections';
    case 'extracting-tasks': return 'Extracting tasks';
    default: return 'Processing';
  }
}

export function InputBar({ onSubmit, onBenchmark, isProcessing = false, aiStatus, streamProgress }: InputBarProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (isProcessing) return;
    onSubmit(trimmed);
    setValue('');
  }, [value, onSubmit, isProcessing]);

  const handleBenchmark = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (isProcessing) return;
    onBenchmark?.(trimmed);
  }, [value, onBenchmark, isProcessing]);

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

  // Build the placeholder text with live metrics
  let placeholder = "What's on your mind?";
  if (isProcessing) {
    const msg = statusMessage(aiStatus);
    if (streamProgress && streamProgress.tokens > 0) {
      const elapsed = (streamProgress.elapsedMs / 1000).toFixed(1);
      const tps = streamProgress.tokensPerSec.toFixed(1);
      placeholder = `${msg} · ${streamProgress.tokens} tokens · ${tps} tok/s · ${elapsed}s`;
    } else {
      placeholder = `${msg}...`;
    }
  }

  return (
    <div className={cn(styles.bar, isProcessing && styles.processing)}>
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={3000}
        disabled={isProcessing}
      />
      {isProcessing && (
        <div className={styles.processingIndicator}>
          {streamProgress && streamProgress.tokens > 0 ? (
            <span className={styles.metricsLabel}>
              {streamProgress.tokensPerSec.toFixed(0)} tok/s
            </span>
          ) : (
            <>
              <div className={styles.dot} />
              <div className={styles.dot} />
              <div className={styles.dot} />
            </>
          )}
        </div>
      )}
      {!isProcessing && value.trim() && (
        <>
          <button className={styles.benchmarkButton} onClick={handleBenchmark} title="Run benchmark (no graph changes)">
            Bench
          </button>
          <button className={styles.sendButton} onClick={handleSubmit} title="Apply to graph">
            <span className={styles.sendIcon}>{'\u2191'}</span>
          </button>
        </>
      )}
      {!isProcessing && (
        <button className={styles.voiceButton}>
          <WaveformIcon />
        </button>
      )}
    </div>
  );
}
