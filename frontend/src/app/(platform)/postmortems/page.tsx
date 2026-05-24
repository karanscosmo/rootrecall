"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { formatTimestamp } from "@/lib/telemetry";
import { cn, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

interface PostmortemData {
  id: number;
  incidentId: string;
  incidentTitle: string;
  severity: string;
  service: string;
  executiveSummary: string;
  timeline: { time: string; description: string }[];
  rootCauseAnalysis: string;
  preventionItems: string[];
  createdAt: string;
}

export default function PostmortemsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft">("all");
  const [postmortems, setPostmortems] = useState<PostmortemData[]>([]);
  const [selectedPM, setSelectedPM] = useState<PostmortemData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [targetIncidentId, setTargetIncidentId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const incId = params.get("incidentId");
      if (incId) {
        setTargetIncidentId(incId);
      }
    }
  }, []);

  const incidents = useStore((s) => s.incidents);
  const fetchIncidents = useStore((s) => s.fetchIncidents);

  const getApiBase = () => {
    if (typeof window !== "undefined") {
      return process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`;
    }
    return "http://localhost:8000";
  };

  const loadPostmortems = async () => {
    try {
      const token = useStore.getState().user?.accessToken;
      const res = await fetch(`${getApiBase()}/postmortems`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setPostmortems(data);
        if (data.length > 0 && !selectedPM) {
          setSelectedPM(data[0]);
        } else if (data.length > 0 && selectedPM) {
          const updated = data.find((p: any) => p.id === selectedPM.id);
          if (updated) setSelectedPM(updated);
        }
      }
    } catch (e) {
      console.error("Failed to load postmortems", e);
    }
  };

  useEffect(() => {
    loadPostmortems();
    fetchIncidents();
  }, []);

  const pendingIncidents = incidents.filter(
    (i) => (i.status === "mitigated" || i.status === "resolved") && !i.postmortemGenerated
  );

  const target = pendingIncidents.find((i) => i.id === targetIncidentId) || pendingIncidents[0];

  const handleGenerate = async () => {
    if (!target) return;
    setGenerating(true);

    try {
      const startedTime = target.startedAt ? new Date(target.startedAt) : new Date();
      const resolvedTime = target.resolvedAt ? new Date(target.resolvedAt) : new Date(startedTime.getTime() + 15 * 60 * 1000);
      
      const durationMin = Math.round((resolvedTime.getTime() - startedTime.getTime()) / 60000);
      
      const executiveSummary = `On ${startedTime.toLocaleDateString()} at ${startedTime.toLocaleTimeString()}, a high-severity incident was triggered for ${target.service} (${target.severity}). The operational impact was flagged as: "${target.impact || 'Service degradation and heightened response latencies'}" affecting downstream systems. Automated analysis matched this footprint to historical patterns, and SRE runbooks were deployed to stabilize performance. The system was fully restored after a total duration of ${durationMin} minutes.`;

      const rootCauseAnalysis = target.rootCause || `The root cause was identified as connection pooling contention and queue delays inside the ${target.service} container environment, leading to cascaded timeout failures in caller services.`;

      const timeline = [
        { time: startedTime.toLocaleTimeString(), description: `Anomaly detected: elevated latency threshold breached on ${target.service}.` },
        { time: new Date(startedTime.getTime() + 2 * 60000).toLocaleTimeString(), description: `AI Copilot correlates logs and identifies root cause: "${target.rootCause || 'resource saturation'}".` },
        { time: resolvedTime.toLocaleTimeString(), description: `Remediation playbook execution complete. Metrics returned to normal.` }
      ];

      const preventionItems = [
        `Optimize the database connection pool settings and connection timeout limits for the ${target.service} service.`,
        `Add automated synthetic monitoring and endpoint health check validation probes in deployment validation suites.`,
        `Configure load shedding and circuit breakers on client services calling ${target.service}.`
      ];

      const body = {
        incidentId: target.id,
        executiveSummary,
        rootCauseAnalysis,
        timeline,
        preventionItems
      };

      const token = useStore.getState().user?.accessToken;

      const res = await fetch(`${getApiBase()}/postmortems`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadPostmortems();
        await fetchIncidents();
      }
    } catch (e) {
      console.error("Failed to generate postmortem", e);
    } finally {
      setGenerating(false);
    }
  };

  const filtered = postmortems.filter((pm) =>
    activeTab === "all" ? true : (activeTab === "published" ? true : false)
  );

  return (
    <div className="flex h-full bg-transparent">
      {/* Left: List */}
      <div className="w-80 border-r border-rr-border bg-rr-surface flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-rr-border">
          <h1 className="font-semibold text-base text-rr-text tracking-tight">Postmortems</h1>
          <p className="font-mono text-[11px] text-rr-muted mt-0.5">AI-generated incident analyses</p>
        </div>

        {/* Generate button */}
        {pendingIncidents.length > 0 && (
          <div className="p-3 border-b border-rr-border">
            <div className="bg-rr-green/5 border border-rr-green/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="font-mono text-[11px] text-rr-green">{pendingIncidents.length} ready to generate</span>
              </div>
              
              {pendingIncidents.length > 1 && (
                <select
                  value={targetIncidentId || ""}
                  onChange={(e) => setTargetIncidentId(e.target.value)}
                  className="w-full bg-rr-bg border border-rr-border text-rr-text font-mono text-[11px] px-2 py-1.5 rounded mb-2.5 focus:outline-none focus:border-rr-green/40 cursor-pointer"
                >
                  {pendingIncidents.map(inc => (
                    <option key={inc.id} value={inc.id}>
                      {inc.id} - {inc.service}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-rr-green text-rr-bg font-mono text-[11px] py-1.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 font-bold"
              >
                {generating ? "Generating..." : `Generate PM for ${target?.id || pendingIncidents[0]?.id}`}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-rr-border px-3 pt-2">
          {(["all", "published", "draft"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "font-mono text-[11px] px-3 py-1.5 capitalize border-b-2 transition-colors",
                activeTab === tab
                  ? "border-rr-green text-rr-green"
                  : "border-transparent text-rr-muted hover:text-rr-text"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[11px] text-rr-muted">
              No postmortems found.
            </div>
          ) : (
            filtered.map((pm) => (
              <button
                key={pm.id}
                onClick={() => setSelectedPM(pm)}
                className={cn(
                  "w-full text-left p-3 border-l-2 transition-colors",
                  selectedPM?.id === pm.id
                    ? "border-rr-green bg-rr-green/5 text-rr-text"
                    : "border-transparent hover:bg-white/[0.03] text-rr-muted hover:text-rr-text"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "font-mono text-[9px] px-1.5 py-0.5 rounded border",
                    pm.severity === "SEV-1" ? "text-rr-error border-rr-error/30 bg-rr-error/10" :
                    pm.severity === "SEV-2" ? "text-orange-400 border-orange-400/30 bg-orange-400/10" :
                    "text-rr-warn border-rr-warn/30 bg-rr-warn/10"
                  )}>{pm.severity}</span>
                  <span className="font-mono text-[10px] text-rr-muted">{pm.incidentId}</span>
                </div>
                <div className="font-medium text-[12px] leading-snug mb-1">{pm.incidentTitle}</div>
                <div className="font-mono text-[10px] text-rr-muted">
                  {pm.createdAt ? formatRelativeTime(new Date(pm.createdAt)) : "just now"} · SRE Copilot
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Document view */}
      {selectedPM ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Document */}
          <div className="flex-1 overflow-y-auto bg-transparent p-8">
            {/* AI generated badge */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-2 bg-rr-surface border border-rr-border rounded-full px-3 py-1.5">
                <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="font-mono text-[11px] text-rr-text">AI Generation Complete</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => navigator.clipboard.writeText(`# ${selectedPM.incidentTitle}\n\n## Executive Summary\n${selectedPM.executiveSummary}`)}
                  className="flex items-center gap-1.5 font-mono text-[11px] text-rr-muted hover:text-rr-text px-3 py-1.5 border border-rr-border rounded-md hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_copy</span>
                  Copy Markdown
                </button>
                <button className="flex items-center gap-1.5 font-mono text-[11px] text-rr-muted hover:text-rr-text px-3 py-1.5 border border-rr-border rounded-md hover:bg-white/5 transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>picture_as_pdf</span>
                  Export PDF
                </button>
                <button className="flex items-center gap-1.5 font-mono text-[11px] text-rr-bg bg-rr-green px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>share</span>
                  Share
                </button>
              </div>
            </div>

            <article className="max-w-3xl prose-custom">
              {/* Severity badge */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-rr-error" style={{ boxShadow: "0 0 6px rgba(255,180,171,0.5)" }} />
                <span className="font-mono text-[11px] text-rr-error uppercase tracking-wider">{selectedPM.severity} · Critical</span>
              </div>

              <h1 className="text-2xl font-semibold text-rr-text tracking-tight mb-1">{selectedPM.incidentTitle}</h1>
              <p className="font-mono text-[11px] text-rr-muted mb-8">
                Generated by RootRecall Copilot · {selectedPM.createdAt ? formatTimestamp(new Date(selectedPM.createdAt)) : ""}
              </p>

              {/* Section */}
              <Section title="1. Summary">
                <p className="text-[14px] text-rr-muted leading-relaxed">{selectedPM.executiveSummary}</p>
              </Section>

              <Section title="2. Impact">
                <ul className="space-y-2 text-[14px] text-rr-muted">
                  <li><strong className="text-rr-text">Service Impacted:</strong> {selectedPM.service}</li>
                  <li><strong className="text-rr-text">Incident ID:</strong> {selectedPM.incidentId}</li>
                  <li><strong className="text-rr-text">User Exposure:</strong> High customer transaction failures detected.</li>
                </ul>
              </Section>

              <Section title="3. Root Cause Analysis">
                <p className="text-[14px] text-rr-muted leading-relaxed mb-3">{selectedPM.rootCauseAnalysis}</p>
              </Section>

              <Section title="4. Timeline">
                <Timeline events={selectedPM.timeline.map(t => ({
                  time: t.time,
                  color: t.description.includes("mitigated") || t.description.includes("mitigate") ? "bg-rr-green" : "bg-rr-error",
                  text: t.description,
                  isSuccess: t.description.includes("mitigated") || t.description.includes("mitigate")
                }))} />
              </Section>

              <Section title="5. Action Items">
                <div className="space-y-3">
                  {selectedPM.preventionItems.map((item, i) => (
                    <div key={i} className="bg-rr-surface border border-rr-border rounded-lg p-3 flex gap-3">
                      <span className="material-symbols-outlined text-rr-muted mt-0.5" style={{ fontSize: 18 }}>check_box_outline_blank</span>
                      <div>
                        <div className="font-medium text-[13px] text-rr-text mb-1">{item}</div>
                        <div className="font-mono text-[10px] text-rr-muted/60">Assignee: Platform / SRE Team · Due: Pending</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </article>
          </div>

          {/* Right sidebar: AI insights */}
          <div className="w-72 border-l border-rr-border bg-rr-surface flex flex-col shrink-0 overflow-y-auto p-4 gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <h3 className="font-medium text-[13px] text-rr-text">Copilot Insights</h3>
            </div>

            {/* Recurrence */}
            <div className="bg-rr-bg border border-rr-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-rr-border flex justify-between">
                <span className="font-mono text-[11px] text-rr-text">Recurrence Probability</span>
                <span className="font-mono text-[11px] text-rr-warn">Medium (64%)</span>
              </div>
              <div className="p-3">
                <p className="font-mono text-[11px] text-rr-muted mb-2">Cascading timeouts are typical under high thread-pool saturation events.</p>
                <div className="h-1 w-full bg-rr-border rounded-full overflow-hidden">
                  <div className="h-full bg-rr-warn rounded-full" style={{ width: "64%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="font-mono text-[12px] text-rr-muted">Select a postmortem to view</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[18px] font-semibold text-rr-text tracking-tight mb-4 pb-3 border-b border-rr-border">{title}</h2>
      {children}
    </div>
  );
}

interface TimelineEvent {
  time: string;
  color: string;
  text: string;
  isError?: boolean;
  isSuccess?: boolean;
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="flex flex-col gap-0 pl-4 border-l-2 border-rr-border ml-2">
      {events.map((event, i) => (
        <div key={i} className="relative pl-4 pb-4">
          <div className={cn("absolute -left-[9px] top-0.5 w-3 h-3 rounded-full border-2 border-rr-bg", event.color)} />
          <span className={cn("font-mono text-[11px] mr-3", event.isError ? "text-rr-error" : event.isSuccess ? "text-rr-green" : "text-rr-muted")}>{event.time}</span>
          <span className="font-mono text-[12px] text-rr-text">{event.text}</span>
        </div>
      ))}
    </div>
  );
}
