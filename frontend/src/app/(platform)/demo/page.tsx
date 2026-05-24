"use client";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type DemoPhase =
  | "idle" | "healthy" | "deploying" | "anomaly"
  | "ai_detecting" | "replay" | "rca" | "postmortem" | "prevention";

const PHASE_DURATION = 4500;
const PHASES: DemoPhase[] = [
  "healthy", "deploying", "anomaly", "ai_detecting",
  "replay", "rca", "postmortem", "prevention",
];

const PHASE_META: Record<DemoPhase, { label: string; step: number }> = {
  idle:         { label: "Ready",               step: 0 },
  healthy:      { label: "Systems Healthy",      step: 1 },
  deploying:    { label: "Deployment Started",   step: 2 },
  anomaly:      { label: "Anomaly Detected",     step: 3 },
  ai_detecting: { label: "AI Analyzing",         step: 4 },
  replay:       { label: "Replay Active",        step: 5 },
  rca:          { label: "RCA Generated",        step: 6 },
  postmortem:   { label: "Postmortem Generated", step: 7 },
  prevention:   { label: "Prevention Ready",     step: 8 },
};

export default function DemoPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [running, setRunning] = useState(false);
  const [aiText, setAiText] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [errorRate, setErrorRate] = useState(0.1);
  const [latency, setLatency] = useState(18);
  const phaseIdx = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advancePhase = () => {
    phaseIdx.current = Math.min(phaseIdx.current + 1, PHASES.length - 1);
    const next = PHASES[phaseIdx.current];
    setPhase(next);
    if (next === "anomaly")      { setErrorRate(45); setLatency(2400); }
    if (next === "ai_detecting") { setConfidence(0); }
    if (next === "prevention")   { setErrorRate(0.8); setLatency(22); }
    if (next !== "prevention" && phaseIdx.current < PHASES.length - 1) {
      timerRef.current = setTimeout(advancePhase, PHASE_DURATION);
    }
  };

  const startDemo = () => {
    phaseIdx.current = 0;
    setPhase("healthy");
    setRunning(true);
    setErrorRate(0.1);
    setLatency(18);
    timerRef.current = setTimeout(advancePhase, PHASE_DURATION);
  };

  const stopDemo = () => {
    setRunning(false);
    setPhase("idle");
    phaseIdx.current = 0;
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // Confidence counter
  useEffect(() => {
    if (phase !== "ai_detecting") return;
    let val = 0;
    const id = setInterval(() => {
      val += 3 + Math.random() * 4;
      setConfidence(Math.min(94, val));
      if (val >= 94) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [phase]);

  // AI typing
  const AI_MESSAGES: Partial<Record<DemoPhase, string>> = {
    healthy:      "› All systems nominal. Monitoring 7 services.\n› Request rate: 4,200 req/s · P99: 18ms · Error rate: 0.1%\n› No anomalies detected. Standing by.",
    deploying:    "› Deployment detected: auth-service v2.4.1\n› Rolling update in progress. 2 of 3 pods healthy.\n› Monitoring for anomalies...",
    anomaly:      "⚠ Anomaly detected!\n› auth-service latency spike P99: 2,400ms\n› Error rate jumped from 0.1% → 45%\n› Initiating root cause analysis...",
    ai_detecting: "› Analyzing 847 log entries across 4 services...\n› Pattern match: Redis connection pool exhaustion\n› Historical similarity: 91% match to INC-2023-08-12\n› Root cause identified with 94% confidence",
    replay:       "› Generating cinematic incident replay for INC-8241...\n› Timeline reconstructed from 12:00:00 to 12:04:10 UTC\n› 47 events indexed · 4 services affected",
    rca:          "› Root Cause Analysis complete. Confidence: 94%\n› Primary cause: Redis maxmemory exhaustion\n› Triggered by: unpaginated query in auth-service v2.4.1\n› Recommendation: Rollback auth-service to v2.4.0",
    postmortem:   "› Generating automated postmortem document...\n› Extracting timeline, impact data, remediation steps\n› Estimated customer impact: ~2,400 requests affected\n› Postmortem draft ready for review",
    prevention:   "› Analysis complete. 3 prevention actions generated.\n› Gate future deploys on Redis memory headroom check\n› Enable canary deploy gates with P99 threshold monitoring\n› Add EXPLAIN plan analysis to CI pipeline",
  };

  useEffect(() => {
    const msg = AI_MESSAGES[phase] ?? "";
    if (!msg) { setAiText(""); return; }
    setAiText("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setAiText(msg.slice(0, i));
      if (i >= msg.length) clearInterval(id);
    }, 10);
    return () => clearInterval(id);
  }, [phase]);

  const stepMeta = PHASE_META[phase];

  return (
    // Fill exactly the content area: full viewport minus 3.5rem topbar
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-transparent overflow-hidden relative">

      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "radial-gradient(rgba(103,247,177,1) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      {/* ── Demo top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-6 h-12 border-b border-rr-border bg-rr-bg/90 backdrop-blur shrink-0">
        <div className="flex items-center gap-4">
          {running && (
            <div className="flex items-center gap-2 bg-rr-error/10 border border-rr-error/25 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-rr-error animate-pulse" />
              <span className="font-mono text-[11px] text-rr-error uppercase tracking-widest">Demo Mode Active</span>
            </div>
          )}
          {/* Progress pills */}
          {running && (
            <div className="flex items-center gap-1">
              {PHASES.slice(0, -1).map((p, i) => (
                <div key={p} className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i <= phaseIdx.current ? "bg-rr-green w-7" : "bg-rr-border w-4"
                )} />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {running && <span className="font-mono text-[12px] text-rr-muted">Phase: {stepMeta.label}</span>}
          {running && (
            <button onClick={stopDemo}
              className="font-mono text-[11px] text-rr-muted hover:text-rr-text border border-rr-border px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors">
              Exit Demo
            </button>
          )}
        </div>
      </div>

      {/* ── IDLE SCREEN ── */}
      {phase === "idle" && (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center space-y-8 max-w-xl w-full px-6">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-rr-green/10 border border-rr-green/25 flex items-center justify-center"
              style={{ boxShadow: "0 0 40px rgba(103,247,177,0.12)" }}>
              <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            </div>
            <div>
              <h1 className="text-4xl font-semibold text-rr-text tracking-tight mb-3">Launch Demo Scenario</h1>
              <p className="font-mono text-[14px] text-rr-muted leading-relaxed">
                Watch RootRecall detect, analyze, and resolve an infrastructure incident end-to-end — in real time.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left max-w-md mx-auto">
              {[
                "Systems healthy baseline",
                "Deployment triggers anomaly",
                "AI detects root cause",
                "Incident replay generated",
                "RCA + postmortem automated",
                "Prevention steps delivered",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 font-mono text-[13px] text-rr-muted bg-rr-surface/50 border border-rr-border rounded-xl px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-rr-green/10 border border-rr-green/30 flex items-center justify-center text-rr-green font-bold text-[11px] shrink-0">{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
            <button
              onClick={startDemo}
              className="inline-flex items-center gap-2 bg-rr-green text-rr-bg font-mono text-[14px] font-semibold px-8 py-4 rounded-2xl hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ boxShadow: "0 0 30px rgba(103,247,177,0.3)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              Launch Demo Scenario
            </button>
          </div>
        </div>
      )}

      {/* ── RUNNING STATE ── */}
      {phase !== "idle" && (
        <div className="flex-1 flex overflow-hidden relative z-10 min-h-0">

          {/* ── LEFT: Service Topology ── */}
          <div className="w-[22%] min-w-[200px] border-r border-rr-border bg-rr-surface/40 flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-rr-border">
              <span className="font-mono text-[10px] text-rr-muted uppercase tracking-widest">Service Topology</span>
            </div>
            <div className="flex-1 relative overflow-hidden"
              style={{ backgroundImage: "radial-gradient(rgba(103,247,177,0.04) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
              <ServiceNode name="API Gateway"  status="healthy"
                status2={phase} x={50} y={12} />
              <ServiceNode name="Auth Service"
                status2={phase}
                status={["anomaly","ai_detecting","replay","rca"].includes(phase) ? "critical" : phase === "deploying" ? "deploying" : "healthy"}
                x={25} y={42} />
              <ServiceNode name="Checkout API"
                status2={phase}
                status={["anomaly","ai_detecting","replay","rca"].includes(phase) ? "degraded" : "healthy"}
                x={75} y={42} />
              <ServiceNode name="Redis Cache"
                status2={phase}
                status={["anomaly","ai_detecting","replay","rca","postmortem"].includes(phase) ? "critical" : "healthy"}
                x={50} y={75} />
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1="50%" y1="14%" x2="25%" y2="40%" stroke="#3c4a41" strokeWidth="1" strokeDasharray="4 3" />
                <line x1="50%" y1="14%" x2="75%" y2="40%" stroke="#3c4a41" strokeWidth="1" strokeDasharray="4 3" />
                <line x1="27%" y1="47%" x2="50%" y2="72%"
                  stroke={["anomaly","ai_detecting"].includes(phase) ? "#ffb4ab" : "#3c4a41"}
                  strokeWidth={["anomaly","ai_detecting"].includes(phase) ? "2" : "1"} strokeDasharray="4 3" />
                <line x1="73%" y1="47%" x2="52%" y2="72%"
                  stroke={["anomaly","ai_detecting"].includes(phase) ? "#ffb4ab" : "#3c4a41"}
                  strokeWidth={["anomaly","ai_detecting"].includes(phase) ? "2" : "1"} strokeDasharray="4 3" />
              </svg>
            </div>
            {/* Live metrics */}
            <div className="p-4 border-t border-rr-border space-y-3">
              <MetricRow label="Error Rate"   value={`${errorRate.toFixed(1)}%`}  danger={errorRate > 5} />
              <MetricRow label="P99 Latency"  value={`${latency.toLocaleString()}ms`} danger={latency > 500} />
              <MetricRow label="Request Rate" value="4,200 req/s" danger={false} />
              <MetricRow label="Services"     value={`${["anomaly","ai_detecting","replay","rca"].includes(phase) ? "2/7 ⚠" : "7/7 ✓"}`}
                danger={["anomaly","ai_detecting","replay","rca"].includes(phase)} />
            </div>
          </div>

          {/* ── CENTER: Phase Display ── */}
          <div className="flex-1 flex flex-col items-center justify-center p-10 min-h-0 overflow-hidden">
            <PhaseDisplay phase={phase} confidence={confidence} router={router} />
          </div>

          {/* ── RIGHT: AI Response Stream ── */}
          <div className="w-[22%] min-w-[200px] border-l border-rr-border bg-rr-surface/40 flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-rr-border flex items-center gap-2">
              <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <span className="font-mono text-[10px] text-rr-green uppercase tracking-widest">AI Response Stream</span>
              {running && (
                <div className="ml-auto flex items-end gap-[2px] h-4">
                  {[0,1,2,3,4].map((i) => (
                    <div key={i} className="w-1 bg-rr-green rounded-full"
                      style={{ height: `${40 + Math.random() * 60}%`, animation: `waveform ${0.8 + i * 0.1}s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="font-mono text-[12px] text-rr-green leading-relaxed whitespace-pre-line">
                {aiText}
                <span className="inline-block w-0.5 h-3.5 bg-rr-green ml-0.5 align-middle animate-pulse" />
              </div>
              {phase === "prevention" && (
                <div className="mt-5 space-y-2.5">
                  {[
                    "Gate deploys on Redis memory headroom > 20%",
                    "Enable canary deploy gates with auto-rollback",
                    "Add EXPLAIN plan analysis to CI pipeline",
                  ].map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-rr-muted font-mono text-[11px] leading-relaxed">
                      <span className="material-symbols-outlined text-rr-green mt-0.5 shrink-0" style={{ fontSize: 14 }}>check_circle</span>
                      {action}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {phase === "prevention" && (
              <div className="p-4 border-t border-rr-border">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-rr-green text-rr-bg font-mono text-[13px] font-semibold py-3 rounded-xl hover:opacity-90 transition-all hover:scale-[1.01]"
                  style={{ boxShadow: "0 0 20px rgba(103,247,177,0.25)" }}
                >
                  Open Dashboard →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ServiceNode({ name, status, status2, x, y }: { name: string; status: string; status2: string; x: number; y: number }) {
  return (
    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5"
      style={{ left: `${x}%`, top: `${y}%` }}>
      <div className={cn(
        "w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-500",
        status === "critical"  ? "border-rr-error bg-rr-error/15 animate-pulse shadow-[0_0_16px_rgba(255,180,171,0.3)]" :
        status === "degraded"  ? "border-rr-warn bg-rr-warn/10" :
        status === "deploying" ? "border-rr-warn bg-rr-warn/10 animate-pulse" :
        "border-rr-green/40 bg-rr-green/5"
      )}>
        <span className={cn(
          "material-symbols-outlined",
          status === "critical" ? "text-rr-error" :
          status === "degraded" ? "text-rr-warn" :
          status === "deploying" ? "text-rr-warn" : "text-rr-green"
        )} style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>hub</span>
      </div>
      <span className="font-mono text-[9px] text-rr-muted bg-rr-bg/90 px-2 py-0.5 rounded border border-rr-border whitespace-nowrap">{name}</span>
      {status === "deploying" && <span className="font-mono text-[8px] text-rr-warn animate-pulse">DEPLOYING</span>}
      {status === "critical"  && <span className="font-mono text-[8px] text-rr-error animate-pulse">CRITICAL</span>}
    </div>
  );
}

function MetricRow({ label, value, danger }: { label: string; value: string; danger: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] text-rr-muted">{label}</span>
      <span className={cn("font-mono text-[13px] font-bold transition-colors", danger ? "text-rr-error" : "text-rr-green")}>{value}</span>
    </div>
  );
}

function PhaseDisplay({ phase, confidence, router }: { phase: DemoPhase; confidence: number; router: ReturnType<typeof useRouter> }) {
  if (phase === "healthy") return (
    <div className="text-center space-y-6 w-full max-w-2xl">
      <div className="w-24 h-24 mx-auto rounded-3xl bg-rr-green/10 border border-rr-green/25 flex items-center justify-center"
        style={{ boxShadow: "0 0 40px rgba(103,247,177,0.15)" }}>
        <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      </div>
      <div className="font-semibold text-4xl text-rr-green tracking-tight">All Systems Operational</div>
      <div className="font-mono text-[14px] text-rr-muted">Monitoring 7 services · 4,200 req/s · P99: 18ms · Error rate: 0.1%</div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {[
          { l: "Uptime", v: "99.98%", ok: true },
          { l: "Avg Latency", v: "18ms", ok: true },
          { l: "Error Rate", v: "0.1%", ok: true },
        ].map(m => (
          <div key={m.l} className="bg-rr-surface/60 border border-rr-green/15 rounded-xl p-4 text-center">
            <div className="font-mono text-[10px] text-rr-muted uppercase mb-1">{m.l}</div>
            <div className="font-mono text-2xl font-bold text-rr-green">{m.v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (phase === "deploying") return (
    <div className="space-y-6 w-full max-w-2xl">
      <div className="font-mono text-[11px] text-rr-warn uppercase tracking-widest">Deployment In Progress</div>
      <div className="text-3xl font-semibold text-rr-text">auth-service v2.4.1</div>
      <div className="space-y-3">
        {["Pod 1/3 — Running", "Pod 2/3 — Running", "Pod 3/3 — Starting..."].map((pod, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className={cn("h-2 flex-1 rounded-full overflow-hidden relative", i < 2 ? "bg-rr-green/20" : "bg-rr-border")}>
              <div className={cn("h-full rounded-full transition-all duration-1000",
                i < 2 ? "bg-rr-green w-full" : "bg-rr-warn w-2/3")} />
            </div>
            <span className="font-mono text-[12px] text-rr-muted w-44 shrink-0">{pod}</span>
            <span className={cn("font-mono text-[11px]", i < 2 ? "text-rr-green" : "text-rr-warn")}>{i < 2 ? "✓" : "⟳"}</span>
          </div>
        ))}
      </div>
      <div className="bg-rr-surface/60 border border-rr-warn/20 rounded-xl p-4 font-mono text-[12px] text-rr-muted space-y-1">
        <div className="text-rr-warn">› Rolling update: 2 of 3 replicas healthy</div>
        <div>› Traffic temporarily redirected to v2.4.0 replicas</div>
        <div>› Monitoring for anomalies...</div>
      </div>
    </div>
  );

  if (phase === "anomaly") return (
    <div className="text-center space-y-6 w-full max-w-2xl">
      <div className="w-24 h-24 mx-auto rounded-3xl bg-rr-error/10 border-2 border-rr-error flex items-center justify-center animate-pulse"
        style={{ boxShadow: "0 0 50px rgba(255,180,171,0.35)" }}>
        <span className="material-symbols-outlined text-rr-error" style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}>crisis_alert</span>
      </div>
      <div className="font-semibold text-4xl text-rr-error">Anomaly Detected</div>
      <div className="font-mono text-[14px] text-rr-muted">P99 Latency spiked · Error rate: 45% · Auto-analysis triggered</div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { l: "Error Rate", v: "45.0%", c: "text-rr-error" },
          { l: "P99 Latency", v: "2,400ms", c: "text-rr-error" },
          { l: "Impact", v: "HIGH", c: "text-rr-error" },
        ].map(m => (
          <div key={m.l} className="bg-rr-surface/60 border border-rr-error/25 rounded-xl p-5 text-center">
            <div className="font-mono text-[10px] text-rr-muted uppercase mb-2">{m.l}</div>
            <div className={cn("font-mono text-2xl font-bold", m.c)}>{m.v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (phase === "ai_detecting") return (
    <div className="space-y-6 w-full max-w-2xl">
      <div className="flex items-center gap-2 font-mono text-[12px] text-rr-green uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full bg-rr-green animate-pulse" />
        Root Cause Analysis In Progress
      </div>
      <div className="text-3xl font-semibold text-rr-text">Analyzing 847 log entries...</div>
      <div className="space-y-2">
        <div className="flex justify-between font-mono text-[12px]">
          <span className="text-rr-muted">AI Confidence</span>
          <span className="text-rr-green font-bold">{Math.round(confidence)}%</span>
        </div>
        <div className="h-3 bg-rr-border rounded-full overflow-hidden">
          <div className="h-full bg-rr-green rounded-full transition-all duration-100"
            style={{ width: `${confidence}%`, boxShadow: "0 0 12px rgba(103,247,177,0.6)" }} />
        </div>
      </div>
      <div className="bg-rr-surface/60 border border-rr-green/20 rounded-xl p-5 font-mono text-[13px] text-rr-muted space-y-2">
        <div className="text-rr-green">› Pattern match: Redis connection pool exhaustion</div>
        <div>› Historical match: INC-2023-08-12 (91% similar)</div>
        <div>› Probable trigger: auth-service v2.4.1 deploy</div>
        <div>› Analyzing cascading failure path...</div>
      </div>
    </div>
  );

  if (phase === "replay") return (
    <div className="space-y-6 w-full max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>replay</span>
        <div>
          <div className="font-mono text-[11px] text-rr-muted uppercase tracking-widest">Incident Replay</div>
          <div className="text-2xl font-semibold text-rr-text">INC-8241 — Payment Gateway Timeout</div>
        </div>
      </div>
      {/* Timeline */}
      <div className="space-y-3">
        {[
          { time: "12:00:00", event: "auth-service v2.4.1 deploy started",     color: "text-rr-muted" },
          { time: "12:01:42", event: "Redis connection pool saturation begins", color: "text-rr-warn" },
          { time: "12:02:10", event: "P99 latency crosses 500ms threshold",     color: "text-rr-warn" },
          { time: "12:02:55", event: "Error rate exceeds 45% — alert fired",    color: "text-rr-error" },
          { time: "12:04:10", event: "RootRecall AI analysis complete",         color: "text-rr-green" },
        ].map((e, i) => (
          <div key={i} className="flex items-start gap-4 font-mono animate-stream-in opacity-0"
            style={{ animationDelay: `${i * 0.3}s`, animationFillMode: "forwards" }}>
            <span className="text-[11px] text-rr-muted shrink-0 mt-0.5">{e.time}</span>
            <span className="w-2 h-2 rounded-full bg-rr-border shrink-0 mt-1" />
            <span className={cn("text-[12px]", e.color)}>{e.event}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (phase === "rca") return (
    <div className="space-y-5 w-full max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>psychology</span>
        <span className="font-mono text-[12px] text-rr-green uppercase tracking-widest">Root Cause Analysis</span>
        <span className="ml-auto font-mono text-[12px] text-rr-green bg-rr-green/10 border border-rr-green/25 px-3 py-1 rounded-full">94% Confidence</span>
      </div>
      <div className="bg-rr-surface/60 border border-rr-border rounded-2xl p-6 space-y-5">
        <div>
          <div className="font-mono text-[10px] text-rr-muted uppercase mb-2">Root Cause</div>
          <div className="font-mono text-[15px] text-rr-text leading-relaxed">
            Redis connection pool exhaustion on <span className="text-rr-error">cache-cluster-02</span> triggered by unpaginated query in <span className="text-rr-warn">auth-service v2.4.1</span>
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-rr-muted uppercase mb-2">Blast Radius</div>
          <div className="flex gap-2 flex-wrap">
            {["auth-service", "checkout-api", "payment-gateway"].map(s => (
              <span key={s} className="font-mono text-[11px] text-rr-error bg-rr-error/10 border border-rr-error/20 px-2.5 py-1 rounded-lg">{s}</span>
            ))}
          </div>
        </div>
        <div className="border-t border-rr-border pt-4">
          <div className="font-mono text-[10px] text-rr-muted uppercase mb-2">Recommended Action</div>
          <button className="w-full bg-rr-green text-rr-bg font-mono text-[13px] font-semibold py-3 rounded-xl hover:opacity-90 transition-all"
            style={{ boxShadow: "0 0 20px rgba(103,247,177,0.25)" }}>
            Initiate Rollback to v2.4.0
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === "postmortem") return (
    <div className="space-y-5 w-full max-w-2xl">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-rr-green animate-pulse" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        <span className="font-mono text-[12px] text-rr-muted">Generating postmortem document...</span>
      </div>
      <div className="bg-rr-surface/60 border border-rr-border rounded-2xl p-6 space-y-3 font-mono text-[13px]">
        {[
          { line: "# Payment Gateway Timeout — Postmortem", cls: "text-rr-text font-bold text-[15px]" },
          { line: "## 1. Summary",         cls: "text-rr-green" },
          { line: "   45% error rate for 4m10s — ~2,400 user requests affected", cls: "text-rr-muted ml-4" },
          { line: "## 2. Root Cause",       cls: "text-rr-green" },
          { line: "   Redis pool exhaustion via auth-service v2.4.1 unpaginated query", cls: "text-rr-muted ml-4" },
          { line: "## 3. Timeline",         cls: "text-rr-green" },
          { line: "## 4. Prevention Actions", cls: "text-rr-green" },
        ].map((item, i) => (
          <div key={i} className={cn("animate-stream-in opacity-0", item.cls)}
            style={{ animationDelay: `${i * 0.35}s`, animationFillMode: "forwards" }}>
            {item.line}
          </div>
        ))}
      </div>
    </div>
  );

  if (phase === "prevention") return (
    <div className="text-center space-y-6 w-full max-w-2xl">
      <div className="w-24 h-24 mx-auto rounded-3xl bg-rr-green/10 border border-rr-green/25 flex items-center justify-center"
        style={{ boxShadow: "0 0 40px rgba(103,247,177,0.15)" }}>
        <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}>shield_check</span>
      </div>
      <div className="font-semibold text-4xl text-rr-text tracking-tight">Prevention Actions Ready</div>
      <div className="grid grid-cols-1 gap-3 text-left">
        {[
          "Gate future deploys on Redis memory headroom > 20%",
          "Enable canary deploy gates with P99 threshold auto-rollback",
          "Add EXPLAIN plan analysis to CI pipeline for query safety",
        ].map((action, i) => (
          <div key={i} className="flex items-center gap-3 bg-rr-surface/60 border border-rr-green/15 rounded-xl px-5 py-4">
            <span className="material-symbols-outlined text-rr-green shrink-0" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span className="font-mono text-[13px] text-rr-muted">{action}</span>
          </div>
        ))}
      </div>
      <div className="font-mono text-[14px] text-rr-green/80 italic pt-2">
        "RootRecall transforms operational chaos into actionable intelligence."
      </div>
    </div>
  );

  return null;
}
