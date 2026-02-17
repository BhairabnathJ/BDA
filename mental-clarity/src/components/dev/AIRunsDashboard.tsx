import { Fragment, useState, useMemo, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { AIRunMeta, PromptMetricsSummary } from '@/types/graph';

interface RunArtifactNode {
  id: string;
  label: string;
}

interface RunArtifactConnection {
  sourceId: string;
  targetId: string;
  label: string;
  type: string;
  strength?: number;
}

interface AIRunDoc {
  _id: string;
  dumpText: string;
  inputHash?: string;
  sessionId?: string;
  mode?: string;
  backend?: string;
  quant?: string;
  promptProfileId?: string;
  quality?: {
    score?: number;
    note?: string;
  };
  artifacts?: {
    nodes?: RunArtifactNode[];
    connections?: RunArtifactConnection[];
    tasks?: { label: string; relatedTopic: string }[];
  };
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

interface ConnectionReviewDoc {
  runId: string;
  connectionKey: string;
  verdict: 'accept' | 'reject';
}

interface PromptProfileDoc {
  _id: string;
  profileId: string;
  version: string;
  templates?: {
    promptA?: string;
    promptB?: string;
    promptC?: string;
    promptD?: string;
    promptE?: string;
  };
  isActive: boolean;
}

function toConnectionKey(c: RunArtifactConnection): string {
  return `${c.sourceId}|${c.targetId}|${c.type}|${c.label}`;
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

function toGroupKey(run: AIRunDoc, withSession: boolean): string {
  const inputHash = run.inputHash ?? 'no-hash';
  if (!withSession) return inputHash;
  return `${inputHash}::${run.sessionId ?? 'no-session'}`;
}

function groupLabel(run: AIRunDoc, withSession: boolean): string {
  const hash = (run.inputHash ?? 'no-hash').slice(0, 10);
  const prefix = run.dumpText.trim().replace(/\s+/g, ' ').slice(0, 42);
  if (!withSession) return `${hash} · ${prefix}`;
  const sess = (run.sessionId ?? 'no-session').slice(0, 8);
  return `${hash}/${sess} · ${prefix}`;
}

function formatDelta(value: number): string {
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : String(value);
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
interface ChartSeries {
  label: string;
  color: string;
  values: number[];
}

function MultiLineChart({ title, series }: { title: string; series: ChartSeries[] }) {
  const pointCount = series[0]?.values.length ?? 0;
  if (pointCount < 2 || series.length === 0) return null;

  const allValues = series.flatMap((s) => s.values);
  const maxY = Math.max(...allValues, 1);
  const minY = Math.min(...allValues, 0);
  const rangeY = maxY - minY || 1;
  const w = 620;
  const h = 140;
  const pad = 24;

  const toPoints = (values: number[]) =>
    values.map((v, i) => {
      const x = pad + (i / (pointCount - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - minY) / rangeY) * (h - 2 * pad);
      return `${x},${y}`;
    });

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 4 }}>{title}</div>
      <svg
        width={w}
        height={h}
        style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 8, border: '1px solid rgba(168,197,209,0.15)' }}
      >
        <text x={pad - 4} y={pad} textAnchor="end" fontSize={9} fill="#A8A8A8">{maxY.toFixed(1)}</text>
        <text x={pad - 4} y={h - pad} textAnchor="end" fontSize={9} fill="#A8A8A8">{minY.toFixed(1)}</text>
        <line x1={pad} y1={pad} x2={w - pad} y2={pad} stroke="rgba(0,0,0,0.04)" />
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(0,0,0,0.04)" />
        {series.map((s) => {
          const points = toPoints(s.values);
          return (
            <g key={s.label}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points.join(' ')}
              />
              {points.map((p, i) => {
                const [cx, cy] = p.split(',');
                return <circle key={`${s.label}_${i}`} cx={cx} cy={cy} r={2.2} fill={s.color} />;
              })}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
        {series.map((s) => (
          <span key={`${title}_${s.label}`} style={{ fontSize: 10, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 10, background: s.color, display: 'inline-block' }} />
            {s.label}
          </span>
        ))}
      </div>
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
  'ΔDur', 'ΔConns', 'tok/s (A)', 'Tokens', 'Entities', 'Relations', 'Tasks', 'Model',
];

export function AIRunsDashboard({
  onClose,
  onRerunBenchmark,
}: {
  onClose: () => void;
  onRerunBenchmark?: (text: string, sessionId?: string) => void | Promise<void>;
}) {
  const anyApi = api as any;
  const rawRuns = useQuery(api.aiRuns.listRuns, { limit: 200 });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [backendFilter, setBackendFilter] = useState<string>('all');
  const [quantFilter, setQuantFilter] = useState<string>('all');
  const [groupWithSession, setGroupWithSession] = useState<boolean>(true);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('all');
  const [baselineId, setBaselineId] = useState<string>('latest');
  const [chartMetric, setChartMetric] = useState<'durationMs' | 'nodeCount'>('durationMs');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newProfileId, setNewProfileId] = useState<string>('experiment/topics');
  const [newProfileVersion, setNewProfileVersion] = useState<string>('v2');
  const upsertConnectionReview = useMutation(anyApi.connectionReviews.upsertReview as any) as (args: any) => Promise<unknown>;
  const setRunQuality = useMutation(anyApi.aiRuns.setRunQuality as any) as (args: any) => Promise<unknown>;
  const setActivePromptProfile = useMutation(anyApi.promptProfiles.setActiveProfile as any) as (args: any) => Promise<unknown>;
  const upsertPromptProfile = useMutation(anyApi.promptProfiles.upsertProfile as any) as (args: any) => Promise<unknown>;
  const promptProfiles = useQuery(anyApi.promptProfiles.listProfiles as any, {}) as PromptProfileDoc[] | undefined;

  const allRuns = useMemo(() => {
    if (!rawRuns) return [];
    return rawRuns as unknown as AIRunDoc[];
  }, [rawRuns]);

  const filteredRuns = useMemo(() => {
    return allRuns.filter((r) => {
      if (statusFilter !== 'all' && r.aiStatus !== statusFilter) return false;
      if (backendFilter !== 'all' && (r.backend ?? 'unknown') !== backendFilter) return false;
      if (quantFilter !== 'all' && (r.quant ?? 'unknown') !== quantFilter) return false;
      return true;
    });
  }, [allRuns, statusFilter, backendFilter, quantFilter]);

  const groupOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { key: string; label: string }[] = [];
    for (const run of filteredRuns) {
      const key = toGroupKey(run, groupWithSession);
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({ key, label: groupLabel(run, groupWithSession) });
    }
    return options;
  }, [filteredRuns, groupWithSession]);

  useEffect(() => {
    if (selectedGroupKey === 'all') return;
    if (!groupOptions.some((opt) => opt.key === selectedGroupKey)) {
      setSelectedGroupKey('all');
    }
  }, [groupOptions, selectedGroupKey]);

  const runs = useMemo(() => {
    if (selectedGroupKey === 'all') return filteredRuns;
    return filteredRuns.filter((r) => toGroupKey(r, groupWithSession) === selectedGroupKey);
  }, [filteredRuns, groupWithSession, selectedGroupKey]);

  useEffect(() => {
    if (runs.length === 0) return;
    if (baselineId === 'latest') return;
    if (!runs.some((r) => r._id === baselineId)) {
      setBaselineId('latest');
    }
  }, [runs, baselineId]);

  const baselineRun = useMemo(() => {
    if (runs.length === 0) return null;
    if (baselineId === 'latest') return runs[0];
    return runs.find((r) => r._id === baselineId) ?? runs[0];
  }, [runs, baselineId]);

  const expandedRun = useMemo(
    () => runs.find((r) => r._id === expandedId) ?? null,
    [runs, expandedId],
  );

  const activeReviews = useQuery(
    anyApi.connectionReviews.listByRun as any,
    expandedRun ? { runId: expandedRun._id as never } : "skip",
  ) as ConnectionReviewDoc[] | undefined;

  const runReviews = useQuery(
    anyApi.connectionReviews.listByRunIds as any,
    runs.length > 0 ? { runIds: runs.map((r) => r._id as never) } : "skip",
  ) as ConnectionReviewDoc[] | undefined;

  const reviewMap = useMemo(
    () => new Map((activeReviews ?? []).map((r) => [r.connectionKey, r.verdict])),
    [activeReviews],
  );

  const reviewCountsByRun = useMemo(() => {
    const counts = new Map<string, { accept: number; reject: number }>();
    for (const rr of runReviews ?? []) {
      const current = counts.get(rr.runId) ?? { accept: 0, reject: 0 };
      if (rr.verdict === 'accept') current.accept += 1;
      if (rr.verdict === 'reject') current.reject += 1;
      counts.set(rr.runId, current);
    }
    return counts;
  }, [runReviews]);

  const chartRuns = useMemo(
    () => [...runs].slice(0, 40).sort((a, b) => a.finishedAt - b.finishedAt),
    [runs],
  );

  const runStatsByProfile = useMemo(() => {
    const stats = new Map<string, { count: number; avgDuration: number; avgQuality: number }>();
    const accum = new Map<string, { count: number; duration: number; qualitySum: number; qualityCount: number }>();
    for (const run of allRuns) {
      const profileKey = run.promptProfileId ?? 'default/topics_v1';
      const current = accum.get(profileKey) ?? { count: 0, duration: 0, qualitySum: 0, qualityCount: 0 };
      current.count += 1;
      current.duration += run.durationMs;
      if (typeof run.quality?.score === 'number') {
        current.qualitySum += run.quality.score;
        current.qualityCount += 1;
      }
      accum.set(profileKey, current);
    }
    for (const [key, value] of accum.entries()) {
      stats.set(key, {
        count: value.count,
        avgDuration: value.duration / Math.max(value.count, 1),
        avgQuality: value.qualitySum / Math.max(value.qualityCount, 1),
      });
    }
    return stats;
  }, [allRuns]);

  const handleExport = useCallback(() => {
    exportCSV(runs);
  }, [runs]);

  const durationSeries = useMemo<ChartSeries[]>(
    () => [
      {
        label: chartMetric === 'durationMs' ? 'Duration (ms)' : 'Node Count',
        color: '#8BA5B8',
        values: chartRuns.map((r) => chartMetric === 'durationMs' ? r.durationMs : r.nodeCount),
      },
    ],
    [chartMetric, chartRuns],
  );

  const qualitySeries = useMemo<ChartSeries[]>(() => {
    const scored = chartRuns.filter((r) => typeof r.quality?.score === 'number');
    if (scored.length < 2) return [];
    return [{
      label: 'Human quality',
      color: '#7FB89F',
      values: scored.map((r) => r.quality?.score ?? 0),
    }];
  }, [chartRuns]);

  const outputSeries = useMemo<ChartSeries[]>(
    () => [
      { label: 'Nodes', color: '#8BA5B8', values: chartRuns.map((r) => r.nodeCount) },
      { label: 'Conns', color: '#C58F8F', values: chartRuns.map((r) => r.connectionCount) },
      { label: 'Tasks', color: '#D4A87F', values: chartRuns.map((r) => r.artifacts?.tasks?.length ?? 0) },
    ],
    [chartRuns],
  );

  const connectionReviewSeries = useMemo<ChartSeries[]>(
    () => [
      {
        label: 'Accepted',
        color: '#7FB89F',
        values: chartRuns.map((r) => reviewCountsByRun.get(r._id)?.accept ?? 0),
      },
      {
        label: 'Rejected',
        color: '#C58F8F',
        values: chartRuns.map((r) => reviewCountsByRun.get(r._id)?.reject ?? 0),
      },
    ],
    [chartRuns, reviewCountsByRun],
  );

  const baselineDeltas = useMemo(() => {
    if (!baselineRun || runs.length === 0) return null;
    const latest = runs[0];
    const latestQuality = latest.quality?.score ?? 0;
    const baselineQuality = baselineRun.quality?.score ?? 0;
    return {
      durationMs: latest.durationMs - baselineRun.durationMs,
      nodeCount: latest.nodeCount - baselineRun.nodeCount,
      connectionCount: latest.connectionCount - baselineRun.connectionCount,
      taskCount: (latest.artifacts?.tasks?.length ?? 0) - (baselineRun.artifacts?.tasks?.length ?? 0),
      quality: latestQuality - baselineQuality,
    };
  }, [baselineRun, runs]);

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
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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

          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 16 }}>Group:</label>
          <select
            value={selectedGroupKey}
            onChange={(e) => setSelectedGroupKey(e.target.value)}
            style={{
              border: '1px solid rgba(168,197,209,0.3)',
              background: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'inherit',
              minWidth: 220,
            }}
          >
            <option value="all">All inputs</option>
            {groupOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>

          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 12 }}>Session split:</label>
          <input
            type="checkbox"
            checked={groupWithSession}
            onChange={(e) => setGroupWithSession(e.target.checked)}
          />

          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 16 }}>Baseline:</label>
          <select
            value={baselineId}
            onChange={(e) => setBaselineId(e.target.value)}
            style={{
              border: '1px solid rgba(168,197,209,0.3)',
              background: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'inherit',
              minWidth: 180,
            }}
          >
            <option value="latest">Latest in view</option>
            {runs.map((r) => (
              <option key={r._id} value={r._id}>
                {formatDate(r.finishedAt)}
              </option>
            ))}
          </select>
        </div>

        {baselineRun && (
          <div
            style={{
              marginBottom: 14,
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              background: 'rgba(168,197,209,0.06)',
              border: '1px solid rgba(168,197,209,0.12)',
              borderRadius: 6,
              padding: '8px 10px',
            }}
          >
            Baseline: {formatDate(baselineRun.finishedAt)} · {baselineRun.durationMs}ms · {baselineRun.nodeCount} nodes · {baselineRun.connectionCount} conns
          </div>
        )}
        {baselineDeltas && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, border: '1px solid rgba(168,197,209,0.15)', borderRadius: 6, padding: '5px 8px' }}>
              Δ Duration: {formatDelta(baselineDeltas.durationMs)}ms
            </span>
            <span style={{ fontSize: 11, border: '1px solid rgba(168,197,209,0.15)', borderRadius: 6, padding: '5px 8px' }}>
              Δ Quality: {formatDelta(Number(baselineDeltas.quality.toFixed(1)))}
            </span>
            <span style={{ fontSize: 11, border: '1px solid rgba(168,197,209,0.15)', borderRadius: 6, padding: '5px 8px' }}>
              Δ Nodes: {formatDelta(baselineDeltas.nodeCount)}
            </span>
            <span style={{ fontSize: 11, border: '1px solid rgba(168,197,209,0.15)', borderRadius: 6, padding: '5px 8px' }}>
              Δ Conns: {formatDelta(baselineDeltas.connectionCount)}
            </span>
            <span style={{ fontSize: 11, border: '1px solid rgba(168,197,209,0.15)', borderRadius: 6, padding: '5px 8px' }}>
              Δ Tasks: {formatDelta(baselineDeltas.taskCount)}
            </span>
          </div>
        )}

        <div
          style={{
            marginBottom: 16,
            border: '1px solid rgba(168,197,209,0.12)',
            borderRadius: 8,
            padding: '10px 12px',
            background: 'rgba(168,197,209,0.04)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }}>
            Prompt Profiles (experiment loop)
          </div>
          <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
            {(promptProfiles ?? []).map((profile) => {
              const profileKey = `${profile.profileId}@${profile.version}`;
              const stats = runStatsByProfile.get(profileKey);
              return (
                <div
                  key={profile._id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255,255,255,0.45)',
                    border: '1px solid rgba(168,197,209,0.12)',
                    borderRadius: 6,
                    padding: '6px 8px',
                  }}
                >
                  <div style={{ fontSize: 11 }}>
                    <span style={{ fontWeight: 600 }}>{profileKey}</span>
                    {profile.isActive && (
                      <span style={{ marginLeft: 8, color: 'var(--color-success)', fontWeight: 600 }}>
                        ACTIVE
                      </span>
                    )}
                    <span style={{ marginLeft: 10, color: 'var(--color-text-disabled)' }}>
                      runs: {stats?.count ?? 0} · avg latency: {stats ? `${Math.round(stats.avgDuration)}ms` : '-'} · avg quality: {stats ? stats.avgQuality.toFixed(2) : '-'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setActivePromptProfile({ profileId: profile.profileId }).catch((err: unknown) =>
                        console.error('[PromptProfiles] Failed to set active profile:', err),
                      );
                    }}
                    style={{
                      border: '1px solid rgba(168,197,209,0.25)',
                      background: profile.isActive ? 'rgba(127,184,159,0.22)' : 'rgba(168,197,209,0.1)',
                      borderRadius: 6,
                      padding: '3px 9px',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {profile.isActive ? 'Selected' : 'Set Active'}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={newProfileId}
              onChange={(e) => setNewProfileId(e.target.value)}
              placeholder="profile id"
              style={{
                border: '1px solid rgba(168,197,209,0.28)',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                minWidth: 160,
              }}
            />
            <input
              value={newProfileVersion}
              onChange={(e) => setNewProfileVersion(e.target.value)}
              placeholder="version"
              style={{
                border: '1px solid rgba(168,197,209,0.28)',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                width: 90,
              }}
            />
            <button
              onClick={() => {
                const active = (promptProfiles ?? []).find((p) => p.isActive);
                upsertPromptProfile({
                  profileId: newProfileId.trim() || 'experiment/topics',
                  version: newProfileVersion.trim() || 'v2',
                  templates: active?.templates ?? {},
                  makeActive: false,
                }).catch((err: unknown) =>
                  console.error('[PromptProfiles] Failed to create profile:', err),
                );
              }}
              style={{
                border: '1px solid rgba(168,197,209,0.25)',
                background: 'rgba(168,197,209,0.12)',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Create Variant
            </button>
          </div>
        </div>

        {/* Charts */}
        <MultiLineChart
          title={chartMetric === 'durationMs' ? 'Duration over time' : 'Node count over time'}
          series={durationSeries}
        />
        {qualitySeries.length > 0 ? (
          <MultiLineChart title="Human quality score over time" series={qualitySeries} />
        ) : (
          <div style={{ marginBottom: 12, fontSize: 11, color: 'var(--color-text-disabled)' }}>
            Quality chart appears after at least two runs are scored.
          </div>
        )}
        <MultiLineChart title="Output counts trend (nodes/connections/tasks)" series={outputSeries} />
        <MultiLineChart title="Accepted vs rejected connections" series={connectionReviewSeries} />

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
                  const baselineDurationDelta = baselineRun ? run.durationMs - baselineRun.durationMs : 0;
                  const baselineConnDelta = baselineRun ? run.connectionCount - baselineRun.connectionCount : 0;

                  return (
                    <Fragment key={run._id}>
                      <tr
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
                        <td style={{ ...tdStyle, color: baselineDurationDelta <= 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                          {formatDelta(baselineDurationDelta)}ms
                        </td>
                        <td style={{ ...tdStyle, color: baselineConnDelta >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                          {formatDelta(baselineConnDelta)}
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
                            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-disabled)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span>Quality:</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRunQuality({ runId: run._id, score: 1 }).catch((err: unknown) => console.error('[Quality] Failed to set score:', err));
                                }}
                                style={{
                                  border: '1px solid rgba(168,197,209,0.25)',
                                  background: run.quality?.score === 1 ? 'rgba(127,184,159,0.24)' : 'rgba(168,197,209,0.1)',
                                  borderRadius: 6,
                                  padding: '2px 7px',
                                  fontSize: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                1
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRunQuality({ runId: run._id, score: 2 }).catch((err: unknown) => console.error('[Quality] Failed to set score:', err));
                                }}
                                style={{
                                  border: '1px solid rgba(168,197,209,0.25)',
                                  background: run.quality?.score === 2 ? 'rgba(127,184,159,0.24)' : 'rgba(168,197,209,0.1)',
                                  borderRadius: 6,
                                  padding: '2px 7px',
                                  fontSize: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                2
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRunQuality({ runId: run._id, score: 3 }).catch((err: unknown) => console.error('[Quality] Failed to set score:', err));
                                }}
                                style={{
                                  border: '1px solid rgba(168,197,209,0.25)',
                                  background: run.quality?.score === 3 ? 'rgba(127,184,159,0.24)' : 'rgba(168,197,209,0.1)',
                                  borderRadius: 6,
                                  padding: '2px 7px',
                                  fontSize: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                3
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRunQuality({ runId: run._id, score: 4 }).catch((err: unknown) => console.error('[Quality] Failed to set score:', err));
                                }}
                                style={{
                                  border: '1px solid rgba(168,197,209,0.25)',
                                  background: run.quality?.score === 4 ? 'rgba(127,184,159,0.24)' : 'rgba(168,197,209,0.1)',
                                  borderRadius: 6,
                                  padding: '2px 7px',
                                  fontSize: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                4
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRunQuality({ runId: run._id, score: 5 }).catch((err: unknown) => console.error('[Quality] Failed to set score:', err));
                                }}
                                style={{
                                  border: '1px solid rgba(168,197,209,0.25)',
                                  background: run.quality?.score === 5 ? 'rgba(127,184,159,0.24)' : 'rgba(168,197,209,0.1)',
                                  borderRadius: 6,
                                  padding: '2px 7px',
                                  fontSize: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                5
                              </button>
                              <span style={{ marginLeft: 4 }}>
                                {run.quality?.score ? `Current ${run.quality.score}/5` : 'Unscored'}
                              </span>
                            </div>
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                                Connection Labels
                              </div>
                              {(run.artifacts?.connections?.length ?? 0) === 0 ? (
                                <div style={{ fontSize: 11, color: 'var(--color-text-disabled)' }}>
                                  No connection artifacts captured for this run.
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gap: 6 }}>
                                  {run.artifacts?.connections?.map((c, idx) => {
                                    const nodeMap = new Map((run.artifacts?.nodes ?? []).map((n) => [n.id, n.label]));
                                    const sourceLabel = nodeMap.get(c.sourceId) ?? c.sourceId;
                                    const targetLabel = nodeMap.get(c.targetId) ?? c.targetId;
                                    const key = toConnectionKey(c);
                                    const verdict = run._id === expandedRun?._id ? reviewMap.get(key) : undefined;

                                    return (
                                      <div
                                        key={`${key}_${idx}`}
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: '1fr auto',
                                          gap: 10,
                                          alignItems: 'center',
                                          background: 'rgba(255,255,255,0.5)',
                                          border: '1px solid rgba(168,197,209,0.12)',
                                          borderRadius: 6,
                                          padding: '7px 9px',
                                        }}
                                      >
                                        <div style={{ fontSize: 11 }}>
                                          <span style={{ fontWeight: 600 }}>{sourceLabel}</span>
                                          <span style={{ color: 'var(--color-text-disabled)' }}> → </span>
                                          <span style={{ fontWeight: 600 }}>{targetLabel}</span>
                                          <span style={{ color: 'var(--color-text-disabled)' }}> · {c.type} · </span>
                                          <span>{c.label}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              upsertConnectionReview({
                                                runId: run._id as never,
                                                connectionKey: key,
                                                sourceLabel,
                                                targetLabel,
                                                type: c.type,
                                                label: c.label,
                                                verdict: 'accept',
                                                reviewer: 'manual',
                                              }).catch((err: unknown) => console.error('[Reviews] Failed to upsert accept:', err));
                                            }}
                                            style={{
                                              border: '1px solid rgba(127,184,159,0.4)',
                                              background: verdict === 'accept' ? 'rgba(127,184,159,0.24)' : 'rgba(127,184,159,0.12)',
                                              color: 'var(--color-success)',
                                              borderRadius: 6,
                                              padding: '3px 8px',
                                              fontSize: 10,
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            Accept
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              upsertConnectionReview({
                                                runId: run._id as never,
                                                connectionKey: key,
                                                sourceLabel,
                                                targetLabel,
                                                type: c.type,
                                                label: c.label,
                                                verdict: 'reject',
                                                reviewer: 'manual',
                                              }).catch((err: unknown) => console.error('[Reviews] Failed to upsert reject:', err));
                                            }}
                                            style={{
                                              border: '1px solid rgba(197,143,143,0.4)',
                                              background: verdict === 'reject' ? 'rgba(197,143,143,0.22)' : 'rgba(197,143,143,0.12)',
                                              color: 'var(--color-error)',
                                              borderRadius: 6,
                                              padding: '3px 8px',
                                              fontSize: 10,
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
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
                    </Fragment>
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
