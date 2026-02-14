import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import styles from './ArchiveDropZone.module.css';

interface ArchiveDropZoneProps {
    archivedCount: number;
    isDragActive: boolean;
    isDragOver: boolean;
    onClick: () => void;
}

export const ArchiveDropZone = forwardRef<HTMLButtonElement, ArchiveDropZoneProps>(
    function ArchiveDropZone({ archivedCount, isDragActive, isDragOver, onClick }, ref) {
        return (
            <button
                ref={ref}
                className={cn(
                    styles.zone,
                    archivedCount > 0 && styles.hasItems,
                    isDragActive && styles.dragActive,
                    isDragOver && styles.dragOver,
                )}
                onClick={onClick}
            >
                <span className={styles.icon}>📦</span>
                <span>Archive</span>
                {archivedCount > 0 && (
                    <span className={styles.count}>({archivedCount})</span>
                )}
            </button>
        );
    },
);
