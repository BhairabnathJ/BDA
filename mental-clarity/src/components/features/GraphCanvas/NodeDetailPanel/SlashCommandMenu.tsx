import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { cn } from '@/utils/cn';
import styles from './NodeDetailPanel.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TiptapEditor = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TiptapRange = any;

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: TiptapEditor; range: TiptapRange }) => void;
}

export interface SlashCommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>(
  ({ items, command }, ref) => {
    const [rawSelectedIndex, setSelectedIndex] = useState(0);

    // Clamp selectedIndex to current items length
    const selectedIndex = useMemo(
      () => (items.length === 0 ? 0 : Math.min(rawSelectedIndex, items.length - 1)),
      [rawSelectedIndex, items.length],
    );

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) return null;

    return (
      <div className={styles.slashMenu}>
        {items.map((item, index) => (
          <button
            key={item.title}
            className={cn(
              styles.slashMenuItem,
              index === selectedIndex && styles.selected,
            )}
            onClick={() => command(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span className={styles.slashMenuIcon}>{item.icon}</span>
            <span className={styles.slashMenuText}>
              <span className={styles.slashMenuTitle}>{item.title}</span>
              <span className={styles.slashMenuDesc}>{item.description}</span>
            </span>
          </button>
        ))}
      </div>
    );
  },
);

SlashCommandMenu.displayName = 'SlashCommandMenu';
