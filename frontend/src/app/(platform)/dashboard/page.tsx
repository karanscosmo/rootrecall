'use client';

// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · Dashboard — Global Operations Overview
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '@/store';
import { formatDuration, getSeverityColor, formatTimestamp } from '@/lib/telemetry';
import type { Incident, Metric } from '@/lib/telemetry';
import { cn, formatRelativeTime } from '@/lib/utils';

// ─── Metadata (works as a named export even in 'use client' for Next 14+) ────
// Removed metadata export as it causes build error in Next 15+ Client Components
// ─── Severity badge helper ────────────────────────────────────────────────────
function SevBadge({ sev }: { sev: Incident['severity'] }) {
  const cls = {
    'SEV-1': 'bg-rr-error/10 border border-rr-error/30 text-rr-error',
    'SEV-2': 'bg-orange-500/10 border border-orange-500/30 text-orange-400',
    'SEV-3': 'bg-rr-warn/10 border border-rr-warn/30 text-rr-warn',
    'SEV-4': 'bg-rr-muted/10 border border-rr-muted/30 text-rr-muted',
  }[sev];
  return (
    <span className={cn('font-mono text-[10px] font-bold px-2 py-0.5 rounded', cls)}>
      {sev}
    </span>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: Incident['status'] }) {
  const map: Record<Incident['status'], string> = {
    active: 'text-rr-error',
    investigating: 'text-orange-400',
    mitigated: 'text-rr-warn',
    resolved: 'text-rr-green',
  };
  return (
    <span className={cn('font-mono text-[10px] uppercase tracking-wider', map[status])}>
      {status}
    </span>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
  pulse?: boolean;
}

function MetricCard({ icon, label, value, sub, valueClass, pulse }: MetricCardProps) {
  return (
    <div className="bg-rr-surface border border-rr-border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-rr-muted">{label}</span>
        <span
          className="material-symbols-outlined text-rr-muted"
          style={{ fontSize: 16, fontVariationSettings: "'FILL' 0" }}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span
          className={cn(
            'font-mono text-3xl font-bold leading-none',
            pulse && 'metric-live',
            valueClass ?? 'text-rr-text',
          )}
        >
          {value}
        </span>
      </div>
      {sub && <p className="font-mono text-[11px] text-rr-muted">{sub}</p>}
    </div>
  );
}

// ─── Custom tooltip for chart ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="bg-rr-surface border border-rr-border rounded-md px-3 py-2 font-mono text-[11px] text-rr-text shadow-lg">
      <p className="text-rr-muted mb-1">{label}</p>
      <p className="text-rr-green font-bold">{typeof val === 'number' ? val.toFixed(1) : val}</p>
    </div>
  );
}

// ─── Chart tabs config ────────────────────────────────────────────────────────
type ChartTab = 'latency' | 'cpu' | 'errors';

const CHART_TABS: { id: ChartTab; label: string; key: keyof Metric; unit: string }[] = [
  { id: 'latency', label: 'Latency P99', key: 'latencyP99', unit: 'ms' },
  { id: 'cpu',     label: 'CPU',         key: 'cpuUsage',   unit: '%' },
  { id: 'errors',  label: 'Error Rate',  key: 'errorRate',  unit: '%' },
];

  export default function DashboardPage() {
  const router = useRouter();
  const { incidents, aiMemories, metrics, viewMode, setViewMode, startLiveEngine, stopLiveEngine } = useStore();

  const [chartTab, setChartTab] = useState<ChartTab>('latency');
  const [now, setNow] = useState(() => new Date());

  // Keep live clock for durations
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Start live engine on mount
  useEffect(() => {
    startLiveEngine();
    return () => stopLiveEngine();
  }, [startLiveEngine, stopLiveEngine]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const activeIncidents = incidents.filter((i) => i.status === 'active' || i.status === 'investigating');
  const activeCount = activeIncidents.length;

  // ── Chart data ───────────────────────────────────────────────────────────
  const activeTab = CHART_TABS.find((t) => t.id === chartTab) ?? CHART_TABS[0];

  const chartData = metrics.map((m) => ({
    t: new Date(m.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    value: m[activeTab.key] as number,
  }));

  // ── Navigate on row click ────────────────────────────────────────────────
  const gotoIncident = useCallback(
    (id: string) => router.push(`/incidents/${id}`),
    [router],
  );

  return (
    <div className="min-h-full bg-transparent p-6 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {/* Live pulse dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rr-green opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rr-green" />
            </span>
            <h1 className="font-mono text-headline-md text-rr-text tracking-tight animate-fade-in">
              Global Operations Overview
            </h1>
          </div>
          <p className="font-mono text-[12px] text-rr-muted pl-[22px]">
            {viewMode === "tech" ? "Real-time system health and intelligence analysis" : "Business SLA risk and executive intelligence summary"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Switcher Toggle */}
          <div className="flex items-center gap-1 bg-rr-surface border border-rr-border rounded-md p-1">
            <button
              onClick={() => setViewMode("tech")}
              className={cn(
                "font-mono text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded transition-all duration-300 flex items-center gap-1.5",
                viewMode === "tech"
                  ? "bg-rr-green/10 text-rr-green border border-rr-green/20 shadow-[0_0_12px_rgba(103,247,177,0.15)]"
                  : "text-rr-muted hover:text-rr-text"
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>settings_ethernet</span>
              Technical View
            </button>
            <button
              onClick={() => setViewMode("exec")}
              className={cn(
                "font-mono text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded transition-all duration-300 flex items-center gap-1.5",
                viewMode === "exec"
                  ? "bg-rr-blue/10 text-rr-blue border border-rr-blue/20 shadow-[0_0_12px_rgba(77,163,255,0.15)]"
                  : "text-rr-muted hover:text-rr-text"
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>query_stats</span>
              Executive View
            </button>
          </div>

          {/* Timestamp */}
          <div className="font-mono text-[11px] text-rr-muted bg-rr-surface border border-rr-border rounded px-3 py-1.5 shrink-0">
            {now.toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'medium',
              hour12: false,
            })}
          </div>
        </div>
      </div>

      {/* ── Metric Cards (3-col) ─────────────────────────────────────────── */}
      {viewMode === 'tech' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <MetricCard
            icon="warning"
            label="Active Incidents"
            value={activeCount}
            valueClass={activeCount > 0 ? 'text-rr-error' : 'text-rr-green'}
            sub={activeCount > 0 ? `${activeCount} require immediate attention` : 'All clear'}
            pulse={activeCount > 0}
          />
          <MetricCard
            icon="smart_toy"
            label="AI Detections 24h"
            value={142}
            sub="↑ 18 vs yesterday"
            valueClass="text-rr-green"
          />
          <MetricCard
            icon="timer"
            label="MTTR 7d Avg"
            value="14m"
            sub="↓ 3m improvement"
            valueClass="text-rr-text"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <MetricCard
            icon="monetization_on"
            label="Revenue Exposure"
            value={activeCount > 0 ? '$3.2k/m' : '$0.00'}
            valueClass={activeCount > 0 ? 'text-rr-error' : 'text-rr-green'}
            sub={activeCount > 0 ? 'checkout-api failures active' : 'No active financial risk'}
            pulse={activeCount > 0}
          />
          <MetricCard
            icon="verified_user"
            label="SLA Target Status"
            value="99.85%"
            sub="Target: 99.90% (24h Window)"
            valueClass={activeCount > 0 ? 'text-rr-warn' : 'text-rr-green'}
          />
          <MetricCard
            icon="group"
            label="Impacted Users"
            value={activeCount > 0 ? '4,201' : '0'}
            sub={activeCount > 0 ? 'Active degraded sessions' : 'Normal user traffic'}
            valueClass={activeCount > 0 ? 'text-rr-error' : 'text-rr-green'}
          />
        </div>
      )}

      {/* ── Body grid: left col (chart + incidents) / right col (AI) ────── */}
      {viewMode === 'tech' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">

          {/* ── Left column ────────────────────────────────────────────────── */}
          <div className="xl:col-span-2 space-y-6">

            {/* Live Telemetry Chart */}
            <div className="bg-rr-surface border border-rr-border rounded-lg p-5 space-y-4">
              {/* Chart header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-rr-green"
                    style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                  >
                    show_chart
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-rr-muted">
                    Live Telemetry
                  </span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-rr-green animate-pulse" />
                </div>

                {/* Tab switcher */}
                <div className="flex items-center gap-1 bg-rr-bg border border-rr-border rounded-md p-0.5">
                  {CHART_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setChartTab(tab.id)}
                      className={cn(
                        'font-mono text-[10px] uppercase tracking-wider px-3 py-1 rounded transition-all duration-150',
                        chartTab === tab.id
                          ? 'bg-rr-green/10 text-rr-green border border-rr-green/20'
                          : 'text-rr-muted hover:text-rr-text',
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recharts area */}
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#67F7B1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#67F7B1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2228" vertical={false} />
                    <XAxis
                      dataKey="t"
                      tick={{ fill: '#869489', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#869489', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}${activeTab.unit}`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#67F7B1"
                      strokeWidth={1.5}
                      fill="url(#gradGreen)"
                      dot={false}
                      activeDot={{ r: 3, fill: '#67F7B1', stroke: '#06070A', strokeWidth: 1 }}
                      animationDuration={400}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Latest value readout */}
              {chartData.length > 0 && (
                <div className="flex items-center gap-2 border-t border-rr-border pt-3">
                  <span className="font-mono text-[10px] text-rr-muted uppercase tracking-widest">
                    Current
                  </span>
                  <span className="font-mono text-sm text-rr-green font-bold">
                    {chartData[chartData.length - 1].value.toFixed(1)}{activeTab.unit}
                  </span>
                </div>
              )}
            </div>

            {/* Active Incidents Table */}
            <div className="bg-rr-surface border border-rr-border rounded-lg overflow-hidden">
              {/* Table header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-rr-border">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-rr-error"
                    style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                  >
                    crisis_alert
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-rr-muted">
                    Active Incidents
                  </span>
                  {activeCount > 0 && (
                    <span className="font-mono text-[10px] bg-rr-error/15 border border-rr-error/25 text-rr-error px-2 py-0.5 rounded-full">
                      {activeCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => router.push('/incidents')}
                  className="font-mono text-[10px] text-rr-muted hover:text-rr-green transition-colors"
                >
                  View all →
                </button>
              </div>

              {incidents.length === 0 ? (
                <div className="px-5 py-10 text-center font-mono text-[12px] text-rr-muted">
                  No incidents recorded.
                </div>
              ) : (
                <div className="divide-y divide-rr-border">
                  {incidents.map((inc) => {
                    const durationStr = inc.duration
                      ? inc.duration
                      : formatDuration(inc.startedAt, inc.resolvedAt);

                    return (
                      <button
                        key={inc.id}
                        onClick={() => gotoIncident(inc.id)}
                        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left group"
                      >
                        {/* SEV badge */}
                        <SevBadge sev={inc.severity} />

                        {/* ID + title */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[10px] text-rr-muted">{inc.id}</span>
                            <StatusPill status={inc.status} />
                          </div>
                          <p className="text-[13px] text-rr-text font-medium truncate group-hover:text-rr-green transition-colors">
                            {inc.title}
                          </p>
                          <p className="font-mono text-[10px] text-rr-muted truncate mt-0.5">
                            {inc.service}
                          </p>
                        </div>

                        {/* Duration */}
                        <div className="shrink-0 text-right hidden sm:block">
                          <p className="font-mono text-[11px] text-rr-muted">Duration</p>
                          <p className="font-mono text-[12px] text-rr-text">{durationStr}</p>
                        </div>

                        {/* Impact */}
                        <div className="shrink-0 max-w-[200px] hidden lg:block">
                          <p className="font-mono text-[10px] text-rr-muted mb-0.5">Impact</p>
                          <p className="font-mono text-[11px] text-rr-warn line-clamp-2 leading-snug">
                            {inc.impact}
                          </p>
                        </div>

                        {/* Chevron */}
                        <span
                          className="material-symbols-outlined text-rr-border group-hover:text-rr-green transition-colors shrink-0"
                          style={{ fontSize: 16, fontVariationSettings: "'FILL' 0" }}
                        >
                          chevron_right
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right column ───────────────────────────────────────────────── */}
          <div className="xl:col-span-1 space-y-6">

            {/* AI Copilot Insight card */}
            <div
              className="bg-rr-surface rounded-lg p-5 space-y-4"
              style={{
                border: '1px solid rgba(103,247,177,0.2)',
                boxShadow: '0 0 24px rgba(103,247,177,0.06)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-rr-green"
                    style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                  >
                    psychology
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-rr-green">
                    AI Copilot
                  </span>
                </div>
                <span className="ai-tag text-[10px]">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}
                  >
                    auto_awesome
                  </span>
                  Live
                </span>
              </div>

              {/* Insight body */}
              <div className="space-y-3">
                <p className="text-[13px] text-rr-text leading-relaxed">
                  Root cause identified:{' '}
                  <span className="text-rr-green font-medium">
                    Redis Connection Pool Exhaustion
                  </span>{' '}
                  on{' '}
                  <span className="font-mono text-[12px] text-rr-warn">cache-cluster-02</span>.
                </p>
                <p className="font-mono text-[11px] text-rr-muted leading-relaxed">
                  Triggered by <span className="text-rr-text">auth-service v2.4.1</span> deploy
                  introducing unpaginated query. Pattern matched INC-2023-08-12 with{' '}
                  <span className="text-rr-green">91%</span> similarity.
                </p>
              </div>

              {/* Confidence bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-rr-muted uppercase tracking-wider">
                    AI Confidence
                  </span>
                  <span className="font-mono text-[11px] text-rr-green font-bold">94%</span>
                </div>
                <div className="h-1.5 bg-rr-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rr-green rounded-full"
                    style={{ width: '94%', boxShadow: '0 0 6px rgba(103,247,177,0.4)' }}
                  />
                </div>
              </div>

              {/* Recommended fix */}
              <div className="bg-rr-bg border border-rr-border rounded-md p-3 space-y-1">
                <p className="font-mono text-[10px] text-rr-muted uppercase tracking-wider">
                  Recommended Action
                </p>
                <p className="font-mono text-[11px] text-rr-text leading-relaxed">
                  Rollback <span className="text-rr-warn">auth-service</span> to{' '}
                  <span className="text-rr-green">v2.3.9</span> and flush Redis connection pool
                  on cache-cluster-02.
                </p>
              </div>

              {/* Initiate Rollback CTA */}
              <button
                className="w-full bg-rr-green text-rr-bg font-mono text-[12px] font-bold py-2.5 rounded-md transition-all duration-200 hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ boxShadow: '0 0 12px rgba(103,247,177,0.2)' }}
                onClick={() => router.push('/incidents/INC-8241')}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
                >
                  undo
                </span>
                Initiate Rollback
              </button>
            </div>

            {/* AI Memory Panel */}
            <div className="bg-rr-surface border border-rr-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-rr-border">
                <span
                  className="material-symbols-outlined text-rr-blue"
                  style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                >
                  memory
                </span>
                <span className="font-mono text-[11px] uppercase tracking-widest text-rr-muted">
                  AI Memory — Recurring Patterns
                </span>
              </div>

              <div className="divide-y divide-rr-border">
                {aiMemories.map((mem) => (
                  <div key={mem.patternId} className="px-5 py-4 space-y-2.5 hover:bg-white/[0.015] transition-colors">
                    {/* Pattern header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[10px] text-rr-muted">{mem.patternId}</span>
                          <span className="font-mono text-[10px] text-rr-muted">
                            ×{mem.occurrences}
                          </span>
                        </div>
                        <p className="text-[12px] text-rr-text leading-snug">{mem.description}</p>
                      </div>
                      {/* Similarity badge */}
                      <div
                        className="shrink-0 font-mono text-[11px] font-bold px-2 py-1 rounded"
                        style={{
                          background: `rgba(103,247,177,${mem.similarity / 100 * 0.15})`,
                          color: '#67F7B1',
                          border: '1px solid rgba(103,247,177,0.2)',
                        }}
                      >
                        {mem.similarity}%
                      </div>
                    </div>

                    {/* Similarity bar */}
                    <div className="h-1 bg-rr-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rr-green rounded-full transition-all duration-500"
                        style={{
                          width: `${mem.similarity}%`,
                          opacity: 0.7,
                        }}
                      />
                    </div>

                    {/* Recommendation */}
                    <p className="font-mono text-[10px] text-rr-muted leading-relaxed line-clamp-2">
                      {mem.recommendation}
                    </p>

                    {/* Last seen */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-rr-muted">
                        Last seen {formatRelativeTime(mem.lastSeen)}
                      </span>
                      <span className="font-mono text-[10px] text-rr-muted">
                        {mem.relatedIncidents.length} incidents
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Deployments Panel */}
            <div className="bg-rr-surface border border-rr-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-rr-border">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-rr-blue"
                    style={{ fontSize: 16, fontVariationSettings: "'FILL' 0" }}
                  >
                    rocket_launch
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-rr-muted">
                    Recent Deploys
                  </span>
                </div>
                <button
                  onClick={() => router.push('/deployments')}
                  className="font-mono text-[10px] text-rr-muted hover:text-rr-green transition-colors"
                >
                  All →
                </button>
              </div>
              <DeploymentList />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
          {/* Executive Left Column: Brief & Timeline */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-rr-surface border border-rr-border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rr-blue" style={{ fontSize: 16 }}>summarize</span>
                <span className="font-mono text-[11px] uppercase tracking-widest text-rr-muted">Executive Incident Brief</span>
              </div>
              
              {activeCount > 0 ? (
                <div className="space-y-4 font-mono text-[12px] text-rr-text leading-relaxed">
                  <div className="border-l-2 border-rr-error pl-3 space-y-2">
                    <p className="font-bold text-rr-error text-[10px] uppercase tracking-widest">Summary</p>
                    <p className="text-rr-muted">
                      A critical dependency failure is affecting the checkout transaction flow. Automated monitors triggered an incident declaration at {formatTimestamp(activeIncidents[0].startedAt)}.
                    </p>
                  </div>
                  
                  <div className="border-l-2 border-rr-warn pl-3 space-y-2">
                    <p className="font-bold text-rr-warn text-[10px] uppercase tracking-widest">Business & Financial Impact</p>
                    <p className="text-rr-muted">
                      Revenue exposure is estimated at approximately $3,200 per minute due to a 98% checkout API transaction failure rate. 4,201 users are experiencing latency spikes or checkout rejections.
                    </p>
                  </div>

                  <div className="border-l-2 border-rr-green pl-3 space-y-2">
                    <p className="font-bold text-rr-green text-[10px] uppercase tracking-widest">AI Recommendation & Action Plan</p>
                    <p className="text-rr-muted">
                      AI Copilot diagnosed missing indexes and Redis connection limits. The recommended mitigation plan (roll back deploy auth-service v2.4.1 to v2.3.9) has been generated and is ready for manual verification.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="font-mono text-[12px] text-rr-muted text-center py-12">
                  No active incidents. Systems are operating within normal business SLA limits.
                </div>
              )}
            </div>

            {/* Recovery Timeline */}
            <div className="bg-rr-surface border border-rr-border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rr-blue" style={{ fontSize: 16 }}>history</span>
                <span className="font-mono text-[11px] uppercase tracking-widest text-rr-muted">Executive Recovery Timeline</span>
              </div>
              
              {activeCount > 0 ? (
                <div className="space-y-4">
                  {[
                    { t: "12:00 UTC", l: "Incident Declared", d: "Alerting systems triggered page rotation. Customer experience degradation confirmed.", status: "completed" },
                    { t: "12:02 UTC", l: "AI Diagnostics Complete", d: "AI Diagnostics isolated Redis pool exhaustion matching historical signature.", status: "completed" },
                    { t: "12:04 UTC", l: "Remediation Strategy Staged", d: "Rollback and scaling scripts prepared. Awaiting SRE double-click execution.", status: "pending" }
                  ].map((evt, idx) => (
                    <div key={idx} className="flex gap-4 font-mono text-[11px]">
                      <span className="text-rr-muted w-20 shrink-0">{evt.t}</span>
                      <div className="flex flex-col items-center">
                        <span className={cn("w-2 h-2 rounded-full", evt.status === "completed" ? "bg-rr-green" : "bg-rr-blue animate-pulse")} />
                        {idx < 2 && <span className="w-px h-8 bg-rr-border" />}
                      </div>
                      <div className="space-y-1">
                        <p className={cn("font-bold", evt.status === "completed" ? "text-rr-text" : "text-rr-blue")}>{evt.l}</p>
                        <p className="text-rr-muted text-[10px] leading-snug">{evt.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="font-mono text-[12px] text-rr-muted text-center py-6">
                  No active recovery events in progress.
                </div>
              )}
            </div>
          </div>

          {/* Executive Right Column: Risk & Safety */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-rr-surface border border-rr-border rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rr-blue" style={{ fontSize: 16 }}>shield</span>
                <span className="font-mono text-[11px] uppercase tracking-widest text-rr-muted">System Resilience Summary</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-rr-muted">AI Risk Assessment Score</span>
                    <span className="font-mono text-rr-green font-bold">94%</span>
                  </div>
                  <div className="h-1.5 bg-rr-border rounded-full overflow-hidden">
                    <div className="h-full bg-rr-green rounded-full w-[94%]" />
                  </div>
                </div>

                <div className="border-t border-rr-border pt-4 space-y-3 font-mono text-[11px]">
                  <p className="text-rr-muted uppercase tracking-wider text-[10px]">Identified Latent Risks</p>
                  <ul className="space-y-2 text-rr-muted leading-relaxed">
                    <li className="flex gap-2 items-start">
                      <span className="text-rr-warn">⚠</span>
                      <span>Redis Cache connection limits are set near high utilization thresholds under peak loads.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-rr-warn">⚠</span>
                      <span>Deployment pipeline canary gates do not enforce automated query index testing.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-rr-surface border border-rr-border rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rr-blue" style={{ fontSize: 16 }}>task_alt</span>
                <span className="font-mono text-[11px] uppercase tracking-widest text-rr-muted">Resilience Plan Log</span>
              </div>
              <div className="space-y-3 font-mono text-[11px] text-rr-muted">
                {[
                  { label: "Redis memory pool scale-up audit", status: "Scheduled" },
                  { label: "Mandate query EXPLAIN plans in CI", status: "Staged" },
                  { label: "Enable automated canary rollback gate", status: "Awaiting Review" }
                ].map((act, i) => (
                  <div key={i} className="flex justify-between items-start gap-2 border-b border-rr-border/40 pb-2 last:border-0 last:pb-0">
                    <span>{act.label}</span>
                    <span className="text-rr-blue bg-rr-blue/10 border border-rr-blue/20 px-1.5 py-0.5 rounded text-[9px] shrink-0 uppercase">{act.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Deployment list (inline sub-component) ───────────────────────────────────
function DeploymentList() {
  const { deployments } = useStore();

  const statusStyle: Record<string, string> = {
    success:  'text-rr-green',
    rollback: 'text-rr-error',
    failed:   'text-rr-error',
    rolling:  'text-rr-warn',
  };

  const statusIcon: Record<string, string> = {
    success:  'check_circle',
    rollback: 'history',
    failed:   'cancel',
    rolling:  'autorenew',
  };

  return (
    <div className="divide-y divide-rr-border">
      {deployments.slice(0, 4).map((dep) => (
        <div key={dep.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.015] transition-colors">
          <span
            className={cn('material-symbols-outlined shrink-0', statusStyle[dep.status])}
            style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
          >
            {statusIcon[dep.status]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-rr-text truncate">{dep.service}</span>
              <span className="font-mono text-[10px] text-rr-muted">{dep.version}</span>
            </div>
            <span className="font-mono text-[10px] text-rr-muted">{formatRelativeTime(dep.deployedAt)}</span>
          </div>
          <span
            className={cn(
              'font-mono text-[10px] uppercase tracking-wider shrink-0',
              statusStyle[dep.status],
            )}
          >
            {dep.status}
          </span>
        </div>
      ))}
    </div>
  );
}
