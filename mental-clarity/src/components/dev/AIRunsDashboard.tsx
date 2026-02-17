import { useState, useMemo, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { AIRunMeta, PromptMetricsSummary } from '@/types/graph';

interface AIRunDoc {
  _id: string;
  dumpText: string;
  sessionId?: string;
  mode?: string;
  backend?: string;
  quant?: string;
  model: string;
  promptVersion: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  nodeCount: number;
  connectionCount: number;
  aiStatus: string;
  errorMessage?: string;
  meta?: AIRunMeta;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function exportCSV(runs: AIRunDoc[]): void {
  const headers = [
    'finishedAt',
    'durationMs',
    'nodeCount',
    'connectionCount',
    'aiStatus',
    'graphDensity',
    'avgStrength',
    'promptVersion',
    'model',
    'entitiesMs',
    'relationshipsMs',
    'tasksMs',
    'promptA_tokens',
    'promptA_tokPerSec',
    'promptA_ttft',
    'promptB_tokens',
    'promptB_tokPerSec',
    'promptC_tokens',
    'promptC_tokPerSec',
    'promptD_tokens',
    'promptD_tokPerSec',
    'errorMessage',
  ];

  const pm = (r: AIRunDoc, key: 'promptA' | 'promptB' | 'promptC' | 'promptD') =>
    r.meta?.promptMetrics?.[key];

  const rows = runs.map((r) => [
    new Date(r.finishedAt).toISOString(),
    r.durationMs,
    r.nodeCount,
    r.connectionCount,
    r.aiStatus,
    r.meta?.graphDensity ?? '',
    r.meta?.avgStrength ?? '',
    r.promptVersion,
    r.model,
    r.meta?.timings?.entitiesMs ?? '',
    r.meta?.timings?.relationshipsMs ?? '',
    r.meta?.timings?.tasksMs ?? '',
    pm(r, 'promptA')?.evalTokens ?? '',
    pm(r, 'promptA')?.tokensPerSec?.toFixed(1) ?? '',
    pm(r, 'promptA')?.timeToFirstTokenMs?.toFixed(0) ?? '',
    pm(r, 'promptB')?.evalTokens ?? '',
    pm(r, 'promptB')?.tokensPerSec?.toFixed(1) ?? '',
    pm(r, 'promptC')?.evalTokens ?? '',
    pm(r, 'promptC')?.tokensPerSec?.toFixed(1) ?? '',
    pm(r, 'promptD')?.evalTokens ?? '',
    pm(r, 'promptD')?.tokensPerSec?.toFixed(1) ?? '',
    r.errorMessage ?? '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((v) => {
        const s = String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-runs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Mini SVG line chart
function MiniChart({ runs, yKey }: { runs: AIRunDoc[]; yKey: 'durationMs' | 'nodeCount' }) {
  if (runs.length < 2) return null;

  const sorted = [...runs].sort((a, b) => a.finishedAt - b.finishedAt);
  const values = sorted.map((r) => r[yKey]);
  const maxY = Math.max(...values, 1);
  const minY = Math.min(...values, 0);
  const rangeY = maxY - minY || 1;

  const w = 600;
  const h = 120;
  const pad = 24;

  const points = sorted.map((_, i) => {
    const x = pad + (i / (sorted.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((values[i] - minY) / rangeY) * (h - 2 * pad);
    return `${x},${y}`;
  });

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 4 }}>
        {yKey === 'durationMs' ? 'Duration (ms)' : 'Node Count'} over time
      </div>
      <svg width={w} height={h} style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 8, border: '1px solid rgba(168,197,209,0.15)' }}>
        {/* Y-axis labels */}
        <text x={pad - 4} y={pad} textAnchor="end" fontSize={9} fill="#A8A8A8">{maxY}</text>
        <text x={pad - 4} y={h - pad} textAnchor="end" fontSize={9} fill="#A8A8A8">{minY}</text>
        {/* Grid lines */}
        <line x1={pad} y1={pad} x2={w - pad} y2={pad} stroke="rgba(0,0,0,0.04)" />
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(0,0,0,0.04)" />
        {/* Line */}
        <polyline
          fill="none"
          stroke="#A8C5D1"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points.join(' ')}
        />
        {/* Dots */}
        {points.map((p, i) => {
          const [cx, cy] = p.split(',');
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={3}
              fill="#8BA5B8"
            />
          );
        })}
      </svg>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontVariantNumeric: 'tabular-nums',
};

function PromptMetricCard({ label, metrics }: { label: string; metrics?: PromptMetricsSummary }) {
  if (!metrics) return null;
  return (
    <div style={{
      background: 'rgba(168,197,209,0.06)',
      border: '1px solid rgba(168,197,209,0.12)',
      borderRadius: 6,
      padding: '8px 12px',
      minWidth: 140,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary-dark)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', fontSize: 11 }}>
        <span style={{ color: 'var(--color-text-disabled)' }}>Tokens</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{metrics.evalTokens}</span>
        <span style={{ color: 'var(--color-text-disabled)' }}>Prompt</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{metrics.promptTokens}</span>
        <span style={{ color: 'var(--color-text-disabled)' }}>tok/s</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{metrics.tokensPerSec.toFixed(1)}</span>
        <span style={{ color: 'var(--color-text-disabled)' }}>TTFT</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{metrics.timeToFirstTokenMs.toFixed(0)}ms</span>
        <span style={{ color: 'var(--color-text-disabled)' }}>Eval</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{(metrics.evalDurationMs / 1000).toFixed(1)}s</span>
        <span style={{ color: 'var(--color-text-disabled)' }}>Total</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{(metrics.totalDurationMs / 1000).toFixed(1)}s</span>
      </div>
    </div>
  );
}

const COLUMN_HEADERS = [
  '', 'Finished At', 'Duration', 'Nodes', 'Conns', 'Status',
  'tok/s (A)', 'Tokens', 'Entities', 'Relations', 'Tasks', 'Model',
];

export function AIRunsDashboard({
  onClose,
  onRerunBenchmark,
}: {
  onClose: () => void;
  onRerunBenchmark?: (text: string, sessionId?: string) => void | Promise<void>;
}) {
  const rawRuns = useQuery(api.aiRuns.listRuns, { limit: 200 });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [backendFilter, setBackendFilter] = useState<string>('all');
  const [quantFilter, setQuantFilter] = useState<string>('all');
  const [chartMetric, setChartMetric] = useState<'durationMs' | 'nodeCount'>('durationMs');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runs = useMemo(() => {
    if (!rawRuns) return [];
    const typed = rawRuns as unknown as AIRunDoc[];
    return typed.filter((r) => {
      if (statusFilter !== 'all' && r.aiStatus !== statusFilter) return false;
      if (backendFilter !== 'all' && (r.backend ?? 'unknown') !== backendFilter) return false;
      if (quantFilter !== 'all' && (r.quant ?? 'unknown') !== quantFilter) return false;
      return true;
    });
  }, [rawRuns, statusFilter, backendFilter, quantFilter]);

  const handleExport = useCallback(() => {
    exportCSV(runs);
  }, [runs]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      background: 'var(--color-bg-base)',
      overflow: 'auto',
      fontFamily: 'var(--font-family-primary)',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        background: 'var(--color-bg-base)',
        borderBottom: '1px solid rgba(168,197,209,0.15)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            AI Runs Dashboard
          </h2>
          <span style={{
            fontSize: 11,
            color: 'var(--color-text-disabled)',
            background: 'rgba(0,0,0,0.04)',
            padding: '2px 8px',
            borderRadius: 10,
          }}>
            {runs.length} run{runs.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleExport}
            style={{
              border: '1px solid rgba(168,197,209,0.3)',
              background: 'rgba(168,197,209,0.08)',
              color: 'var(--color-primary-dark)',
              padding: '6px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            Export CSV
          </button>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'rgba(0,0,0,0.06)',
              color: 'var(--color-text-secondary)',
              width: 32,
              height: 32,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {'\u2715'}
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 24px', maxWidth: 1200 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              border: '1px solid rgba(168,197,209,0.3)',
              background: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="fallback">Fallback</option>
            <option value="error">Error</option>
          </select>

          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 16 }}>Backend:</label>
          <select
            value={backendFilter}
            onChange={(e) => setBackendFilter(e.target.value)}
            style={{
              border: '1px solid rgba(168,197,209,0.3)',
              background: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            <option value="all">All</option>
            <option value="mlx">MLX</option>
            <option value="ollama">Ollama</option>
            <option value="unknown">Unknown</option>
          </select>

          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 16 }}>Quant:</label>
          <select
            value={quantFilter}
            onChange={(e) => setQuantFilter(e.target.value)}
            style={{
              border: '1px solid rgba(168,197,209,0.3)',
              background: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            <option value="all">All</option>
            <option value="q8">q8</option>
            <option value="q6">q6</option>
            <option value="q4-fallback">q4-fallback</option>
            <option value="unknown">Unknown</option>
          </select>

          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 16 }}>Chart:</label>
          <select
            value={chartMetric}
            onChange={(e) => setChartMetric(e.target.value as 'durationMs' | 'nodeCount')}
            style={{
              border: '1px solid rgba(168,197,209,0.3)',
              background: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            <option value="durationMs">Duration (ms)</option>
            <option value="nodeCount">Node Count</option>
          </select>
        </div>

        {/* Chart */}
        <MiniChart runs={runs} yKey={chartMetric} />

        {/* Table */}
        {rawRuns === undefined ? (
          <div style={{ color: 'var(--color-text-disabled)', padding: 32, textAlign: 'center' }}>
            Loading...
          </div>
        ) : runs.length === 0 ? (
          <div style={{ color: 'var(--color-text-disabled)', padding: 32, textAlign: 'center' }}>
            No AI runs recorded yet. Add a brain dump to generate data.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(168,197,209,0.2)' }}>
                  {COLUMN_HEADERS.map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const isExpanded = expandedId === run._id;
                  const pm = run.meta?.promptMetrics;
                  const totalTokens = (pm?.promptA?.evalTokens ?? 0) +
                    (pm?.promptB?.evalTokens ?? 0) +
                    (pm?.promptC?.evalTokens ?? 0) +
                    (pm?.promptD?.evalTokens ?? 0);

                  return (
                    <>
                      <tr
                        key={run._id}
                        onClick={() => setExpandedId(isExpanded ? null : run._id)}
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid rgba(168,197,209,0.1)',
                          cursor: 'pointer',
                          background: isExpanded ? 'rgba(168,197,209,0.04)' : undefined,
                        }}
                      >
                        <td style={{ ...tdStyle, width: 20, fontSize: 10, color: 'var(--color-text-disabled)' }}>
                          {isExpanded ? '\u25BC' : '\u25B6'}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(run.finishedAt)}</td>
                        <td style={tdStyle}>{run.durationMs}ms</td>
                        <td style={tdStyle}>{run.nodeCount}</td>
                        <td style={tdStyle}>{run.connectionCount}</td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 500,
                            background: run.aiStatus === 'success'
                              ? 'rgba(127, 184, 159, 0.15)'
                              : run.aiStatus === 'fallback'
                              ? 'rgba(212, 168, 127, 0.15)'
                              : 'rgba(197, 143, 143, 0.15)',
                            color: run.aiStatus === 'success'
                              ? 'var(--color-success)'
                              : run.aiStatus === 'fallback'
                              ? 'var(--color-warning)'
                              : 'var(--color-error)',
                          }}>
                            {run.aiStatus}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>
                          {pm?.promptA?.tokensPerSec ? `${pm.promptA.tokensPerSec.toFixed(1)}` : '-'}
                        </td>
                        <td style={tdStyle}>
                          {totalTokens > 0 ? totalTokens : '-'}
                        </td>
                        <td style={tdStyle}>{run.meta?.timings?.entitiesMs ?? '-'}</td>
                        <td style={tdStyle}>{run.meta?.timings?.relationshipsMs ?? '-'}</td>
                        <td style={tdStyle}>{run.meta?.timings?.tasksMs ?? '-'}</td>
                        <td style={{ ...tdStyle, fontSize: 11, color: 'var(--color-text-disabled)' }}>{run.model}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${run._id}-detail`} style={{ borderBottom: '1px solid rgba(168,197,209,0.1)' }}>
                          <td colSpan={COLUMN_HEADERS.length} style={{ padding: '8px 10px 16px 30px', background: 'rgba(168,197,209,0.04)' }}>
                            {pm && (pm.promptA || pm.promptB || pm.promptC || pm.promptD) ? (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                                  Per-Prompt LLM Metrics
                                </div>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                  <PromptMetricCard label="A: Topics" metrics={pm.promptA} />
                                  <PromptMetricCard label="B: Matching" metrics={pm.promptB} />
                                  <PromptMetricCard label="C: Relations" metrics={pm.promptC} />
                                  <PromptMetricCard label="D: Tasks" metrics={pm.promptD} />
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: 'var(--color-text-disabled)' }}>
                                No per-prompt metrics available for this run.
                              </div>
                            )}
                            {run.errorMessage && (
                              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-error)' }}>
                                Error: {run.errorMessage}
                              </div>
                            )}
                            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-disabled)' }}>
                              Backend: {run.backend ?? 'unknown'} · Quant: {run.quant ?? 'unknown'}
                            </div>
                            {onRerunBenchmark && (
                              <div style={{ marginTop: 10 }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRerunBenchmark(run.dumpText, run.sessionId);
                                  }}
                                  style={{
                                    border: '1px solid rgba(168,197,209,0.25)',
                                    background: 'rgba(168,197,209,0.10)',
                                    color: 'var(--color-primary-dark)',
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    fontWeight: 600,
                                  }}
                                >
                                  Rerun Benchmark
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
