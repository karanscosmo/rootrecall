"use client";
// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · Incident Detail Page — Full War Room View
// ─────────────────────────────────────────────────────────────────────────────

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useStore } from "@/store";
import {
  formatDuration,
  formatTimestamp,
  type Incident,
  type IncidentStatus,
  type Severity,
} from "@/lib/telemetry";
import { cn, formatRelativeTime } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Helpers / Sub-components ─────────────────────────────────────────────────

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
        "inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
        styles[severity]
      )}
    >
      {severity}
    </span>
  );
}

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
        "inline-flex items-center font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded border",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

// ─── Typing Animation Hook ────────────────────────────────────────────────────

function useTypingAnimation(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { displayed, done };
}

// ─── Confidence Meter ─────────────────────────────────────────────────────────

function ConfidenceMeter({ value }: { value: number }) {
  const color =
    value >= 90
      ? "bg-rr-green"
      : value >= 75
      ? "bg-rr-warn"
      : "bg-orange-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-rr-border/40 rounded-full h-1.5">
        <div
          className={cn("h-1.5 rounded-full transition-all duration-700", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn("font-mono text-[13px] font-bold", color.replace("bg-", "text-"))}>
        {value}%
      </span>
    </div>
  );
}

// ─── Mini Sparkline Chart ─────────────────────────────────────────────────────

function ErrorRateSparkline() {
  // Spike visualization: low → spike → still high
  const points = [0.5, 0.8, 0.6, 0.9, 1.2, 1.0, 2.1, 15, 42, 68, 87, 94, 91, 89, 85, 88, 92, 96, 91, 88];
  const max = Math.max(...points);
  const H = 48;
  const W = 200;
  const step = W / (points.length - 1);
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(H - (p / max) * H).toFixed(1)}`)
    .join(" ");
  const areaD = `${pathD} L ${W} ${H} L 0 ${H} Z`;

  return (
    <div className="relative">
      <svg width={W} height={H + 4} className="overflow-visible">
        <defs>
          <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#errGrad)" />
        <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Spike indicator */}
        <circle
          cx={(7 * step).toFixed(1)}
          cy={(H - (points[7] / max) * H).toFixed(1)}
          r="3"
          fill="#ef4444"
          opacity="0.9"
        />
      </svg>
      <div className="flex justify-between font-mono text-[9px] text-rr-muted mt-0.5">
        <span>T-5m</span>
        <span className="text-rr-error">↑ spike</span>
        <span>Now</span>
      </div>
    </div>
  );
}

// ─── Timeline Event ───────────────────────────────────────────────────────────

interface TimelineEvent {
  time: string;
  label: string;
  description: string;
  type: "deploy" | "alert" | "ai" | "action" | "resolve";
}

function TimelineItem({
  event,
  isLast,
}: {
  event: TimelineEvent;
  isLast: boolean;
}) {
  const dotColor: Record<TimelineEvent["type"], string> = {
    deploy:  "bg-orange-400 border-orange-400/40",
    alert:   "bg-rr-error border-rr-error/40",
    ai:      "bg-rr-green border-rr-green/40",
    action:  "bg-rr-warn border-rr-warn/40",
    resolve: "bg-rr-green border-rr-green/40",
  };
  const labelColor: Record<TimelineEvent["type"], string> = {
    deploy:  "text-orange-400",
    alert:   "text-rr-error",
    ai:      "text-rr-green",
    action:  "text-rr-warn",
    resolve: "text-rr-green",
  };

  return (
    <div className="flex gap-3">
      {/* Dot + line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-2.5 h-2.5 rounded-full border-2 shrink-0 mt-0.5",
            dotColor[event.type]
          )}
        />
        {!isLast && <div className="w-px flex-1 bg-rr-border/50 my-1" />}
      </div>

      {/* Content */}
      <div className={cn("pb-4", isLast && "pb-0")}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn("font-mono text-[10px] font-bold uppercase tracking-wider", labelColor[event.type])}>
            {event.label}
          </span>
          <span className="font-mono text-[9px] text-rr-muted">{event.time}</span>
        </div>
        <div className="font-mono text-[11px] text-rr-muted leading-snug">{event.description}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IncidentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const router = useRouter();
  const incidents = useStore((s) => s.incidents);
  const metrics = useStore((s) => s.metrics);
  const deployments = useStore((s) => s.deployments);
  const aiMemories = useStore((s) => s.aiMemories);
  const resolveIncident = useStore((s) => s.resolveIncident);
  const setActiveReplay = useStore((s) => s.setActiveReplay);

  const [confirmStep, setConfirmStep] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const runRemediation = async () => {
    if (!incident) return;
    setIsExecuting(true);
    setTerminalLogs(["$ Initiating automated remediation playbooks...", "Connecting to Kubernetes cluster cluster-primary-west..."]);
    
    try {
      const apiBase = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`)
        : 'http://localhost:8000';
      await fetch(`${apiBase}/demo/remediate`, { method: "POST" });
    } catch (e) {
      console.error("Failed to call remediate API", e);
    }

    const logs = [
      "",
      `$ ${incident.remediationSteps?.[0]?.command ?? "kubectl set env deploy/checkout-api PAYMENT_TIMEOUT=10s"}`,
      "Applying environment changes...",
      "deployment.apps/checkout-api env updated (re-routed timeout settings)",
      "",
      `$ ${incident.remediationSteps?.[1]?.command ?? "kubectl scale deploy/checkout-api --replicas=10"}`,
      "Scaling deployment replicas to 10...",
      "deployment.apps/checkout-api scaled",
      "",
      "Verifying system state & metrics...",
      "Latency: stabilized (P99: 45ms)",
      "Error Rate: baseline (0.1%)",
      "Status transition: RESOLVED",
      "Exit code: 0 - SUCCESS"
    ];

    let currentLine = 0;
    const interval = setInterval(() => {
      setTerminalLogs((prev) => [...prev, logs[currentLine]]);
      currentLine++;
      if (currentLine >= logs.length) {
        clearInterval(interval);
        setIsExecuting(false);
        setConfirmStep(false);
      }
    }, 800);
  };

  const incident = incidents.find((i) => i.id === id);

  // Typing animation for root cause
  const { displayed: rcaText, done: rcaDone } = useTypingAnimation(
    incident?.rootCause ?? "",
    14
  );

  if (!incident) {
    notFound();
  }

  const duration = formatDuration(incident.startedAt, incident.resolvedAt);
  const relatedDeployments = deployments.filter(
    (d: any) => d.triggeredIncident === incident.id
  );
  const relatedMemories = aiMemories.filter((m: any) =>
    m.relatedIncidents.includes(incident.id)
  );

  // Build timeline
  const timeline: TimelineEvent[] = [
    {
      time: formatTimestamp(new Date(incident.startedAt.getTime() - 14 * 60 * 1000)),
      label: "Deploy",
      description: `auth-service v2.4.1 deployed via ci-pipeline — rolling update 3/3 pods`,
      type: "deploy",
    },
    {
      time: formatTimestamp(new Date(incident.startedAt.getTime() - 8 * 60 * 1000)),
      label: "Warning",
      description: "api-gateway: upstream auth-service P99 latency exceeded 400ms threshold",
      type: "alert",
    },
    {
      time: formatTimestamp(new Date(incident.startedAt.getTime() - 4 * 60 * 1000)),
      label: "Alert",
      description: "cache-cluster-02: OOM command not allowed — maxmemory limit reached",
      type: "alert",
    },
    {
      time: formatTimestamp(incident.startedAt),
      label: "Incident",
      description: `${incident.id} declared — ${incident.impact}`,
      type: "alert",
    },
    {
      time: formatTimestamp(new Date(incident.startedAt.getTime() + 2 * 60 * 1000)),
      label: "AI Detection",
      description: `AI pattern match: 91% similarity to INC-2023-08-12. Redis connection pool exhaustion fingerprint identified.`,
      type: "ai",
    },
    {
      time: formatTimestamp(new Date(incident.startedAt.getTime() + 4 * 60 * 1000)),
      label: "RCA Complete",
      description: `Root cause identified: unpaginated query in auth-service v2.4.1 exhausted Redis connection pool on cache-cluster-02.`,
      type: "ai",
    },
    ...(incident.status === "resolved" || incident.status === "mitigated"
      ? [
          {
            time: formatTimestamp(incident.resolvedAt ?? new Date()),
            label: "Resolved",
            description: `Incident resolved — rollback to auth-service v2.3.9 completed. Error rate returned to baseline.`,
            type: "resolve" as const,
          },
        ]
      : [
          {
            time: "In Progress",
            label: "Action",
            description: "Rollback of auth-service v2.4.1 initiated — monitoring recovery",
            type: "action" as const,
          },
        ]),
  ];

  return (
    <div className="flex flex-col h-full min-h-screen bg-transparent">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-rr-surface border-b border-rr-border px-6 py-3.5">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Back */}
          <button
            onClick={() => router.push("/incidents")}
            className="flex items-center gap-1 font-mono text-[11px] text-rr-muted hover:text-rr-text transition-colors mr-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
            Incidents
          </button>
          <span className="text-rr-border">/</span>

          {/* ID */}
          <span className="font-mono text-[12px] text-rr-muted">{incident.id}</span>

          {/* Title */}
          <h1 className="font-semibold text-sm text-rr-text tracking-tight flex-1 min-w-0 truncate">
            {incident.title}
          </h1>

          {/* Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <button
              onClick={() => {
                setActiveReplay(incident.id);
                router.push("/replay");
              }}
              className="flex items-center gap-1.5 font-mono text-[11px] text-rr-muted bg-rr-bg border border-rr-border hover:border-rr-green/30 hover:text-rr-green px-3 py-1.5 rounded-md transition-all duration-150"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_circle</span>
              View Replay
            </button>
            <button
              onClick={() => router.push("/postmortems")}
              className="flex items-center gap-1.5 font-mono text-[11px] text-rr-green bg-rr-green/10 border border-rr-green/25 hover:bg-rr-green/20 px-3 py-1.5 rounded-md transition-all duration-150"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>history_edu</span>
              Generate Postmortem
            </button>
          </div>
        </div>
      </div>

      {/* ── 3-Column Body ── */}
      <div className="flex flex-1 min-h-0 divide-x divide-rr-border overflow-auto">
        {/* ── Left: Metadata ── */}
        <div className="w-64 shrink-0 px-4 py-5 flex flex-col gap-5 overflow-y-auto bg-rr-surface/50">
          <section>
            <div className="font-mono text-[9px] text-rr-muted uppercase tracking-widest mb-2.5">
              Incident Details
            </div>
            <div className="flex flex-col gap-2">
              <MetaRow label="ID" value={incident.id} mono />
              <MetaRow label="Started" value={formatTimestamp(incident.startedAt)} mono />
              {incident.resolvedAt && (
                <MetaRow label="Resolved" value={formatTimestamp(incident.resolvedAt)} mono />
              )}
              <MetaRow label="Duration" value={duration} mono />
              <MetaRow label="Owner" value="SRE On-Call" />
              <MetaRow label="Severity" value={incident.severity} />
              <MetaRow label="Status" value={incident.status.toUpperCase()} />
            </div>
          </section>

          {/* Affected Services */}
          <section>
            <div className="font-mono text-[9px] text-rr-muted uppercase tracking-widest mb-2.5">
              Affected Services ({(incident.affectedServices || [incident.service]).length})
            </div>
            <div className="flex flex-col gap-1">
              {(incident.affectedServices || [incident.service]).map((svc) => (
                <div
                  key={svc}
                  className="flex items-center gap-1.5 font-mono text-[11px] text-rr-muted px-2 py-1 bg-rr-bg border border-rr-border rounded"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-rr-error shrink-0" />
                  {svc}
                </div>
              ))}
            </div>
          </section>

          {/* Related Deployments */}
          {relatedDeployments.length > 0 && (
            <section>
              <div className="font-mono text-[9px] text-rr-muted uppercase tracking-widest mb-2.5">
                Triggering Deploy
              </div>
              <div className="space-y-2">
              {relatedDeployments.map((dep: { id: string, status: string, service: string, version: string, deployedBy: string }) => (
                <div key={dep.id} className="bg-orange-500/5 border border-orange-500/20 rounded-md p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-mono text-[10px] text-orange-400 font-bold">{dep.id}</span>
                    <span className="ml-auto font-mono text-[9px] text-orange-400 uppercase bg-orange-500/10 px-1.5 rounded">
                      {dep.status}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-rr-muted">
                    {dep.service} {dep.version}
                  </div>
                  <div className="font-mono text-[9px] text-rr-muted mt-0.5">
                    by {dep.deployedBy}
                  </div>
                </div>
              ))}
              </div>
            </section>
          )}

          {/* Impact */}
          <section>
            <div className="font-mono text-[9px] text-rr-muted uppercase tracking-widest mb-2">
              Impact
            </div>
            <div className="font-mono text-[11px] text-rr-error bg-rr-error/5 border border-rr-error/15 rounded-md p-2.5 leading-relaxed">
              {incident.impact}
            </div>
          </section>
        </div>

        {/* ── Center: Timeline + RCA ── */}
        <div className="flex-1 px-5 py-5 overflow-y-auto flex flex-col gap-5 min-w-0">
          {/* Timeline */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-rr-muted" style={{ fontSize: 14 }}>timeline</span>
              <div className="font-mono text-[9px] text-rr-muted uppercase tracking-widest">
                Event Timeline
              </div>
            </div>
            <div className="pl-1">
              {timeline.map((event, idx) => (
                <TimelineItem
                  key={idx}
                  event={event}
                  isLast={idx === timeline.length - 1}
                />
              ))}
            </div>
          </section>

          <div className="h-px bg-rr-border/60" />

          {/* AI RCA Panel */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="material-symbols-outlined text-rr-green"
                style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}
              >
                psychology
              </span>
              <div className="font-mono text-[9px] text-rr-green uppercase tracking-widest font-bold">
                AI Root Cause Analysis
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-rr-green animate-pulse" />
                <span className="font-mono text-[9px] text-rr-green">Live</span>
              </div>
            </div>

            <div className="bg-rr-green/3 border border-rr-green/15 rounded-lg p-4">
              {/* Confidence */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-rr-muted uppercase tracking-widest">
                    AI Confidence
                  </span>
                  <span className="font-mono text-[10px] text-rr-muted">
                    {incident.aiConfidence}% / 100%
                  </span>
                </div>
                <ConfidenceMeter value={incident.aiConfidence} />
              </div>

              <div className="h-px bg-rr-border/40 my-3" />

              {/* Root Cause with typing */}
              <div className="font-mono text-[11px] text-rr-muted leading-relaxed min-h-[40px]">
                {rcaText}
                {!rcaDone && (
                  <span className="inline-block w-[2px] h-[13px] bg-rr-green ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          </section>

          {/* AI Recommended Remediation Engine */}
          {incident.remediationSteps && incident.remediationSteps.length > 0 && (
            <>
              <div className="h-px bg-rr-border/60" />
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>terminal</span>
                  <div className="font-mono text-[9px] text-rr-green uppercase tracking-widest font-bold">
                    AI Remediation Engine
                  </div>
                </div>

                <div className="bg-rr-surface border border-rr-border rounded-xl p-4 space-y-4">
                  <div>
                    <p className="font-mono text-[10px] text-rr-muted uppercase tracking-wider mb-2">Recommended Commands</p>
                    <div className="space-y-2">
                      {incident.remediationSteps.map((step) => (
                        <div key={step.step} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-rr-muted font-mono">
                            <span>Step {step.step}: {step.action}</span>
                          </div>
                          <div className="flex items-center justify-between bg-rr-bg border border-rr-border rounded-md px-3 py-2 font-mono text-[11px] text-rr-text overflow-x-auto">
                            <span>{step.command}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Terminal Output */}
                  {terminalLogs.length > 0 && (
                    <div className="bg-black border border-rr-border rounded-lg p-3 font-mono text-[11px] text-rr-green h-48 overflow-y-auto space-y-1">
                      {terminalLogs.map((log, i) => (
                        <div key={i} className={cn("leading-relaxed", log.startsWith("$") ? "text-rr-text font-bold" : "text-rr-green/90")}>
                          {log}
                        </div>
                      ))}
                      {isExecuting && <span className="inline-block w-1.5 h-3 bg-rr-green animate-pulse ml-0.5" />}
                    </div>
                  )}

                  {/* Run Button */}
                  {incident.status !== "resolved" && (
                    <div className="flex gap-2">
                      {!confirmStep ? (
                        <button
                          onClick={() => setConfirmStep(true)}
                          disabled={isExecuting}
                          className="bg-rr-green text-rr-bg hover:bg-rr-green/90 px-4 py-2 font-mono text-[12px] font-bold rounded-lg transition-colors flex items-center gap-1.5"
                          style={{ boxShadow: "0 0 10px rgba(103,247,177,0.15)" }}
                        >
                          <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                          Run Remediation Command
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={runRemediation}
                            disabled={isExecuting}
                            className="bg-rr-error text-rr-bg hover:bg-rr-error/90 px-4 py-2 font-mono text-[12px] font-bold rounded-lg transition-colors flex items-center gap-1.5 animate-pulse"
                            style={{ boxShadow: "0 0 10px rgba(239,68,68,0.15)" }}
                          >
                            <span className="material-symbols-outlined text-[14px]">priority_high</span>
                            Confirm Execution?
                          </button>
                          <button
                            onClick={() => setConfirmStep(false)}
                            disabled={isExecuting}
                            className="bg-rr-surface border border-rr-border hover:bg-white/5 px-4 py-2 font-mono text-[12px] font-bold rounded-lg text-rr-text transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          <div className="h-px bg-rr-border/60" />

          {/* AI Memory Similarity Card */}
          {incident.similarityScore && incident.similarTo && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="material-symbols-outlined text-rr-warn"
                  style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}
                >
                  memory
                </span>
                <div className="font-mono text-[9px] text-rr-warn uppercase tracking-widest font-bold">
                  AI Detected Similar Pattern
                </div>
              </div>

              <div className="bg-rr-warn/5 border border-rr-warn/20 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="font-mono text-[13px] font-bold text-rr-warn mb-0.5">
                      {incident.similarityScore}% Match
                    </div>
                    <div className="font-mono text-[11px] text-rr-muted">
                      {incident.similarTo}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="w-16 bg-rr-border/40 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-rr-warn"
                        style={{ width: `${incident.similarityScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="font-mono text-[10px] text-rr-muted leading-relaxed border-t border-rr-warn/10 pt-3">
                  Previous incident showed identical Redis connection pool exhaustion pattern
                  following a deployment. Root cause matched with{" "}
                  <span className="text-rr-warn font-bold">{incident.similarityScore}%</span> confidence
                  using embedding-based pattern memory.
                </div>

                {/* AI Recommendation */}
                <div className="mt-3 p-2.5 bg-rr-green/5 border border-rr-green/15 rounded-md">
                  <div className="font-mono text-[9px] text-rr-green uppercase tracking-widest mb-1">
                    AI Recommendation
                  </div>
                  <div className="font-mono text-[10px] text-rr-muted leading-relaxed">
                    Gate deploys on Redis memory headroom check (&gt;20%). Enable connection pool
                    monitoring alerts at 80% saturation.
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ── Right: Charts + Quick Actions ── */}
        <div className="w-72 shrink-0 px-4 py-5 flex flex-col gap-5 overflow-y-auto bg-rr-surface/30">
          {/* Error Rate Chart */}
          <section>
            <div className="font-mono text-[9px] text-rr-muted uppercase tracking-widest mb-3">
              Error Rate Spike
            </div>
            <div className="bg-rr-bg border border-rr-border rounded-lg p-3">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-mono text-[11px] text-rr-text">checkout-api</span>
                <span className="font-mono text-[13px] font-bold text-rr-error">98%</span>
              </div>
              <ErrorRateSparkline />
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rr-error animate-pulse" />
                <span className="font-mono text-[9px] text-rr-error uppercase">Critical — spike detected</span>
              </div>
            </div>
          </section>

          {/* Latency Chart */}
          <section>
            <div className="bg-rr-bg border border-rr-border rounded-lg p-3">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-mono text-[11px] text-rr-text">P99 Latency</span>
                <span className="font-mono text-[13px] font-bold text-orange-400">5,200ms</span>
              </div>
              {/* Simple bar visualization */}
              <div className="flex items-end gap-0.5 h-8">
                {metrics.map((d: any, i: number) => {
                  const maxV = 5200;
                  const v = d.latencyP99;
                  const pct = (v / maxV) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        height: `${pct}%`,
                        backgroundColor: pct > 40 ? "#f97316" : "#3a3a3a",
                        minHeight: 2,
                      }}
                    />
                  );
                })}
              </div>
              <div className="font-mono text-[9px] text-rr-muted mt-1">Past 5 minutes</div>
            </div>
          </section>

          <div className="h-px bg-rr-border/60" />

          {/* AI Memory Patterns */}
          <section>
            <div className="font-mono text-[9px] text-rr-muted uppercase tracking-widest mb-2.5">
              AI Memory Patterns
            </div>
            <div className="flex flex-col gap-2">
              {relatedMemories.length > 0
                ? relatedMemories.map((mem: any) => (
                    <div
                      key={mem.patternId}
                      className="bg-rr-bg border border-rr-border rounded-md p-2.5"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-[9px] text-rr-green uppercase tracking-wide">
                          {mem.patternId}
                        </span>
                        <span className="ml-auto font-mono text-[10px] font-bold text-rr-green">
                          {mem.similarity}%
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-rr-muted leading-snug">
                        {mem.description}
                      </div>
                      <div className="mt-1 font-mono text-[9px] text-rr-muted">
                        {mem.occurrences} occurrences
                      </div>
                    </div>
                  ))
                : (
                  <div className="font-mono text-[10px] text-rr-muted text-center py-3">
                    No matching patterns
                  </div>
                )}
            </div>
          </section>

          <div className="h-px bg-rr-border/60" />

          {/* Quick Actions */}
          <section>
            <div className="font-mono text-[9px] text-rr-muted uppercase tracking-widest mb-2.5">
              Quick Actions
            </div>
            <div className="flex flex-col gap-2">
              <QuickAction
                icon="play_circle"
                label="View Replay"
                description="Step-through incident replay"
                onClick={() => {
                  setActiveReplay(incident.id);
                  router.push("/replay");
                }}
                color="text-rr-green"
                border="border-rr-green/20 hover:border-rr-green/40"
              />
              <QuickAction
                icon="history_edu"
                label="Generate Postmortem"
                description="AI-authored incident report"
                onClick={() => router.push("/postmortems")}
                color="text-rr-warn"
                border="border-rr-warn/20 hover:border-rr-warn/40"
              />
              <QuickAction
                icon="menu_book"
                label="View Runbook"
                description="Redis saturation runbook"
                onClick={() => {}}
                color="text-rr-muted"
                border="border-rr-border hover:border-rr-muted/40"
              />
              {incident.status !== "resolved" && (
                <QuickAction
                  icon="check_circle"
                  label="Resolve Incident"
                  description="Mark as resolved"
                  onClick={() => resolveIncident(incident.id)}
                  color="text-rr-green"
                  border="border-rr-green/20 hover:border-rr-green/50"
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── MetaRow ─────────────────────────────────────────────────────────────────

function MetaRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[9px] text-rr-muted uppercase tracking-widest">{label}</span>
      <span className={cn("text-[11px] text-rr-text leading-tight", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}

// ─── QuickAction ─────────────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  description,
  onClick,
  color,
  border,
}: {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
  color: string;
  border: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full text-left px-3 py-2.5 bg-rr-bg border rounded-md transition-all duration-150 group",
        border
      )}
    >
      <span
        className={cn("material-symbols-outlined shrink-0 transition-colors", color)}
        style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className={cn("font-mono text-[11px] font-medium", color)}>{label}</div>
        <div className="font-mono text-[9px] text-rr-muted truncate">{description}</div>
      </div>
      <span
        className="material-symbols-outlined text-rr-border ml-auto group-hover:text-rr-muted transition-colors"
        style={{ fontSize: 13 }}
      >
        arrow_forward
      </span>
    </button>
  );
}
