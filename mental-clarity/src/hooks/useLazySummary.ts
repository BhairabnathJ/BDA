import { useCallback, useEffect, useRef, useState } from 'react';
import { ollamaGenerate, ollamaHealthCheck } from '@/services/ai/ollamaClient';
import { promptE_Summary } from '@/services/ai/prompts';
import type { PageData } from '@/types/graph';

interface UseLazySummaryReturn {
  summary: string | null;
  isGenerating: boolean;
}

export function useLazySummary(
  page: PageData | undefined,
  nodeLabel: string,
  onUpdatePage?: (pageId: string, updates: Partial<PageData>) => void,
): UseLazySummaryReturn {
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const generatedForRef = useRef<string | null>(null);

  const generate = useCallback(async (p: PageData) => {
    // Collect all segments across all contexts
    const allSegments = p.contexts
      .flatMap((ctx) => ctx.segments)
      .map((s) => s.text)
      .filter((t) => t.length > 0);

    if (allSegments.length === 0) return;

    setIsGenerating(true);
    try {
      const healthy = await ollamaHealthCheck();
      if (!healthy) return;

      const raw = await ollamaGenerate(promptE_Summary(allSegments, nodeLabel));
      const parsed = JSON.parse(raw);
      const text = typeof parsed.summary === 'string' ? parsed.summary : null;

      if (text) {
        setSummary(text);
        // Persist the summary into the first context
        if (onUpdatePage) {
          const updatedContexts = p.contexts.map((ctx, i) =>
            i === 0 ? { ...ctx, summary: text } : ctx,
          );
          onUpdatePage(p.id, { contexts: updatedContexts, updatedAt: Date.now() });
        }
      }
    } catch (err) {
      console.warn('[AI] Summary generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [nodeLabel, onUpdatePage]);

  useEffect(() => {
    if (!page) return;

    // Check if any context already has a summary
    const existingSummary = page.contexts.find((ctx) => ctx.summary)?.summary;
    if (existingSummary) {
      setSummary(existingSummary);
      return;
    }

    // Don't regenerate for the same page
    if (generatedForRef.current === page.id) return;
    generatedForRef.current = page.id;

    generate(page);
  }, [page, generate]);

  return { summary, isGenerating };
}
