import { useCallback, useRef, useState } from 'react';
import { extractTopics, refineGraph } from '@/services/ai';
import type { OllamaMetrics, StreamProgress } from '@/services/ai/aiClient';
import type { AIServiceStatus, NodeData, ConnectionData, PageData, DumpData, AIRunMeta, PromptMetricsSummary, ExtractedTask } from '@/types/graph';

export interface AIRunResult {
  rawText: string;
  startedAt: number;
  finishedAt: number;
  nodeCount: number;
  connectionCount: number;
  aiStatus: 'success' | 'fallback' | 'error';
  errorMessage?: string;
  meta: AIRunMeta;
}

export interface GraphCallbacks {
  addNodes: (nodes: NodeData[]) => void;
  updateNodes: (updates: Map<string, Partial<NodeData>>) => void;
  mergeNodes: (merges: Map<string, string>) => void;
  addConnections: (connections: ConnectionData[]) => void;
  addPages: (pages: PageData[]) => void;
  addTasks: (tasks: ExtractedTask[]) => void;
  addDump: (dump: DumpData) => void;
  getExistingNodes: () => NodeData[];
}

interface UseAIExtractionReturn {
  submit: (text: string) => Promise<AIRunResult | null>;
  status: AIServiceStatus;
  isProcessing: boolean;
  /** Live streaming progress (tokens, tokens/sec, elapsed) */
  streamProgress: StreamProgress | null;
}

function toSummary(m: OllamaMetrics): PromptMetricsSummary {
  return {
    evalTokens: m.evalTokens,
    promptTokens: m.promptTokens,
    tokensPerSec: m.tokensPerSec,
    timeToFirstTokenMs: m.timeToFirstTokenMs,
    evalDurationMs: m.evalDurationMs,
    totalDurationMs: m.totalDurationMs,
  };
}

export function useAIExtraction(callbacks: GraphCallbacks): UseAIExtractionReturn {
  const [status, setStatus] = useState<AIServiceStatus>('idle');
  const [streamProgress, setStreamProgress] = useState<StreamProgress | null>(null);
  const activeRef = useRef(false);

  const submit = useCallback(async (text: string): Promise<AIRunResult | null> => {
    if (activeRef.current) return null;
    activeRef.current = true;
    const startedAt = Date.now();
    setStreamProgress(null);

    try {
      // -- Phase 1: Fast topic extraction (with stream progress) --
      const phase1 = await extractTopics(text, setStatus, setStreamProgress);
      if (!phase1) {
        activeRef.current = false;
        return null;
      }

      // Immediately render nodes on canvas
      callbacks.addNodes(phase1.nodes);
      callbacks.addDump(phase1.dump);
      setStreamProgress(null);

      let totalConnections = 0;
      let refinementTimings = { matchingMs: 0, relationshipsMs: 0, tasksMs: 0 };
      let refinementPromptMetrics: { promptB?: OllamaMetrics; promptC?: OllamaMetrics; promptD?: OllamaMetrics } = {};
      const finalStatus = phase1.aiStatus;
      const finalError = phase1.errorMessage;

      // -- Phase 2: Refinement (runs while nodes are visible) --
      if (phase1.aiStatus === 'success') {
        const existingNodes = callbacks.getExistingNodes();
        try {
          const refinement = await refineGraph(
            text,
            phase1.dump.id,
            phase1.nodes,
            existingNodes.filter((n) =>
              !phase1.nodes.some((pn) => pn.id === n.id),
            ),
            setStatus,
          );

          refinementTimings = refinement.timings;
          refinementPromptMetrics = refinement.promptMetrics;

          if (refinement.nodeUpdates.size > 0) {
            callbacks.updateNodes(refinement.nodeUpdates);
          }
          if (refinement.merges.size > 0) {
            callbacks.mergeNodes(refinement.merges);
          }
          if (refinement.connections.length > 0) {
            callbacks.addConnections(refinement.connections);
            totalConnections = refinement.connections.length;
          }
          if (refinement.pages.length > 0) {
            callbacks.addPages(refinement.pages);
          }
          if (refinement.tasks.length > 0) {
            callbacks.addTasks(refinement.tasks);
          }
        } catch (err) {
          console.warn('[AI] Phase 2 failed (Phase 1 nodes still visible):', err);
        }
      }

      setStatus('idle');
      setStreamProgress(null);
      const finishedAt = Date.now();

      return {
        rawText: text,
        startedAt,
        finishedAt,
        nodeCount: phase1.nodes.length,
        connectionCount: totalConnections,
        aiStatus: finalStatus,
        errorMessage: finalError,
        meta: {
          timings: {
            entitiesMs: phase1.entitiesMs,
            hierarchyMs: refinementTimings.matchingMs,
            relationshipsMs: refinementTimings.relationshipsMs,
            tasksMs: refinementTimings.tasksMs,
          },
          graphDensity: totalConnections / Math.max(phase1.nodes.length, 1),
          avgStrength: 0,
          promptMetrics: {
            promptA: phase1.promptMetrics ? toSummary(phase1.promptMetrics) : undefined,
            promptB: refinementPromptMetrics.promptB ? toSummary(refinementPromptMetrics.promptB) : undefined,
            promptC: refinementPromptMetrics.promptC ? toSummary(refinementPromptMetrics.promptC) : undefined,
            promptD: refinementPromptMetrics.promptD ? toSummary(refinementPromptMetrics.promptD) : undefined,
          },
        },
      };
    } catch (err) {
      console.error('[useAIExtraction]', err);
      setStatus('error');
      setStreamProgress(null);
      setTimeout(() => setStatus('idle'), 2000);
      return null;
    } finally {
      activeRef.current = false;
    }
  }, [callbacks]);

  const isProcessing = status !== 'idle' && status !== 'error' && status !== 'unavailable';

  return { submit, status, isProcessing, streamProgress };
}
