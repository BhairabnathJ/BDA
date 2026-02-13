import { useCallback, useRef, useState } from 'react';
import { extractKnowledgeGraph } from '@/services/ai';
import type { AIServiceStatus, ExtractionResult } from '@/types/graph';

interface UseAIExtractionReturn {
  extract: (text: string) => Promise<ExtractionResult | null>;
  status: AIServiceStatus;
  isProcessing: boolean;
}

export function useAIExtraction(): UseAIExtractionReturn {
  const [status, setStatus] = useState<AIServiceStatus>('idle');
  const activeRef = useRef(false);

  const extract = useCallback(async (text: string): Promise<ExtractionResult | null> => {
    if (activeRef.current) return null; // Prevent concurrent extractions
    activeRef.current = true;

    try {
      const result = await extractKnowledgeGraph(text, setStatus);
      return result;
    } catch (err) {
      console.error('[useAIExtraction]', err);
      setStatus('error');
      return null;
    } finally {
      activeRef.current = false;
      // Reset to idle after a brief delay so UI can show completion
      setTimeout(() => setStatus('idle'), 1500);
    }
  }, []);

  const isProcessing = status === 'checking'
    || status === 'extracting-entities'
    || status === 'extracting-relationships';

  return { extract, status, isProcessing };
}
