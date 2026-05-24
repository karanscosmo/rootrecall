"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · Cinematic Incident Replay Page
// Full-viewport, story-mode incident reconstruction with service topology,
// AI commentary, and an animated playback timeline.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import Logo from "@/components/ui/Logo";
import { useStore } from "@/store";
import { formatTimestamp } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PlaySpeed = 0.5 | 1 | 2;

interface TimelineEvent {
  id: string;
  label: string;
  time: string;
  type: "normal" | "deploy" | "anomaly" | "critical";
  positionPct: number;
  active?: boolean;
  description: string;
  codeBlock?: string;
}

interface TopologyNode {
  id: string;
  label: string;
  status: "healthy" | "degraded" | "critical";
  latency: string;
  gridCol: number;
  gridRow: number;
  extraLabel?: string;
  isActive?: boolean;
}

interface TopologyEdge {
  from: string;
  to: string;
  critical?: boolean;
}

const TOPOLOGY_EDGES: TopologyEdge[] = [
  { from: "api-gateway", to: "auth-service" },
  { from: "api-gateway", to: "checkout-api" },
  { from: "api-gateway", to: "user-profile" },
  { from: "auth-service", to: "cache-cluster" },
  { from: "auth-service", to: "db-primary" },
  { from: "checkout-api", to: "cache-cluster" },
  { from: "checkout-api", to: "worker-pool" },
  { from: "user-profile", to: "db-primary" },
  { from: "user-profile", to: "cache-cluster" },
  { from: "worker-pool", to: "db-primary" },
  { from: "worker-pool", to: "cache-cluster" },
  { from: "worker-pool", to: "job-queue" },
  { from: "job-queue", to: "db-primary" },
];

function StatusDot({ status }: { status: "healthy" | "degraded" | "critical" }) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full flex-shrink-0",
        status === "healthy" && "bg-rr-green",
        status === "degraded" && "bg-rr-warn",
        status === "critical" && "bg-rr-error animate-pulse"
      )}
    />
  );
}

function TopologyNodeCard({ node }: { node: TopologyNode }) {
  const borderColor =
    node.status === "healthy"
      ? "border-rr-green/45"
      : node.status === "degraded"
      ? "border-rr-warn/50"
      : "border-rr-error";

  const bgGlow =
    node.status === "critical"
      ? "shadow-[0_0_20px_rgba(239,68,68,0.25)] border-rr-error bg-rr-error/5"
      : node.status === "degraded"
      ? "shadow-[0_0_10px_rgba(250,204,21,0.12)] border-rr-warn/40 bg-rr-warn/5"
      : "";

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 px-2.5 py-1.5 rounded-lg border bg-rr-surface text-[11px]",
        "transition-all duration-300 select-none",
        borderColor,
        bgGlow,
        node.isActive && "scale-105 z-10"
      )}
      style={{ minWidth: 125 }}
    >
      {node.isActive && (
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rr-error opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rr-error" />
        </span>
      )}

      <div className="flex items-center gap-1.5">
        <StatusDot status={node.status} />
        <span className="font-semibold text-rr-text tracking-tight truncate">{node.label}</span>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-mono text-[9px]",
            node.status === "healthy" && "text-rr-green",
            node.status === "degraded" && "text-rr-warn",
            node.status === "critical" && "text-rr-error"
          )}
        >
          {node.latency}
        </span>
        <span
          className={cn(
            "uppercase text-[8px] font-bold tracking-widest px-1 py-0.5 rounded",
            node.status === "healthy" && "bg-rr-green/10 text-rr-green",
            node.status === "degraded" && "bg-rr-warn/10 text-rr-warn",
            node.status === "critical" && "bg-rr-error/10 text-rr-error"
          )}
        >
          {node.status}
        </span>
      </div>

      {node.extraLabel && (
        <span className="text-[8px] font-mono text-rr-error font-bold truncate">● {node.extraLabel}</span>
      )}
    </div>
  );
}

function WaveformBars() {
  return (
    <div className="flex items-end gap-[2px] h-3.5" aria-hidden>
      {[0.4, 0.7, 1, 0.6, 0.85].map((h, i) => (
        <div
          key={i}
          className="w-[2.5px] bg-rr-green rounded-sm origin-bottom"
          style={{
            height: `${h * 100}%`,
            animation: `waveform 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes waveform {
          from { transform: scaleY(0.3); opacity: 0.5; }
          to   { transform: scaleY(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const dotColor =
    event.type === "deploy"
      ? "bg-blue-400"
      : event.type === "anomaly"
      ? "bg-rr-green"
      : event.type === "critical"
      ? "bg-rr-error"
      : "bg-rr-muted";

  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2 border transition-all duration-300",
        event.active
          ? "border-l-2 border-l-rr-green border-rr-border bg-rr-green/5"
          : event.type === "critical"
          ? "border-rr-error/20 bg-transparent opacity-60"
          : "border-transparent bg-transparent opacity-40"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0 flex flex-col items-center gap-1">
          <span className={cn("w-2 h-2 rounded-full", dotColor)} />
          {event.active && (
            <span className="w-[1px] h-full bg-rr-green/30 flex-1 min-h-[15px]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span
              className={cn(
                "text-xs font-semibold tracking-tight",
                event.active ? "text-rr-text" : "text-rr-muted",
                event.type === "critical" && "text-rr-error"
              )}
            >
              {event.label}
            </span>
            <span className="text-[9px] font-mono text-rr-muted flex-shrink-0">
              {event.time}
            </span>
          </div>

          <p className={cn("text-[11px] leading-relaxed", event.active ? "text-rr-text" : "text-rr-muted")}>
            {event.description}
          </p>

          {event.active && event.codeBlock && (
            <div className="mt-1.5 rounded border border-rr-border bg-rr-bg p-2 font-mono text-[9px] leading-relaxed overflow-x-auto text-rr-green">
              {event.codeBlock}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaybackMarker({
  event,
  pct,
}: {
  event: TimelineEvent;
  pct: number;
}) {
  const color =
    event.type === "deploy"
      ? "bg-blue-400"
      : event.type === "anomaly"
      ? "bg-rr-green"
      : event.type === "critical"
      ? "bg-rr-error"
      : "bg-rr-muted";

  return (
    <div
      className="absolute top-0 -translate-x-1/2 flex flex-col items-center gap-0.5"
      style={{ left: `${pct}%` }}
    >
      <span className={cn("w-2 h-2 rounded-full", color)} />
      <span
        className={cn("w-[1px] h-2.5", color === "bg-rr-muted" ? "bg-rr-muted" : color)}
      />
    </div>
  );
}

function TopologyEdgesSVG({
  containerRef,
  nodeRefs,
  edges,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodeRefs: React.RefObject<Map<string, HTMLDivElement | null>>;
  edges: TopologyEdge[];
}) {
  const [lines, setLines] = useState<
    { x1: number; y1: number; x2: number; y2: number; critical: boolean; key: string }[]
  >([]);

  const compute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const newLines: typeof lines = [];

    for (const edge of edges) {
      const fromEl = nodeRefs.current?.get(edge.from);
      const toEl = nodeRefs.current?.get(edge.to);
      if (!fromEl || !toEl) continue;
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      newLines.push({
         key: `${edge.from}-${edge.to}`,
         x1: fromRect.left - containerRect.left + fromRect.width / 2,
         y1: fromRect.top - containerRect.top + fromRect.height / 2,
         x2: toRect.left - containerRect.left + toRect.width / 2,
         y2: toRect.top - containerRect.top + toRect.height / 2,
         critical: !!edge.critical,
      });
    }
    setLines(newLines);
  }, [containerRef, nodeRefs, edges]);

  useEffect(() => {
    const id = setTimeout(compute, 100);
    window.addEventListener("resize", compute);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", compute);
    };
  }, [compute]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <defs>
        <style>{`
          .topology-line {
            stroke: rgba(103,247,177,0.18);
            stroke-width: 1.2;
            stroke-dasharray: 5 4;
            fill: none;
            animation: dash-flow 2.5s linear infinite;
          }
          .topology-line-critical {
            stroke: rgba(239,68,68,0.55);
            stroke-width: 1.8;
            stroke-dasharray: 6 3;
            fill: none;
            animation: dash-flow 1.2s linear infinite;
          }
          @keyframes dash-flow {
            to { stroke-dashoffset: -30; }
          }
        `}</style>
      </defs>
      {lines.map((l) => (
        <line
          key={l.key}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          className={l.critical ? "topology-line-critical" : "topology-line"}
        />
      ))}
    </svg>
  );
}

export default function ReplayPage() {
  const incidents = useStore((s) => s.incidents);
  const setActiveReplay = useStore((s) => s.setActiveReplay);

  // Playback parameters
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>(1);
  const [playheadPct, setPlayheadPct] = useState(45);
  const [narrationOn, setNarrationOn] = useState(true);

  // Replay target selection
  const resolvedIncidents = incidents.filter(i => i.status === "resolved");
  const defaultSelected = resolvedIncidents[0] || incidents[0];
  const [selectedIncident, setSelectedIncident] = useState<any>(null);

  // Set initial incident selection when loaded
  useEffect(() => {
    if (defaultSelected && !selectedIncident) {
      setSelectedIncident(defaultSelected);
    }
  }, [defaultSelected, selectedIncident]);

  const activeIncident = selectedIncident || defaultSelected;

  // Active scenario check
  const getScenario = useCallback(() => {
    if (!activeIncident) return "redis_saturation";
    const svc = (activeIncident.service || "").toLowerCase();
    const title = (activeIncident.title || "").toLowerCase();
    
    if (svc.includes("cache") || title.includes("redis") || svc.includes("checkout")) {
      return "redis_saturation";
    }
    if (svc.includes("worker") || svc.includes("queue") || title.includes("worker") || title.includes("pod")) {
      return "k8s_pod_failure";
    }
    if (svc.includes("db") || title.includes("postgres") || title.includes("pool") || svc.includes("profile")) {
      return "db_pool_exhaustion";
    }
    if (svc.includes("gateway") || title.includes("gateway") || title.includes("ingress")) {
      return "api_latency";
    }
    if (svc.includes("auth") || title.includes("auth") || title.includes("identity")) {
      return "auth_instability";
    }
    return "redis_saturation";
  }, [activeIncident]);

  const scenario = getScenario();

  // Dynamically build timeline events based on selected incident metadata
  const buildTimelineEvents = useCallback((): TimelineEvent[] => {
    if (!activeIncident) return [];
    
    const startedStr = activeIncident.startedAt 
      ? new Date(activeIncident.startedAt).toLocaleTimeString() 
      : "12:00:00 UTC";
      
    const svcName = activeIncident.service || "checkout-api";
    const rootCause = activeIncident.rootCause || "Resource pool starvation.";
    const remediationCmd = activeIncident.remediationSteps?.[0]?.command || "kubectl rollout undo deploy/" + svcName;

    return [
      {
        id: "evt-normal",
        label: "System Normal",
        time: "Baseline UTC",
        type: "normal",
        positionPct: 0,
        description: "All core service clusters reporting healthy micro-telemetry metrics. P99 latency within 25ms threshold."
      },
      {
        id: "evt-deploy",
        label: "Rollout Initiated",
        time: startedStr,
        type: "deploy",
        positionPct: 22,
        description: `CI/CD triggered deployment rollout to ${svcName}. Tracking container lifecycle events...`
      },
      {
        id: "evt-anomaly",
        label: "Anomaly Flagged",
        time: startedStr,
        type: "anomaly",
        positionPct: 45,
        description: `ERROR: Degradation detected on ${svcName}. Latency spiked. Triggering automated cross-service correlation tracing.`,
        codeBlock: `-- WARN unpaginated query detected\nSELECT * FROM sessions WHERE active = true;\n-- DB pools saturated: max connections reached.`
      },
      {
        id: "evt-critical",
        label: "AI Correlation RCA",
        time: startedStr,
        type: "critical",
        positionPct: 70,
        description: `RCA Generated: ${rootCause} Execute recommended remediation playbooks:`,
        codeBlock: `$ ${remediationCmd}`
      }
    ];
  }, [activeIncident]);

  const dynamicTimelineEvents = buildTimelineEvents();

  const currentEventIdx = dynamicTimelineEvents.reduce((acc, ev, idx) => {
    return playheadPct >= ev.positionPct ? idx : acc;
  }, 0);

  const dynamicEventsWithActive = dynamicTimelineEvents.map((ev, idx) => ({
    ...ev,
    active: idx === currentEventIdx,
  }));

  // Dynamic AI Narrations based on scenario & playhead position
  const getNarrationText = useCallback(() => {
    if (!activeIncident) return "";
    const svc = activeIncident.service || "checkout-api";
    const cause = activeIncident.rootCause || "resource exhaustion";
    const currentEvent = dynamicEventsWithActive[currentEventIdx];
    if (!currentEvent) return "";

    const narrations: Record<string, Record<string, string>> = {
      redis_saturation: {
        "evt-normal": "System baseline normal. Request rates running at 4,200/sec, Redis CPU load minimal at 15%.",
        "evt-deploy": `Deployment pipeline initiated update. Redis cache cluster begins experiencing unpaginated query loads.`,
        "evt-anomaly": `CRITICAL: Redis memory pressure detected. Checkout latencies spiked to 5200ms with OOM errors bubbling up.`,
        "evt-critical": `AI Copilot isolated Root Cause: ${cause}. Playbook commands loaded to throttle connection pool.`
      },
      k8s_pod_failure: {
        "evt-normal": "Cluster node schedulers balanced. System response times and queues operating at baseline normal.",
        "evt-deploy": `Kubernetes master node worker-pool-3 scheduled container pod eviction under memory constraints.`,
        "evt-anomaly": `WARNING: Worker node evicted. Message queue congestion spiked delay to 15,000ms. Job queue backing up.`,
        "evt-critical": `AI Copilot SRE isolated Root Cause: ${cause}. Playbooks triggered replica scaling to redistribute load.`
      },
      db_pool_exhaustion: {
        "evt-normal": "PostgreSQL database primary reporting 35% connection headroom. API Gateway ingress flowing healthy.",
        "evt-deploy": `Microservices profile-api database connection pool begins experiencing query pool saturation.`,
        "evt-anomaly": `CRITICAL: DB connection pool exhausted. Starving user-profile and auth-service, returning gateway timeouts.`,
        "evt-critical": `AI Copilot isolated Root Cause: ${cause}. Recommended PostgreSQL connection pool raise.`
      },
      api_latency: {
        "evt-normal": "API Gateway ingress health at 100%. Latency stable at 15ms.",
        "evt-deploy": "Deployment rollover gate initiated on api-gateway. Scaling configurations active.",
        "evt-anomaly": "API Gateway ingress queue congestion detected. CPU load saturated, generating packet drops.",
        "evt-critical": `AI Copilot isolated Root Cause: ${cause}. Scale replicas command loaded to balance the balancer.`
      },
      auth_instability: {
        "evt-normal": "Session tokens, JWT authentications, and OAuth exchanges verifying successfully.",
        "evt-deploy": "Security patches deployed to auth-service nodes. Synchronizing credentials configuration.",
        "evt-anomaly": "Upstream identity provider handshake times out. Authentication requests failing with 502 Bad Gateway.",
        "evt-critical": `AI Copilot isolated Root Cause: ${cause}. Fallback offline auth playbooks compiled for execution.`
      }
    };

    return narrations[scenario]?.[currentEvent.id] || currentEvent.description;
  }, [activeIncident, scenario, dynamicEventsWithActive, currentEventIdx]);

  const activeNarration = getNarrationText();

  // Dynamic Topology mapping based on playhead percentage and active scenario
  const getDynamicNodes = useCallback((): TopologyNode[] => {
    const nodes: TopologyNode[] = [
      { id: "api-gateway", label: "API Gateway", status: "healthy", latency: "15 ms", gridCol: 2, gridRow: 1 },
      { id: "auth-service", label: "Auth Service", status: "healthy", latency: "45 ms", gridCol: 1, gridRow: 2 },
      { id: "checkout-api", label: "Checkout API", status: "healthy", latency: "40 ms", gridCol: 2, gridRow: 2 },
      { id: "user-profile", label: "User Profile", status: "healthy", latency: "30 ms", gridCol: 3, gridRow: 2 },
      { id: "cache-cluster", label: "Redis Cache", status: "healthy", latency: "2 ms", gridCol: 1, gridRow: 3 },
      { id: "db-primary", label: "PostgreSQL Primary", status: "healthy", latency: "25 ms", gridCol: 2, gridRow: 3 },
      { id: "worker-pool", label: "Worker Pool", status: "healthy", latency: "100 ms", gridCol: 3, gridRow: 3 },
      { id: "job-queue", label: "Job Queue", status: "healthy", latency: "5 ms", gridCol: 3, gridRow: 4 },
    ];

    return nodes.map((node) => {
      let status: "healthy" | "degraded" | "critical" = "healthy";
      let latency = node.latency;
      let isActive = false;
      let extraLabel = undefined;

      const stepNormal = playheadPct < 22;
      const stepDeploy = playheadPct >= 22 && playheadPct < 45;
      const stepAnomaly = playheadPct >= 45 && playheadPct < 70;
      const stepCritical = playheadPct >= 70;

      // Degrade topology nodes depending on current playhead stage & scenario
      if (scenario === "redis_saturation") {
        if (node.id === "cache-cluster") {
          if (stepCritical) {
            status = "critical";
            latency = "OOM";
            isActive = true;
            extraLabel = "OOM";
          } else if (stepAnomaly) {
            status = "degraded";
            latency = "450 ms";
          }
        } else if (node.id === "checkout-api") {
          if (stepAnomaly || stepCritical) {
            status = "critical";
            latency = "5200 ms";
            isActive = stepAnomaly;
          }
        } else if (node.id === "auth-service" && (stepAnomaly || stepCritical)) {
          status = "degraded";
          latency = "420 ms";
        } else if (node.id === "api-gateway" && (stepAnomaly || stepCritical)) {
          status = "degraded";
          latency = "180 ms";
        }
      } else if (scenario === "k8s_pod_failure") {
        if (node.id === "worker-pool") {
          if (stepCritical) {
            status = "critical";
            latency = "850 ms";
            isActive = true;
            extraLabel = "EVICTED";
          } else if (stepAnomaly) {
            status = "degraded";
            latency = "340 ms";
          }
        } else if (node.id === "job-queue" && (stepAnomaly || stepCritical)) {
          status = "critical";
          latency = "15000 ms";
          extraLabel = "BACKLOG";
        } else if (node.id === "checkout-api" && (stepAnomaly || stepCritical)) {
          status = "degraded";
          latency = "450 ms";
        }
      } else if (scenario === "db_pool_exhaustion") {
        if (node.id === "db-primary") {
          if (stepCritical) {
            status = "critical";
            latency = "2500 ms";
            isActive = true;
            extraLabel = "SATURATED";
          } else if (stepAnomaly) {
            status = "degraded";
            latency = "500 ms";
          }
        } else if (node.id === "auth-service" && (stepAnomaly || stepCritical)) {
          status = "critical";
          latency = "4500 ms";
        } else if (node.id === "user-profile" && (stepAnomaly || stepCritical)) {
          status = "critical";
          latency = "3500 ms";
        } else if (node.id === "api-gateway" && (stepAnomaly || stepCritical)) {
          status = "degraded";
          latency = "800 ms";
        }
      } else if (scenario === "api_latency") {
        if (node.id === "api-gateway") {
          if (stepAnomaly || stepCritical) {
            status = "critical";
            latency = "2400 ms";
            isActive = true;
            extraLabel = "CONGESTED";
          }
        }
      } else if (scenario === "auth_instability") {
        if (node.id === "auth-service") {
          if (stepAnomaly || stepCritical) {
            status = "critical";
            latency = "5000 ms";
            isActive = true;
            extraLabel = "TIMEOUT";
          }
        } else if (node.id === "api-gateway" && (stepAnomaly || stepCritical)) {
          status = "degraded";
          latency = "620 ms";
        }
      }

      // Track deployment indicator
      if (stepDeploy && node.id === (activeIncident?.service || "checkout-api")) {
        status = "degraded";
        latency = "Deploying...";
        extraLabel = "ROLLOUT";
        isActive = true;
      }

      return {
        ...node,
        status,
        latency,
        isActive,
        extraLabel,
      };
    });
  }, [playheadPct, scenario, activeIncident]);

  const dynamicTopologyNodes = getDynamicNodes();

  // Dynamic Recharts telemetry data mapping playhead progress
  const replayChartData = Array.from({ length: 30 }, (_, i) => {
    const pct = (i / 29) * 100;
    let latency = 40;
    let errors = 0.1;
    
    const hasSpiked = pct >= 45;
    const hasStabilized = pct >= 85;
    
    if (scenario === "redis_saturation") {
      if (hasSpiked) {
        latency = 5200 + Math.sin(i) * 150;
        errors = 98.0 + Math.cos(i) * 1;
      } else if (pct >= 22) {
        latency = 120 + Math.sin(i) * 10;
        errors = 0.5 + Math.cos(i) * 0.1;
      } else {
        latency = 40 + Math.sin(i) * 5;
        errors = 0.1 + Math.cos(i) * 0.05;
      }
    } else if (scenario === "k8s_pod_failure") {
      if (hasSpiked) {
        latency = 850 + Math.sin(i) * 50;
        errors = 25.0 + Math.cos(i) * 2;
      } else {
        latency = 100 + Math.sin(i) * 10;
        errors = 0.2 + Math.cos(i) * 0.05;
      }
    } else if (scenario === "db_pool_exhaustion") {
      if (hasSpiked) {
        latency = 4500 + Math.sin(i) * 200;
        errors = 50.0 + Math.cos(i) * 3;
      } else {
        latency = 30 + Math.sin(i) * 5;
        errors = 0.1 + Math.cos(i) * 0.02;
      }
    } else {
      // General fallbacks
      if (hasSpiked) {
        latency = 2400 + Math.sin(i) * 100;
        errors = 10.0 + Math.cos(i) * 1;
      } else {
        latency = 40 + Math.sin(i) * 4;
        errors = 0.1 + Math.cos(i) * 0.02;
      }
    }
    
    const isPlayed = pct <= playheadPct;
    
    return {
      time: `${Math.floor((pct / 100) * 10)}m`,
      latency: isPlayed ? Math.round(latency) : null,
      errors: isPlayed ? parseFloat(errors.toFixed(1)) : null,
    };
  });

  const BASE_SECONDS = 0;
  const WINDOW_SECONDS = 600;
  const currentSeconds = Math.round(BASE_SECONDS + (playheadPct / 100) * WINDOW_SECONDS);
  const displayHour = 12;
  const displayMin = Math.floor(currentSeconds / 60);
  const displaySec = currentSeconds % 60;
  const currentTimeStr = `${String(displayHour).padStart(2, "0")}:${String(displayMin).padStart(2, "0")}:${String(displaySec).padStart(2, "0")} UTC`;

  const topologyContainerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Playhead animation
  const animFrameRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const animate = useCallback(
    (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const delta = ts - lastTsRef.current;
      lastTsRef.current = ts;
      const advance = (delta / 1000) * speed * (100 / WINDOW_SECONDS) * 10;
      setPlayheadPct((prev) => {
        const next = prev + advance;
        if (next >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return next;
      });
      animFrameRef.current = requestAnimationFrame(animate);
    },
    [speed]
  );

  useEffect(() => {
    if (isPlaying) {
      lastTsRef.current = null;
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, animate]);

  useEffect(() => {
    if (activeIncident) {
      setActiveReplay(activeIncident.id);
    }
    return () => setActiveReplay(null);
  }, [setActiveReplay, activeIncident]);

  const handlePlayPause = () => {
    if (playheadPct >= 100) setPlayheadPct(0);
    setIsPlaying((p) => !p);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setPlayheadPct(pct);
  };

  const skipBack = () => setPlayheadPct((p) => Math.max(0, p - 10));
  const skipForward = () => setPlayheadPct((p) => Math.min(100, p + 10));
  const jumpToStart = () => { setPlayheadPct(0); setIsPlaying(false); };
  const jumpToEnd = () => { setPlayheadPct(100); setIsPlaying(false); };

  const getCriticalEdges = useCallback(() => {
    if (scenario === "redis_saturation") {
      return TOPOLOGY_EDGES.map(e => ({
        ...e,
        critical: (e.from === "checkout-api" && e.to === "cache-cluster") || (e.from === "api-gateway" && e.to === "checkout-api")
      }));
    }
    if (scenario === "k8s_pod_failure") {
      return TOPOLOGY_EDGES.map(e => ({
        ...e,
        critical: (e.from === "checkout-api" && e.to === "worker-pool") || (e.from === "worker-pool" && e.to === "job-queue")
      }));
    }
    if (scenario === "db_pool_exhaustion") {
      return TOPOLOGY_EDGES.map(e => ({
        ...e,
        critical: (e.from === "auth-service" && e.to === "db-primary") || (e.from === "user-profile" && e.to === "db-primary")
      }));
    }
    return TOPOLOGY_EDGES;
  }, [scenario]);

  const dynamicEdges = getCriticalEdges();

  return (
    <div
      className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden relative"
      style={{
        backgroundImage:
          "radial-gradient(rgba(103,247,177,0.03) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-rr-border bg-rr-bg/85 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-rr-green/10 border border-rr-green/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rr-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rr-green" />
            </span>
            <span className="text-[9px] font-bold tracking-widest text-rr-green uppercase font-mono">
              Replay Stream Sync
            </span>
          </div>
        </div>

        {/* Dynamic selector */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-rr-muted uppercase tracking-wider font-mono">
            Incident
          </label>
          <select
            value={activeIncident?.id || ""}
            onChange={(e) => {
              const found = incidents.find((i) => i.id === e.target.value);
              if (found) setSelectedIncident(found);
            }}
            className="bg-rr-surface border border-rr-border text-rr-text font-mono text-[11px] px-2 py-1 rounded focus:outline-none focus:border-rr-green cursor-pointer"
          >
            {incidents.length > 0 ? (
              incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id}: {inc.title}
                </option>
              ))
            ) : (
              <option value="INC-8241">INC-8241: Redis Saturation Anomaly</option>
            )}
          </select>
        </div>

        {/* Speed controls */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-rr-muted uppercase tracking-wider mr-1.5 font-mono">
            Speed
          </span>
          {([0.5, 1, 2] as PlaySpeed[]).map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all cursor-pointer",
                speed === s
                  ? "bg-rr-green text-rr-bg border-rr-green"
                  : "bg-transparent text-rr-muted border-rr-border hover:border-rr-green hover:text-rr-green"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </header>

      {/* ── Main Body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Center Canvas */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-between p-6">
          <div className="text-[10px] text-rr-muted uppercase tracking-widest self-start font-mono select-none">
            Service Topology Map · High-Fidelity Playback
          </div>

          {/* Topology map container */}
          <div className="flex-1 flex items-center justify-center w-full relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
              <Logo size="xl" className="opacity-[0.02] scale-[2.2] filter drop-shadow-none pointer-events-none select-none" />
            </div>

            <div
              ref={topologyContainerRef}
              className="relative z-10 scale-95"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 160px)",
                gridTemplateRows: "repeat(4, 80px)",
                gap: "14px 32px",
                alignItems: "center",
                justifyItems: "center",
              }}
            >
              <TopologyEdgesSVG
                containerRef={topologyContainerRef}
                nodeRefs={nodeRefs}
                edges={dynamicEdges}
              />

              {dynamicTopologyNodes.map((node) => (
                <div
                  key={node.id}
                  ref={(el) => {
                    nodeRefs.current.set(node.id, el);
                  }}
                  style={{
                    gridColumn: node.gridCol,
                    gridRow: node.gridRow,
                  }}
                >
                  <TopologyNodeCard node={node} />
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry charts */}
          <div className="w-full h-32 bg-rr-surface/30 border border-rr-border/60 rounded-lg p-3 mt-4 flex flex-col gap-1">
            <span className="font-mono text-[9px] text-rr-muted uppercase tracking-widest select-none">Telemetry metrics trace</span>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={replayChartData} margin={{ top: 2, right: 10, left: -25, bottom: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#16181D" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#6c7870', fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#6c7870', fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#07080b', border: '1px solid #1a1c22', borderRadius: '6px' }}
                    labelStyle={{ color: '#869489', fontFamily: 'JetBrains Mono, monospace', fontSize: 9 }}
                    itemStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="#4DA3FF"
                    fill="rgba(77,163,255,0.06)"
                    strokeWidth={1.2}
                    name="Latency (ms)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    stroke="#ef4444"
                    fill="rgba(239,68,68,0.06)"
                    strokeWidth={1.2}
                    name="Errors (%)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <aside className="w-80 flex-shrink-0 border-l border-rr-border bg-rr-surface flex flex-col overflow-hidden">
          <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-rr-border">
            <span className="text-[11px] font-mono font-bold text-rr-text tracking-tight uppercase">
              AI Commentary
            </span>
            <WaveformBars />
          </div>

          <div className="p-4 border-b border-rr-border bg-rr-surface/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="material-symbols-outlined text-rr-green text-sm animate-pulse">psychology</span>
              <span className="font-mono text-[9px] text-rr-green uppercase tracking-widest font-bold">Autopilot Voice</span>
            </div>
            <p className="font-mono text-[11px] text-rr-text leading-relaxed min-h-[48px] italic">
              " {activeNarration} "
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {dynamicEventsWithActive.map((event) => (
              <TimelineEventRow key={event.id} event={event} />
            ))}
          </div>

          <div className="p-3 border-t border-rr-border text-[9px] text-rr-muted font-mono select-none">
            <span className="text-rr-green">●</span> Commentary synchronized with playback metrics.
          </div>
        </aside>
      </div>

      {/* Bottom Playback Bar */}
      <div className="h-20 flex-shrink-0 border-t border-rr-border bg-rr-bg z-20 flex flex-col justify-center px-6 gap-1.5">
        <div className="relative group">
          <div
            className="h-1.5 bg-rr-surface border border-rr-border/40 rounded-full cursor-pointer relative overflow-visible"
            onClick={handleSeek}
          >
            <div
              className="absolute left-0 top-0 h-full bg-rr-green/20 rounded-full"
              style={{ width: `${playheadPct}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-rr-green border border-rr-bg shadow-[0_0_8px_rgba(103,247,177,0.7)] z-10 cursor-grab active:cursor-grabbing"
              style={{ left: `${playheadPct}%` }}
            />

            {dynamicTimelineEvents.filter((e) => e.positionPct > 0).map((event) => (
              <PlaybackMarker
                key={event.id}
                event={event}
                pct={event.positionPct}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={skipBack}
              className="flex items-center gap-0.5 text-rr-muted hover:text-rr-green transition-colors p-1.5 rounded cursor-pointer"
              title="Back 10%"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                <text x="7" y="15" fontSize="6" fontFamily="monospace">10</text>
              </svg>
            </button>

            <button
              onClick={jumpToStart}
              className="text-rr-muted hover:text-rr-green transition-colors p-1.5 rounded cursor-pointer"
              title="Jump to start"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={handlePlayPause}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer",
                "bg-rr-green text-rr-bg hover:scale-105 active:scale-95",
                "shadow-[0_0_12px_rgba(103,247,177,0.3)]"
              )}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current ml-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={jumpToEnd}
              className="text-rr-muted hover:text-rr-green transition-colors p-1.5 rounded cursor-pointer"
              title="Jump to end"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.93V8.07L8.5 12zm7.5 6h2V6h-2v12z" />
              </svg>
            </button>

            <button
              onClick={skipForward}
              className="flex items-center gap-0.5 text-rr-muted hover:text-rr-green transition-colors p-1.5 rounded cursor-pointer"
              title="Forward 10%"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z" />
              </svg>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 text-[9px] text-rr-muted font-mono">
            {dynamicTimelineEvents.filter((e) => e.type !== "normal").map((e) => (
              <div key={e.id} className="flex items-center gap-1">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    e.type === "deploy"
                      ? "bg-blue-400"
                      : e.type === "anomaly"
                      ? "bg-rr-green"
                      : "bg-rr-error"
                  )}
                />
                <span>{e.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setNarrationOn((n) => !n)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded border text-[10px] font-mono transition-all cursor-pointer",
                narrationOn
                  ? "bg-rr-green/10 border-rr-green/30 text-rr-green"
                  : "bg-transparent border-rr-border text-rr-muted"
              )}
            >
              Narration {narrationOn ? "ON" : "OFF"}
            </button>

            <div className="font-mono text-[11px] text-rr-green tabular-nums">
              {currentTimeStr}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
