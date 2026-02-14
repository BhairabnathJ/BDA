import { useCallback, useRef, useState } from 'react';
import { extractKnowledgeGraph } from '@/services/ai';
import type { ExtractionResultWithMeta } from '@/services/ai';
import type { AIServiceStatus } from '@/types/graph';

interface UseAIExtractionReturn {
  extract: (text: string) => Promise<ExtractionResultWithMeta | null>;
  status: AIServiceStatus;
  isProcessing: boolean;
}

export function useAIExtraction(): UseAIExtractionReturn {
  const [status, setStatus] = useState<AIServiceStatus>('idle');
  const activeRef = useRef(false);

  const extract = useCallback(async (text: string): Promise<ExtractionResultWithMeta | null> => {
    if (activeRef.current) return null;
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
      setTimeout(() => setStatus('idle'), 1500);
    }
  }, []);

  const isProcessing = status === 'checking'
    || status === 'extracting-entities'
    || status === 'extracting-topics'
    || status === 'extracting-relationships'
    || status === 'refining-hierarchy'
    || status === 'finding-connections';

  return { extract, status, isProcessing };
}
