"use client";
import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import { INCIDENTS, AI_MEMORIES, generateLogs } from "@/lib/telemetry";
import { useRouter } from "next/navigation";

type DemoPhase =
  | "idle" | "healthy" | "deploying" | "anomaly"
  | "ai_detecting" | "replay" | "rca" | "postmortem" | "prevention";

const PHASE_DURATION = 4500; // ms per phase
const PHASES: DemoPhase[] = [
  "healthy", "deploying", "anomaly", "ai_detecting",
  "replay", "rca", "postmortem", "prevention"
];

const PHASE_META: Record<DemoPhase, { label: string; step: number }> = {
  idle:         { label: "Ready", step: 0 },
  healthy:      { label: "Systems Healthy", step: 1 },
  deploying:    { label: "Deployment Started", step: 2 },
  anomaly:      { label: "Anomaly Detected", step: 3 },
  ai_detecting: { label: "AI Analyzing", step: 4 },
  replay:       { label: "Replay Active", step: 5 },
  rca:          { label: "RCA Generated", step: 6 },
  postmortem:   { label: "Postmortem Generated", step: 7 },
  prevention:   { label: "Prevention Ready", step: 8 },
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
    if (next === "anomaly") { setErrorRate(45); setLatency(2400); }
    if (next === "ai_detecting") { setConfidence(0); }
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
    healthy:      "› All systems nominal. Monitoring 7 services. Request rate: 4,200 req/s.",
    deploying:    "› Deployment detected: auth-service v2.4.1 rolling update. Monitoring for anomalies...",
    anomaly:      "⚠ Anomaly detected — auth-service latency spike P99: 2400ms. Error rate: 45%. Initiating root cause analysis.",
    ai_detecting: "› Analyzing 847 log entries across 4 services...\n› Pattern match: Redis connection pool exhaustion\n› Historical similarity: 91% match to INC-2023-08-12\n› Root cause identified: unpaginated query in auth-service v2.4.1",
    replay:       "› Generating cinematic incident replay for INC-8241...\n› Timeline reconstructed from 12:00:00 to 12:04:10 UTC",
    rca:          "› Root Cause Analysis complete. Confidence: 94%\n› Primary cause: Redis maxmemory exhaustion triggered by cache miss storm\n› Recommendation: Rollback auth-service to v2.4.0",
    postmortem:   "› Generating automated postmortem document...\n› Extracting timeline, impact data, and remediation steps\n› Postmortem draft ready for review",
    prevention:   "› Analysis complete. 3 prevention actions generated.\n› Gate future deploys on Redis memory headroom check\n› Enable canary deploy gates with P99 threshold monitoring",
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
    }, 12);
    return () => clearInterval(id);
  }, [phase]);

  const stepMeta = PHASE_META[phase];

  return (
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
      {/* Grid bg */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "radial-gradient(rgba(103,247,177,1) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 h-12 border-b border-rr-border bg-rr-bg/90 backdrop-blur shrink-0">
        <div className="flex items-center gap-4">
          {running && (
            <div className="flex items-center gap-2 bg-rr-error/10 border border-rr-error/25 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-rr-error animate-pulse" />
              <span className="font-mono text-[11px] text-rr-error uppercase tracking-widest">DEMO MODE ACTIVE</span>
            </div>
          )}
          {running && (
            <div className="flex items-center gap-1">
              {PHASES.slice(0, -1).map((p, i) => (
                <div key={p} className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i <= phaseIdx.current ? "bg-rr-green w-6" : "bg-rr-border w-4"
                )} />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {running && <span className="font-mono text-[11px] text-rr-muted">Phase: {stepMeta.label}</span>}
          {running ? (
            <button onClick={stopDemo} className="font-mono text-[11px] text-rr-muted hover:text-rr-text border border-rr-border px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors">
              Exit Demo
            </button>
          ) : null}
        </div>
      </div>

      {/* Idle screen */}
      {phase === "idle" && (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center space-y-6 max-w-lg">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-rr-green/10 border border-rr-green/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-rr-text tracking-tight mb-2">Launch Demo Scenario</h1>
              <p className="font-mono text-[13px] text-rr-muted leading-relaxed">
                Watch RootRecall detect, analyze, and resolve an infrastructure incident end-to-end — in real time.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-left max-w-xs mx-auto">
              {[
                "Systems healthy baseline",
                "Deployment triggers anomaly",
                "AI detects root cause",
                "Incident replay generated",
                "RCA + postmortem automated",
                "Prevention steps delivered",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 font-mono text-[12px] text-rr-muted">
                  <span className="w-5 h-5 rounded-full bg-rr-green/10 border border-rr-green/25 flex items-center justify-center text-rr-green font-bold text-[10px]">{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
            <button
              onClick={startDemo}
              className="inline-flex items-center gap-2 bg-rr-green text-rr-bg font-mono text-[13px] font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
              style={{ boxShadow: "0 0 20px rgba(103,247,177,0.25)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              Launch Demo Scenario
            </button>
          </div>
        </div>
      )}

      {/* Running state */}
      {phase !== "idle" && (
        <div className="flex-1 flex relative z-10 min-h-0">
          {/* Left: Topology */}
          <div className="w-80 border-r border-rr-border bg-rr-surface/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-rr-border">
              <span className="font-mono text-[10px] text-rr-muted uppercase tracking-widest">Service Topology</span>
            </div>
            <div className="flex-1 relative overflow-hidden" style={{ backgroundImage: "radial-gradient(rgba(103,247,177,0.04) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
              <ServiceNode name="API Gateway" status="healthy" x={50} y={15} />
              <ServiceNode name="Auth Service" status={["anomaly", "ai_detecting", "replay", "rca"].includes(phase) ? "critical" : phase === "deploying" ? "deploying" : "healthy"} x={25} y={45} />
              <ServiceNode name="Checkout API" status={["anomaly", "ai_detecting", "replay", "rca"].includes(phase) ? "critical" : "healthy"} x={70} y={45} />
              <ServiceNode name="Redis Cache" status={["anomaly", "ai_detecting", "replay", "rca", "postmortem"].includes(phase) ? "critical" : "healthy"} x={50} y={78} />
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1="50%" y1="18%" x2="25%" y2="43%" stroke="#3c4a41" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="50%" y1="18%" x2="72%" y2="43%" stroke="#3c4a41" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="27%" y1="48%" x2="50%" y2="75%"
                  stroke={["anomaly", "ai_detecting"].includes(phase) ? "#ffb4ab" : "#3c4a41"}
                  strokeWidth={["anomaly", "ai_detecting"].includes(phase) ? "2" : "1"} strokeDasharray="3 3" />
                <line x1="70%" y1="48%" x2="52%" y2="75%"
                  stroke={["anomaly", "ai_detecting"].includes(phase) ? "#ffb4ab" : "#3c4a41"}
                  strokeWidth={["anomaly", "ai_detecting"].includes(phase) ? "2" : "1"} strokeDasharray="3 3" />
              </svg>
            </div>
            {/* Live metrics */}
            <div className="p-3 border-t border-rr-border space-y-2">
              <MetricRow label="Error Rate" value={`${errorRate.toFixed(1)}%`} danger={errorRate > 5} />
              <MetricRow label="P99 Latency" value={`${latency}ms`} danger={latency > 500} />
            </div>
          </div>

          {/* Center: Event display */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-0">
            <PhaseDisplay phase={phase} confidence={confidence} />
          </div>

          {/* Right: AI stream */}
          <div className="w-80 border-l border-rr-border bg-rr-surface/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-rr-border flex items-center gap-2">
              <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <span className="font-mono text-[11px] text-rr-green uppercase tracking-widest">AI Response Stream</span>
              {/* Waveform */}
              {running && (
                <div className="ml-auto flex items-end gap-[2px] h-4">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-1 bg-rr-green rounded-full" style={{
                      height: `${40 + Math.random() * 60}%`,
                      animation: `waveform ${0.8 + i * 0.1}s ease-in-out infinite`,
                      animationDelay: `${i * 0.1}s`,
                    }} />
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="font-mono text-[12px] text-rr-green leading-relaxed whitespace-pre-line cursor-blink">
                {aiText}
              </div>
              {phase === "prevention" && (
                <div className="mt-4 space-y-2">
                  {[
                    "Gate deploys on Redis memory headroom > 20%",
                    "Enable canary deploy gates with auto-rollback",
                    "Add EXPLAIN plan analysis to CI pipeline",
                  ].map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-rr-muted font-mono text-[11px]">
                      <span className="material-symbols-outlined text-rr-green mt-0.5" style={{ fontSize: 14 }}>check_circle</span>
                      {action}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {phase === "prevention" && (
              <div className="p-3 border-t border-rr-border">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-rr-green text-rr-bg font-mono text-[12px] font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Open Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceNode({ name, status, x, y }: { name: string; status: string; x: number; y: number }) {
  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all duration-500",
        status === "critical" ? "border-rr-error bg-rr-error/15 animate-pulse" :
        status === "deploying" ? "border-rr-warn bg-rr-warn/10" :
        "border-rr-green/40 bg-rr-green/5"
      )}>
        <span className={cn(
          "material-symbols-outlined",
          status === "critical" ? "text-rr-error" :
          status === "deploying" ? "text-rr-warn" : "text-rr-green"
        )} style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>hub</span>
      </div>
      <span className="font-mono text-[9px] text-rr-muted bg-rr-bg px-1.5 py-0.5 rounded border border-rr-border whitespace-nowrap">{name}</span>
      {status === "deploying" && <span className="font-mono text-[8px] text-rr-warn animate-pulse">DEPLOYING</span>}
    </div>
  );
}

function MetricRow({ label, value, danger }: { label: string; value: string; danger: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] text-rr-muted">{label}</span>
      <span className={cn("font-mono text-[12px] font-bold transition-colors", danger ? "text-rr-error" : "text-rr-green")}>{value}</span>
    </div>
  );
}

function PhaseDisplay({ phase, confidence }: { phase: DemoPhase; confidence: number }) {
  if (phase === "healthy") return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-rr-green/10 border border-rr-green/25 flex items-center justify-center">
        <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      </div>
      <div className="font-semibold text-2xl text-rr-green tracking-tight">All Systems Operational</div>
      <div className="font-mono text-[12px] text-rr-muted">Monitoring 7 services · 4,200 req/s · P99: 18ms</div>
    </div>
  );

  if (phase === "deploying") return (
    <div className="space-y-4 w-full max-w-sm">
      <div className="font-mono text-[10px] text-rr-warn uppercase tracking-widest">Deployment In Progress</div>
      <div className="text-xl font-semibold text-rr-text">auth-service v2.4.1</div>
      <div className="space-y-2">
        {["Pod 1/3 ✓", "Pod 2/3 ✓", "Pod 3/3 ..."].map((pod, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn("h-1 flex-1 rounded-full", i < 2 ? "bg-rr-green" : "bg-rr-border overflow-hidden relative")}>
              {i === 2 && <div className="h-full bg-rr-warn rounded-full w-2/3" />}
            </div>
            <span className="font-mono text-[11px] text-rr-muted">{pod}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (phase === "anomaly") return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-rr-error/10 border-2 border-rr-error flex items-center justify-center animate-pulse"
        style={{ boxShadow: "0 0 30px rgba(255,180,171,0.3)" }}>
        <span className="material-symbols-outlined text-rr-error" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>crisis_alert</span>
      </div>
      <div className="font-semibold text-2xl text-rr-error">Anomaly Detected</div>
      <div className="font-mono text-[12px] text-rr-muted">P99 Latency: 2,400ms · Error Rate: 45%</div>
      <div className="flex gap-3 justify-center">
        {[{ l: "Error Rate", v: "45%", c: "text-rr-error" }, { l: "Latency P99", v: "2,400ms", c: "text-rr-error" }, { l: "Impact", v: "HIGH", c: "text-rr-error" }].map((m) => (
          <div key={m.l} className="bg-rr-surface border border-rr-error/25 rounded-lg p-3 text-center">
            <div className="font-mono text-[9px] text-rr-muted uppercase">{m.l}</div>
            <div className={cn("font-mono text-sm font-bold", m.c)}>{m.v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (phase === "ai_detecting") return (
    <div className="space-y-4 w-full max-w-sm">
      <div className="flex items-center gap-2 font-mono text-[11px] text-rr-green uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-rr-green animate-pulse" />
        ROOT CAUSE ANALYSIS IN PROGRESS
      </div>
      <div className="text-xl font-semibold text-rr-text">Analyzing 847 log entries...</div>
      <div className="space-y-1.5">
        <div className="flex justify-between font-mono text-[11px]">
          <span className="text-rr-muted">AI Confidence</span>
          <span className="text-rr-green font-bold">{Math.round(confidence)}%</span>
        </div>
        <div className="h-2 bg-rr-border rounded-full overflow-hidden">
          <div className="h-full bg-rr-green rounded-full transition-all duration-100" style={{ width: `${confidence}%`, boxShadow: "0 0 8px rgba(103,247,177,0.5)" }} />
        </div>
      </div>
      <div className="bg-rr-surface border border-rr-green/20 rounded-lg p-3 font-mono text-[11px] text-rr-muted space-y-1">
        <div className="text-rr-green">› Pattern match: Redis connection pool exhaustion</div>
        <div>› Historical match: INC-2023-08-12 (91% similar)</div>
        <div>› Probable trigger: auth-service v2.4.1 deploy</div>
      </div>
    </div>
  );

  if (phase === "rca") return (
    <div className="space-y-4 w-full max-w-md">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>psychology</span>
        <span className="font-mono text-[11px] text-rr-green uppercase tracking-widest">Root Cause Analysis</span>
        <span className="ml-auto font-mono text-[11px] text-rr-green bg-rr-green/10 border border-rr-green/25 px-2 py-0.5 rounded-full">94% Confidence</span>
      </div>
      <div className="bg-rr-surface border border-rr-border rounded-xl p-4 space-y-3">
        <div>
          <div className="font-mono text-[10px] text-rr-muted uppercase mb-1">Root Cause</div>
          <div className="font-mono text-[13px] text-rr-text">Redis connection pool exhaustion on cache-cluster-02 triggered by unpaginated query in auth-service v2.4.1</div>
        </div>
        <div className="border-t border-rr-border pt-3">
          <div className="font-mono text-[10px] text-rr-muted uppercase mb-1">Recommended Action</div>
          <button className="w-full bg-rr-green text-rr-bg font-mono text-[12px] font-semibold py-2 rounded-lg">
            Initiate Rollback to v2.4.0
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === "postmortem") return (
    <div className="space-y-3 w-full max-w-md">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-rr-green animate-pulse" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        <span className="font-mono text-[11px] text-rr-muted">Generating postmortem document...</span>
      </div>
      {["# Payment Gateway Timeout — Postmortem", "## 1. Summary", "## 2. Impact", "## 3. Root Cause Analysis", "## 4. Timeline"].map((line, i) => (
        <div key={i} className="font-mono text-[12px] text-rr-muted animate-stream-in opacity-0"
          style={{ animationDelay: `${i * 0.4}s`, animationFillMode: "forwards" }}>
          {line}
        </div>
      ))}
    </div>
  );

  if (phase === "prevention") return (
    <div className="text-center space-y-6 max-w-md">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-rr-green/10 border border-rr-green/25 flex items-center justify-center">
        <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>shield_check</span>
      </div>
      <div className="font-semibold text-2xl text-rr-text tracking-tight">Prevention Actions Ready</div>
      <div className="font-mono text-[13px] text-rr-green/80 italic">
        "RootRecall transforms operational chaos into actionable intelligence."
      </div>
    </div>
  );

  return null;
}
