"use client";
// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · Incident Center — Live War Room View
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import {
  INCIDENTS,
  formatDuration,
  formatTimestamp,
  type Incident,
  type IncidentStatus,
  type Severity,
} from "@/lib/telemetry";
import { cn, formatRelativeTime } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "active" | "sev1" | "investigating" | "resolved";

// ─── Severity Badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    "SEV-1": "bg-rr-error/15 border-rr-error/30 text-rr-error",
    "SEV-2": "bg-orange-500/15 border-orange-500/30 text-orange-400",
    "SEV-3": "bg-rr-warn/15 border-rr-warn/30 text-rr-warn",
    "SEV-4": "bg-rr-muted/10 border-rr-border text-rr-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
        styles[severity]
      )}
    >
      {severity}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IncidentStatus }) {
  const styles: Record<IncidentStatus, string> = {
    active:       "bg-rr-error/10 border-rr-error/25 text-rr-error",
    investigating:"bg-rr-warn/10 border-rr-warn/25 text-rr-warn",
    mitigated:    "bg-orange-500/10 border-orange-500/25 text-orange-400",
    resolved:     "bg-rr-green/10 border-rr-green/25 text-rr-green",
  };
  const labels: Record<IncidentStatus, string> = {
    active:       "● ACTIVE",
    investigating:"◎ INVESTIGATING",
    mitigated:    "◑ MITIGATED",
    resolved:     "✓ RESOLVED",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

// ─── Incident Card ────────────────────────────────────────────────────────────

function IncidentCard({ incident, onClick }: { incident: Incident; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const duration = formatDuration(incident.startedAt, incident.resolvedAt);

  return (
    <div
      className={cn(
        "relative px-4 py-3.5 border border-rr-border rounded-lg cursor-pointer transition-all duration-150 group",
        hovered ? "bg-white/[0.03] border-rr-border/70" : "bg-rr-surface",
        incident.severity === "SEV-1" && incident.status === "active"
          ? "border-l-2 border-l-rr-error"
          : incident.severity === "SEV-2"
          ? "border-l-2 border-l-orange-500"
          : "border-l-2 border-l-rr-border"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Top row */}
      <div className="flex items-center gap-2 mb-2">
        <SeverityBadge severity={incident.severity} />
        <span className="font-mono text-[11px] text-rr-muted">{incident.id}</span>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={incident.status} />
        </div>
      </div>

      {/* Title */}
      <div className="font-medium text-sm text-rr-text mb-1 group-hover:text-white transition-colors">
        {incident.title}
      </div>

      {/* Service path */}
      <div className="font-mono text-[11px] text-rr-muted mb-2.5">{incident.service}</div>

      {/* Footer row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Duration */}
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-rr-muted bg-white/[0.04] border border-rr-border px-1.5 py-0.5 rounded">
          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>timer</span>
          {duration}
        </span>

        {/* AI Confidence */}
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-rr-green bg-rr-green/5 border border-rr-green/20 px-1.5 py-0.5 rounded">
          <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>psychology</span>
          AI {incident.aiConfidence}% confidence
        </span>

        {/* Similarity note */}
        {incident.similarityScore && incident.similarTo && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-rr-warn bg-rr-warn/5 border border-rr-warn/20 px-1.5 py-0.5 rounded">
            <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>memory</span>
            {incident.similarityScore}% similar to {incident.similarTo}
          </span>
        )}

        {/* Replay available */}
        {incident.replayAvailable && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-rr-muted ml-auto">
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>play_circle</span>
            Replay
          </span>
        )}
      </div>

      {/* Arrow indicator */}
      <span
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-rr-muted transition-all duration-150",
          hovered ? "text-rr-green translate-x-0.5 opacity-100" : "opacity-0"
        )}
        style={{ fontSize: 16 }}
      >
        arrow_forward
      </span>
    </div>
  );
}

// ─── Waveform Animation ───────────────────────────────────────────────────────

function WaveformBars() {
  return (
    <div className="flex items-end gap-[2px] h-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] bg-rr-green/50 rounded-full animate-pulse"
          style={{
            height: `${Math.random() * 100}%`,
            animationDelay: `${i * 80}ms`,
            animationDuration: `${600 + Math.random() * 600}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ─── AI Log Stream Item ───────────────────────────────────────────────────────

function LogStreamItem({
  level,
  message,
  time,
}: {
  level: "INFO" | "WARN" | "CRITICAL";
  message: string;
  time: string;
}) {
  const levelStyles = {
    INFO:     "text-rr-muted",
    WARN:     "text-rr-warn",
    CRITICAL: "text-rr-error",
  };
  const levelBg = {
    INFO:     "bg-rr-muted/10 border-rr-border",
    WARN:     "bg-rr-warn/10 border-rr-warn/20",
    CRITICAL: "bg-rr-error/10 border-rr-error/25",
  };
  return (
    <div className={cn("px-2.5 py-2 rounded border font-mono", levelBg[level])}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className={cn("text-[9px] uppercase tracking-widest font-bold", levelStyles[level])}>
          {level}
        </span>
        <span className="text-[9px] text-rr-muted ml-auto">{time}</span>
      </div>
      <div className="text-[10px] text-rr-muted leading-snug">{message}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IncidentsPage() {
  const router = useRouter();
  const incidents = useStore((s) => s.incidents);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [tick, setTick] = useState(0);

  // Ticker for live timestamps
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  // Filter logic
  const filteredIncidents = incidents.filter((inc) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return inc.status === "active";
    if (activeTab === "sev1") return inc.severity === "SEV-1";
    if (activeTab === "investigating") return inc.status === "investigating";
    if (activeTab === "resolved") return inc.status === "resolved" || inc.status === "mitigated";
    return true;
  });

  const activeCount = incidents.filter(
    (i) => i.status === "active" || i.status === "investigating"
  ).length;

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "all",          label: `All (${incidents.length})` },
    { id: "active",       label: `Active (${incidents.filter((i) => i.status === "active").length})` },
    { id: "sev1",         label: `SEV-1 (${incidents.filter((i) => i.severity === "SEV-1").length})` },
    { id: "investigating",label: `Investigating (${incidents.filter((i) => i.status === "investigating").length})` },
    { id: "resolved",     label: `Resolved (${incidents.filter((i) => i.status === "resolved" || i.status === "mitigated").length})` },
  ];

  const now = new Date();

  return (
    <div className="flex h-full min-h-screen bg-transparent">
      {/* ── Left Column: Main incident list ── */}
      <div className="flex-1 flex flex-col px-6 py-5 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Animated live dot */}
            <div className="relative flex items-center justify-center w-3 h-3">
              <span className="absolute inline-flex w-full h-full rounded-full bg-rr-error opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-rr-error" />
            </div>
            <h1 className="font-semibold text-lg text-rr-text tracking-tight">Live Incident Center</h1>
            {/* Live status badge */}
            <span className="font-mono text-[10px] text-rr-error bg-rr-error/10 border border-rr-error/25 px-2 py-0.5 rounded uppercase tracking-widest">
              {activeCount} Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-rr-muted">
              {now.toUTCString().slice(0, 25)} UTC
            </span>
            <button
              onClick={() => router.refresh()}
              className="flex items-center gap-1 font-mono text-[11px] text-rr-muted hover:text-rr-text border border-rr-border hover:border-rr-green/30 bg-rr-surface px-2.5 py-1 rounded transition-all duration-150"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
              Refresh
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 bg-rr-surface border border-rr-border rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 font-mono text-[11px] px-2.5 py-1.5 rounded-md transition-all duration-150 truncate",
                activeTab === tab.id
                  ? "bg-rr-green/15 text-rr-green border border-rr-green/25"
                  : "text-rr-muted hover:text-rr-text hover:bg-white/[0.04]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Incident list */}
        <div className="flex flex-col gap-2.5 overflow-y-auto">
          {filteredIncidents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span
                className="material-symbols-outlined text-rr-muted mb-3"
                style={{ fontSize: 40, fontVariationSettings: "'FILL' 0" }}
              >
                check_circle
              </span>
              <div className="font-mono text-[11px] text-rr-muted uppercase tracking-widest">
                No incidents in this filter
              </div>
            </div>
          )}
          {filteredIncidents.map((inc) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              onClick={() => router.push(`/incidents/${inc.id}`)}
            />
          ))}
        </div>

        {/* Footer count */}
        {filteredIncidents.length > 0 && (
          <div className="mt-4 pt-3 border-t border-rr-border">
            <span className="font-mono text-[10px] text-rr-muted">
              Showing {filteredIncidents.length} of {incidents.length} incidents
            </span>
          </div>
        )}
      </div>

      {/* ── Right Sidebar: AI Commentary Stream ── */}
      <aside className="w-80 border-l border-rr-border bg-rr-surface flex flex-col px-4 py-5 gap-4 shrink-0">
        {/* AI Commentary Header */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="material-symbols-outlined text-rr-green"
              style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
            <span className="font-mono text-[11px] text-rr-green uppercase tracking-widest font-bold">
              AI Commentary Stream
            </span>
            <div className="ml-auto">
              <WaveformBars />
            </div>
          </div>
          <div className="h-px bg-rr-border/60 mb-3" />

          {/* Log stream */}
          <div className="flex flex-col gap-2">
            <LogStreamItem
              level="CRITICAL"
              message="checkout-api: Redis CONNRESET cache-cluster-02 — 98% error rate detected"
              time="00:02s ago"
            />
            <LogStreamItem
              level="WARN"
              message="auth-service: connection pool exhausted (active: 100/100) — escalation likely"
              time="00:15s ago"
            />
            <LogStreamItem
              level="INFO"
              message="ai-engine: pattern match complete — cross-referencing 4 historical incidents"
              time="00:34s ago"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-rr-border/60" />

        {/* AI Memory Similarity Alert */}
        <div className="bg-rr-warn/5 border border-rr-warn/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="material-symbols-outlined text-rr-warn"
              style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
            >
              memory
            </span>
            <span className="font-mono text-[10px] text-rr-warn uppercase tracking-widest font-bold">
              Memory Match
            </span>
            <span className="ml-auto font-mono text-[11px] font-bold text-rr-warn">91%</span>
          </div>
          <div className="font-mono text-[10px] text-rr-muted leading-relaxed">
            91% similarity to{" "}
            <span className="text-rr-warn font-bold">INC-2023-08-12</span>
          </div>
          <div className="mt-2 pt-2 border-t border-rr-warn/10">
            <div className="w-full bg-rr-border/40 rounded-full h-1 mb-1">
              <div className="h-1 rounded-full bg-rr-warn" style={{ width: "91%" }} />
            </div>
            <div className="font-mono text-[9px] text-rr-muted">Pattern confidence</div>
          </div>
        </div>

        {/* Repeated Anomaly Card */}
        <div className="bg-rr-error/5 border border-rr-error/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="material-symbols-outlined text-rr-error"
              style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
            <span className="font-mono text-[10px] text-rr-error uppercase tracking-widest font-bold">
              Anomaly Detected
            </span>
          </div>
          <div className="font-mono text-[10px] text-rr-muted leading-relaxed">
            Repeated deployment anomaly detected — auth-service deploys have triggered Redis saturation{" "}
            <span className="text-rr-error font-bold">4 times</span> in the past 6 months.
          </div>
        </div>

        {/* Active Incidents Summary */}
        <div>
          <div className="font-mono text-[10px] text-rr-muted uppercase tracking-widest mb-2">
            Active Now
          </div>
          <div className="flex flex-col gap-1.5">
            {incidents
              .filter((i) => i.status === "active" || i.status === "investigating")
              .map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center gap-2 px-2.5 py-2 bg-rr-bg border border-rr-border rounded-md cursor-pointer hover:border-rr-green/30 transition-colors"
                  onClick={() => router.push(`/incidents/${inc.id}`)}
                >
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      inc.status === "active" ? "bg-rr-error animate-pulse" : "bg-rr-warn"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] text-rr-muted">{inc.id}</div>
                    <div className="font-mono text-[11px] text-rr-text truncate">{inc.title}</div>
                  </div>
                  <SeverityBadge severity={inc.severity} />
                </div>
              ))}
          </div>
        </div>

        {/* System Status Footer */}
        <div className="mt-auto pt-3 border-t border-rr-border">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-rr-muted uppercase tracking-widest">
              AI Engine Status
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rr-green animate-pulse" />
              <span className="font-mono text-[9px] text-rr-green">Online</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-mono text-[9px] text-rr-muted uppercase tracking-widest">
              Memory Bank
            </span>
            <span className="font-mono text-[9px] text-rr-muted">3 patterns loaded</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
