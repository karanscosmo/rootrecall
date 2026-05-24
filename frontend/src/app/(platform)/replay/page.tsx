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

// ─── Types ────────────────────────────────────────────────────────────────────

type PlaySpeed = 0.5 | 1 | 2;

interface TimelineEvent {
  id: string;
  label: string;
  time: string;
  type: "normal" | "deploy" | "anomaly" | "critical";
  positionPct: number; // 0-100 position on timeline bar
  active?: boolean;
}

interface TopologyNode {
  id: string;
  label: string;
  status: "healthy" | "degraded" | "critical";
  latency: string;
  gridCol: number; // 1-based CSS grid column
  gridRow: number; // 1-based CSS grid row
  extraLabel?: string;
  isActive?: boolean;
}

interface TopologyEdge {
  from: string;
  to: string;
  critical?: boolean;
}

// ─── Static scenario data ─────────────────────────────────────────────────────

// We now use incidents from the store

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "evt-normal",
    label: "System Normal",
    time: "12:00:00",
    type: "normal",
    positionPct: 0,
  },
  {
    id: "evt-deploy",
    label: "Deploy Event",
    time: "12:01:14",
    type: "deploy",
    positionPct: 22,
  },
  {
    id: "evt-spike",
    label: "Memory Spike Detected",
    time: "12:03:42",
    type: "anomaly",
    positionPct: 45,
    active: true,
  },
  {
    id: "evt-redis",
    label: "Redis Saturation",
    time: "12:04:10",
    type: "critical",
    positionPct: 60,
  },
];

const TOPOLOGY_NODES: TopologyNode[] = [
  {
    id: "api-gw",
    label: "API Gateway",
    status: "healthy",
    latency: "18 ms",
    gridCol: 2,
    gridRow: 1,
  },
  {
    id: "auth",
    label: "Auth Service",
    status: "degraded",
    latency: "420 ms",
    gridCol: 1,
    gridRow: 2,
  },
  {
    id: "checkout",
    label: "Checkout API",
    status: "critical",
    latency: "5200 ms",
    gridCol: 2,
    gridRow: 2,
    isActive: true,
  },
  {
    id: "worker",
    label: "Worker Pool",
    status: "healthy",
    latency: "120 ms",
    gridCol: 3,
    gridRow: 2,
  },
  {
    id: "cache",
    label: "Redis Cache",
    status: "critical",
    latency: "OOM",
    gridCol: 1,
    gridRow: 3,
    extraLabel: "OOM",
  },
];

const TOPOLOGY_EDGES: TopologyEdge[] = [
  { from: "api-gw", to: "auth" },
  { from: "api-gw", to: "checkout" },
  { from: "api-gw", to: "worker" },
  { from: "checkout", to: "cache", critical: true },
  { from: "auth", to: "cache" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      ? "border-rr-green"
      : node.status === "degraded"
      ? "border-rr-warn"
      : "border-rr-error";

  const bgGlow =
    node.status === "critical"
      ? "shadow-[0_0_24px_rgba(239,68,68,0.35)]"
      : node.status === "degraded"
      ? "shadow-[0_0_12px_rgba(250,204,21,0.2)]"
      : "";

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 px-3 py-2 rounded-lg border bg-rr-surface text-xs",
        "transition-transform duration-300 select-none",
        borderColor,
        bgGlow,
        node.isActive && "scale-110 z-10"
      )}
      style={{ minWidth: 130 }}
    >
      {/* Status ping for active node */}
      {node.isActive && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rr-error opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rr-error" />
        </span>
      )}

      <div className="flex items-center gap-1.5">
        <StatusDot status={node.status} />
        <span className="font-semibold text-rr-text tracking-tight">{node.label}</span>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-mono text-[10px]",
            node.status === "healthy" && "text-rr-green",
            node.status === "degraded" && "text-rr-warn",
            node.status === "critical" && "text-rr-error"
          )}
        >
          {node.latency}
        </span>
        <span
          className={cn(
            "uppercase text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded",
            node.status === "healthy" && "bg-rr-green/10 text-rr-green",
            node.status === "degraded" && "bg-rr-warn/10 text-rr-warn",
            node.status === "critical" && "bg-rr-error/10 text-rr-error"
          )}
        >
          {node.status}
        </span>
      </div>

      {node.extraLabel && (
        <span className="text-[9px] font-mono text-rr-error font-bold">● {node.extraLabel}</span>
      )}
    </div>
  );
}

function WaveformBars() {
  return (
    <div className="flex items-end gap-[2px] h-4" aria-hidden>
      {[0.4, 0.7, 1, 0.6, 0.85].map((h, i) => (
        <div
          key={i}
          className="w-[3px] bg-rr-green rounded-sm origin-bottom"
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
        "rounded-lg px-3 py-2.5 border transition-all duration-300",
        event.active
          ? "border-l-2 border-l-rr-green border-rr-border bg-rr-green/5"
          : event.type === "critical"
          ? "border-rr-error/30 bg-transparent"
          : "border-transparent bg-transparent opacity-40"
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* dot */}
        <div className="mt-0.5 flex-shrink-0 flex flex-col items-center gap-1">
          <span className={cn("w-2 h-2 rounded-full", dotColor)} />
          {event.active && (
            <span className="w-[1px] h-full bg-rr-green/30 flex-1 min-h-[20px]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className={cn(
                "text-xs font-semibold tracking-tight",
                event.active ? "text-rr-text" : "text-rr-muted",
                event.type === "critical" && "text-rr-error"
              )}
            >
              {event.label}
            </span>
            <span className="text-[10px] font-mono text-rr-muted flex-shrink-0">
              {event.time}
            </span>
          </div>

          {/* Active event body */}
          {event.active && (
            <div className="mt-1.5 space-y-1.5">
              <p className="text-[11px] text-rr-muted leading-relaxed">
                auth-service v2.4.1 introduced an unpaginated SQL query causing Redis
                connection pool exhaustion.
              </p>
              <div className="rounded border border-rr-border bg-rr-bg p-2 font-mono text-[10px] leading-relaxed overflow-x-auto">
                <span className="text-rr-muted">{"-- "}</span>
                <span className="text-rr-warn">WARN unpaginated query detected</span>
                {"\n"}
                <span className="text-rr-error">
                  SELECT * FROM sessions WHERE user_id = ?
                </span>
                {"\n"}
                <span className="text-rr-muted">-- rows scanned: 1,200,847</span>
                {"\n"}
                <span className="text-rr-error">
                  ERR OOM command not allowed when used memory &gt; maxmemory
                </span>
              </div>
            </div>
          )}

          {/* Critical event body */}
          {event.type === "critical" && !event.active && (
            <p className="text-[11px] text-rr-error/70 leading-relaxed mt-0.5">
              Redis maxmemory reached — connection pool exhausted
            </p>
          )}

          {event.type === "deploy" && !event.active && (
            <p className="text-[11px] text-blue-400/70 leading-relaxed mt-0.5">
              auth-service v2.4.1 rolled out — 3/3 pods healthy
            </p>
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
        className={cn("w-[1px] h-3", color === "bg-rr-muted" ? "bg-rr-muted" : color)}
      />
      <span className="text-[9px] font-mono text-rr-muted whitespace-nowrap hidden group-hover:block">
        {event.time}
      </span>
    </div>
  );
}

// ─── Topology SVG overlay (edges) ─────────────────────────────────────────────

/**
 * Renders SVG lines between grid cells.
 * We approximate node centers via CSS grid positions
 * and draw lines in SVG overlay sized to the container.
 */
function TopologyEdgesSVG({
  containerRef,
  nodeRefs,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodeRefs: React.RefObject<Map<string, HTMLDivElement | null>>;
}) {
  const [lines, setLines] = useState<
    { x1: number; y1: number; x2: number; y2: number; critical: boolean; key: string }[]
  >([]);

  const compute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const newLines: typeof lines = [];

    for (const edge of TOPOLOGY_EDGES) {
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
  }, [containerRef, nodeRefs]);

  useEffect(() => {
    // Wait for layout, then compute
    const id = setTimeout(compute, 50);
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
            stroke: rgba(103,247,177,0.25);
            stroke-width: 1.5;
            stroke-dasharray: 6 4;
            fill: none;
            animation: dash-flow 2s linear infinite;
          }
          .topology-line-critical {
            stroke: rgba(239,68,68,0.7);
            stroke-width: 2;
            stroke-dasharray: 8 4;
            fill: none;
            animation: dash-flow 1s linear infinite;
          }
          @keyframes dash-flow {
            to { stroke-dashoffset: -40; }
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReplayPage() {
  // store
  const incidents = useStore((s) => s.incidents);
  const setActiveReplay = useStore((s) => s.setActiveReplay);
  const activeIncident = incidents.find((i) => i.id === "INC-8241");

  // playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>(1);
  const [playheadPct, setPlayheadPct] = useState(45);
  const [narrationOn, setNarrationOn] = useState(true);
  const resolvedIncidents = incidents.filter(i => i.status === "resolved");
  const FALLBACK_INCIDENT = { id: "INC-8241", title: "Redis Saturation Anomaly" };
  const [selectedIncident, setSelectedIncident] = useState<any>(resolvedIncidents[0] || incidents[0] || FALLBACK_INCIDENT);

  // Synchronized narrative and active states mapping
  const currentEventIdx = TIMELINE_EVENTS.reduce((acc, ev, idx) => {
    return playheadPct >= ev.positionPct ? idx : acc;
  }, 0);

  const dynamicTimelineEvents = TIMELINE_EVENTS.map((ev, idx) => ({
    ...ev,
    active: idx === currentEventIdx,
  }));

  const NARRATIONS: Record<string, string> = {
    "evt-normal": "System is currently running at baseline latency of 18ms with 4,200 requests/sec. All service nodes report healthy telemetry.",
    "evt-deploy": "Deployment pipeline initiated rolling update of auth-service to v2.4.1. Monitoring auth-service pod replica status...",
    "evt-spike": "WARNING: Memory pressure detected on cache-cluster-02. Latency is spiking to 2,400ms on downstream checkout-api.",
    "evt-redis": "CRITICAL: Redis cache OOM (maxmemory limit hit) on cache-cluster-02. Connection pool is fully saturated. 100% checkout failure."
  };
  const activeNarration = NARRATIONS[dynamicTimelineEvents[currentEventIdx].id] || "";

  // Dynamic topology mapping based on playhead percentage
  const dynamicTopologyNodes = TOPOLOGY_NODES.map((node) => {
    let status: "healthy" | "degraded" | "critical" = "healthy";
    let latency = "";
    let isActive = false;
    let extraLabel = undefined;

    if (node.id === "api-gw") {
      status = playheadPct >= 45 ? "degraded" : "healthy";
      latency = playheadPct >= 45 ? "180 ms" : "18 ms";
    } else if (node.id === "auth") {
      if (playheadPct >= 60) {
        status = "degraded";
        latency = "420 ms";
      } else if (playheadPct >= 22) {
        status = "degraded";
        latency = "420 ms";
        isActive = playheadPct < 45;
        extraLabel = playheadPct < 45 ? "DEPLOYING" : undefined;
      } else {
        status = "healthy";
        latency = "45 ms";
      }
    } else if (node.id === "checkout") {
      if (playheadPct >= 45) {
        status = "critical";
        latency = "5200 ms";
        isActive = playheadPct < 60;
      } else {
        status = "healthy";
        latency = "40 ms";
      }
    } else if (node.id === "cache") {
      if (playheadPct >= 60) {
        status = "critical";
        latency = "OOM";
        isActive = true;
        extraLabel = "OOM";
      } else {
        status = "healthy";
        latency = "2 ms";
      }
    } else if (node.id === "worker") {
      status = "healthy";
      latency = "120 ms";
    }

    return {
      ...node,
      status,
      latency,
      isActive,
      extraLabel,
    };
  });

  // Recharts telemetry data mapping playheadPct progress
  const replayChartData = Array.from({ length: 30 }, (_, i) => {
    const pct = (i / 29) * 100;
    let latency = 40;
    let errors = 0.1;
    
    if (pct >= 60) {
      latency = 5200 + Math.sin(i) * 150;
      errors = 98.0 + Math.cos(i) * 1;
    } else if (pct >= 45) {
      latency = 2400 + Math.sin(i) * 100;
      errors = 45.0 + Math.cos(i) * 2;
    } else if (pct >= 22) {
      latency = 120 + Math.sin(i) * 10;
      errors = 0.5 + Math.cos(i) * 0.1;
    } else {
      latency = 40 + Math.sin(i) * 5;
      errors = 0.1 + Math.cos(i) * 0.05;
    }
    
    const isPlayed = pct <= playheadPct;
    
    return {
      time: `${Math.floor((pct / 100) * 10)}m`,
      latency: isPlayed ? Math.round(latency) : null,
      errors: isPlayed ? parseFloat(errors.toFixed(1)) : null,
    };
  });

  // current display time (seconds from 12:00:00 base)
  // 45% maps roughly to 12:03:42 (222 seconds into a 10-min window = 600s)
  const BASE_SECONDS = 0; // 12:00:00
  const WINDOW_SECONDS = 600; // 10-minute replay window
  const currentSeconds = Math.round(BASE_SECONDS + (playheadPct / 100) * WINDOW_SECONDS);
  const displayHour = 12;
  const displayMin = Math.floor(currentSeconds / 60);
  const displaySec = currentSeconds % 60;
  const currentTimeStr = `${String(displayHour).padStart(2, "0")}:${String(displayMin).padStart(2, "0")}:${String(displaySec).padStart(2, "0")} UTC`;

  // topology refs for SVG edge computation
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
      // advance by (delta ms / 1000) * speed => fraction of WINDOW_SECONDS
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

  // Set active replay in store
  useEffect(() => {
    setActiveReplay("INC-8241");
    return () => setActiveReplay(null);
  }, [setActiveReplay]);

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

  return (
    <div
      className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden relative"
      style={{
        backgroundImage:
          "radial-gradient(rgba(103,247,177,0.04) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-rr-border bg-rr-bg/80 backdrop-blur-sm z-20">
        {/* Left: badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-rr-green/10 border border-rr-green/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rr-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rr-green" />
            </span>
            <span className="text-[10px] font-bold tracking-widest text-rr-green uppercase">
              Story Mode Active
            </span>
          </div>
        </div>

        {/* Center: incident selector */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-rr-muted uppercase tracking-wider">
            Incident
          </label>
          <select
            value={selectedIncident?.id || ""}
            onChange={(e) => {
              const found = incidents.find((i) => i.id === e.target.value);
              if (found) setSelectedIncident(found);
            }}
            className="bg-rr-surface border border-rr-border text-rr-text text-xs px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-rr-green"
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

        {/* Right: speed controls */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-rr-muted uppercase tracking-wider mr-1.5">
            Speed
          </span>
          {([0.5, 1, 2] as PlaySpeed[]).map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold border transition-all",
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
        {/* ── Center Canvas ─────────────────────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-between p-6">
          {/* Canvas label */}
          <div className="text-[10px] text-rr-muted uppercase tracking-widest self-start">
            Service Dependency Map · Live Replay
          </div>

          {/* Topology map container */}
          <div className="flex-1 flex items-center justify-center w-full relative">
            {/* Watermark-style subtle branding */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
              <Logo size="xl" className="opacity-[0.03] scale-[2.2] filter drop-shadow-none pointer-events-none select-none" />
            </div>

            {/* Topology grid */}
            <div
              ref={topologyContainerRef}
              className="relative z-10"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 160px)",
                gridTemplateRows: "repeat(3, 100px)",
                gap: "12px 32px",
                alignItems: "center",
                justifyItems: "center",
              }}
            >
              {/* SVG edge layer (rendered on top of grid but under nodes) */}
              <TopologyEdgesSVG
                containerRef={topologyContainerRef}
                nodeRefs={nodeRefs}
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
          <div className="w-full h-36 bg-rr-surface/40 border border-rr-border rounded-lg p-3 mt-4 flex flex-col gap-1.5">
            <span className="font-mono text-[9px] text-rr-muted uppercase tracking-widest">Replay Telemetry Metrics</span>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={replayChartData} margin={{ top: 2, right: 10, left: -25, bottom: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2228" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#869489', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#869489', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0b0c10', border: '1px solid #1f2228', borderRadius: '4px' }}
                    labelStyle={{ color: '#869489', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}
                    itemStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="#4DA3FF"
                    fill="rgba(77,163,255,0.1)"
                    strokeWidth={1.5}
                    name="Latency (ms)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    stroke="#ef4444"
                    fill="rgba(239,68,68,0.1)"
                    strokeWidth={1.5}
                    name="Errors (%)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Right Panel ───────────────────────────────────────────────────── */}
        <aside className="w-96 flex-shrink-0 border-l border-rr-border bg-rr-surface flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-rr-border">
            <span className="text-xs font-semibold text-rr-text tracking-tight">
              AI Commentary
            </span>
            <WaveformBars />
          </div>

          {/* Active Narration Box */}
          <div className="p-4 border-b border-rr-border bg-rr-surface/40">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-rr-green text-sm animate-pulse">psychology</span>
              <span className="font-mono text-[10px] text-rr-green uppercase tracking-widest font-bold">Synchronized Commentary</span>
            </div>
            <p className="font-mono text-[11px] text-rr-text leading-relaxed min-h-[48px] italic">
              " {activeNarration} "
            </p>
          </div>

          {/* Timeline narrative events */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {dynamicTimelineEvents.map((event) => (
              <TimelineEventRow key={event.id} event={event} />
            ))}
          </div>

          {/* Footer hint */}
          <div className="p-3 border-t border-rr-border text-[10px] text-rr-muted">
            <span className="text-rr-green">●</span> AI narration generated from telemetry
            signals, log correlation and historical patterns.
          </div>
        </aside>
      </div>

      {/* ── Bottom Playback Bar ──────────────────────────────────────────────── */}
      <div className="h-24 flex-shrink-0 border-t border-rr-border bg-rr-bg z-20 flex flex-col justify-center px-6 gap-2">
        {/* Timeline track */}
        <div className="relative group">
          {/* Track */}
          <div
            className="h-2 bg-rr-surface rounded-full cursor-pointer relative overflow-visible"
            onClick={handleSeek}
          >
            {/* Progress fill */}
            <div
              className="absolute left-0 top-0 h-full bg-rr-green/30 rounded-full transition-none"
              style={{ width: `${playheadPct}%` }}
            />
            {/* Playhead */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-rr-green shadow-[0_0_8px_rgba(103,247,177,0.8)] z-10 cursor-grab active:cursor-grabbing"
              style={{ left: `${playheadPct}%` }}
            />

            {/* Event markers */}
            {TIMELINE_EVENTS.filter((e) => e.positionPct > 0).map((event) => (
              <PlaybackMarker
                key={event.id}
                event={event}
                pct={event.positionPct}
              />
            ))}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Transport controls */}
          <div className="flex items-center gap-2">
            {/* Replay 10s */}
            <button
              onClick={skipBack}
              className="flex items-center gap-0.5 text-rr-muted hover:text-rr-green transition-colors p-1.5 rounded"
              title="Back 10%"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                <text x="7" y="15" fontSize="6" fontFamily="monospace">10</text>
              </svg>
              <span className="text-[10px] font-mono">-10</span>
            </button>

            {/* Skip to start */}
            <button
              onClick={jumpToStart}
              className="text-rr-muted hover:text-rr-green transition-colors p-1.5 rounded"
              title="Jump to start"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>

            {/* Play / Pause */}
            <button
              onClick={handlePlayPause}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                "bg-rr-green text-rr-bg hover:scale-105 active:scale-95",
                "shadow-[0_0_16px_rgba(103,247,177,0.4)]"
              )}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current ml-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip to end */}
            <button
              onClick={jumpToEnd}
              className="text-rr-muted hover:text-rr-green transition-colors p-1.5 rounded"
              title="Jump to end"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.93V8.07L8.5 12zm7.5 6h2V6h-2v12z" />
              </svg>
            </button>

            {/* Skip forward 10 */}
            <button
              onClick={skipForward}
              className="flex items-center gap-0.5 text-rr-muted hover:text-rr-green transition-colors p-1.5 rounded"
              title="Forward 10%"
            >
              <span className="text-[10px] font-mono">+10</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z" />
              </svg>
            </button>
          </div>

          {/* Center: event markers legend */}
          <div className="hidden md:flex items-center gap-4 text-[10px] text-rr-muted">
            {TIMELINE_EVENTS.filter((e) => e.type !== "normal").map((e) => (
              <div key={e.id} className="flex items-center gap-1">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    e.type === "deploy"
                      ? "bg-blue-400"
                      : e.type === "anomaly"
                      ? "bg-rr-green"
                      : "bg-rr-error"
                  )}
                />
                <span>{e.time}</span>
              </div>
            ))}
          </div>

          {/* Right: narration + time */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNarrationOn((n) => !n)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[11px] font-medium transition-all",
                narrationOn
                  ? "bg-rr-green/10 border-rr-green/40 text-rr-green"
                  : "bg-transparent border-rr-border text-rr-muted"
              )}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.41 2.72 6.23 6 6.72V21h2v-2.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
              </svg>
              Narration {narrationOn ? "ON" : "OFF"}
            </button>

            <div className="font-mono text-xs text-rr-green tabular-nums">
              {currentTimeStr}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
