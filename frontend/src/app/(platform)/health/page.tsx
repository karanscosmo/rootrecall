"use client";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

export default function HealthPage() {
  const metrics = useStore((s) => s.metrics);
  const services = useStore((s) => s.services);
  const lastMetric = metrics[metrics.length - 1] ?? { cpuUsage: 45, memoryUsage: 62, errorRate: 0.3, latencyP99: 82, requestRate: 4200 };

  const healthScore = Math.max(0, 100 - (lastMetric.errorRate * 2) - (lastMetric.cpuUsage > 80 ? 20 : 0));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-rr-text tracking-tight">System Health</h1>
          <p className="font-mono text-[12px] text-rr-muted mt-1">Real-time infrastructure health across all services</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rr-green animate-pulse" />
          <span className="font-mono text-[11px] text-rr-muted">Live · Updated 3s ago</span>
        </div>
      </div>

      {/* Global health score */}
      <div className="bg-rr-surface border border-rr-border rounded-xl p-6 flex items-center gap-8">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1F2228" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={healthScore > 70 ? "#67F7B1" : healthScore > 40 ? "#ffd989" : "#ffb4ab"}
              strokeWidth="8"
              strokeDasharray={`${healthScore * 2.64} 264`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-lg font-bold text-rr-text">{Math.round(healthScore)}</span>
            <span className="font-mono text-[9px] text-rr-muted uppercase">Score</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-lg text-rr-text mb-1">
            {healthScore > 80 ? "Systems Operational" : healthScore > 50 ? "Degraded Performance" : "Critical Issues Detected"}
          </div>
          <div className="font-mono text-[12px] text-rr-muted mb-3">
            {services.filter((s: any) => s.status === "critical").length} critical · {services.filter((s: any) => s.status === "degraded").length} degraded · {services.filter((s: any) => s.status === "healthy").length} healthy
          </div>
          <div className="flex gap-6">
            {[
              { label: "Error Rate", value: `${lastMetric.errorRate.toFixed(1)}%`, danger: lastMetric.errorRate > 5 },
              { label: "P99 Latency", value: `${Math.round(lastMetric.latencyP99)}ms`, danger: lastMetric.latencyP99 > 500 },
              { label: "Request Rate", value: `${Math.round(lastMetric.requestRate).toLocaleString()}/s`, danger: false },
              { label: "CPU", value: `${Math.round(lastMetric.cpuUsage)}%`, danger: lastMetric.cpuUsage > 80 },
            ].map((m) => (
              <div key={m.label}>
                <div className="font-mono text-[10px] text-rr-muted uppercase tracking-widest">{m.label}</div>
                <div className={cn("font-mono text-[14px] font-bold", m.danger ? "text-rr-error" : "text-rr-text")}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service grid */}
      <div>
        <div className="font-mono text-[11px] text-rr-muted uppercase tracking-widest mb-3">Service Status</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc: any) => (
            <div
              key={svc.id}
              className={cn(
                "bg-rr-surface border rounded-lg p-4 transition-all hover:border-opacity-60",
                svc.status === "critical"  ? "border-rr-error/40 hover:border-rr-error/60" :
                svc.status === "degraded"  ? "border-rr-warn/40 hover:border-rr-warn/60" :
                "border-rr-border hover:border-rr-green/30"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "material-symbols-outlined text-[18px]",
                    svc.status === "critical" ? "text-rr-error" :
                    svc.status === "degraded" ? "text-rr-warn" : "text-rr-green"
                  )} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {svc.type === "gateway" ? "router" : svc.type === "database" ? "database" : svc.type === "cache" ? "memory" : svc.type === "queue" ? "queue" : "hub"}
                  </span>
                  <span className="font-medium text-[13px] text-rr-text">{svc.name}</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded-full border",
                  svc.status === "critical" ? "text-rr-error bg-rr-error/10 border-rr-error/25" :
                  svc.status === "degraded" ? "text-rr-warn bg-rr-warn/10 border-rr-warn/25" :
                  "text-rr-green bg-rr-green/10 border-rr-green/25"
                )}>
                  <span className={cn("w-1 h-1 rounded-full", svc.status === "critical" ? "bg-rr-error animate-pulse" : svc.status === "degraded" ? "bg-rr-warn" : "bg-rr-green")} />
                  {svc.status.toUpperCase()}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Latency", value: `${svc.latency}ms`, warn: svc.latency > 200 },
                  { label: "Error %", value: `${svc.errorRate.toFixed(1)}%`, warn: svc.errorRate > 5 },
                  { label: "CPU", value: `${svc.cpu}%`, warn: svc.cpu > 80 },
                ].map((m) => (
                  <div key={m.label} className="bg-rr-bg rounded-md p-2">
                    <div className="font-mono text-[9px] text-rr-muted uppercase">{m.label}</div>
                    <div className={cn("font-mono text-[12px] font-bold", m.warn ? "text-rr-error" : "text-rr-text")}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Bars */}
              <div className="mt-3 space-y-1.5">
                {[
                  { label: "CPU", value: svc.cpu },
                  { label: "Memory", value: svc.memory },
                ].map((bar) => (
                  <div key={bar.label} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-rr-muted w-12">{bar.label}</span>
                    <div className="flex-1 h-1 bg-rr-border rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", bar.value > 85 ? "bg-rr-error" : bar.value > 70 ? "bg-rr-warn" : "bg-rr-green")}
                        style={{ width: `${bar.value}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-rr-muted w-8 text-right">{bar.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Topology overview */}
      <div className="bg-rr-surface border border-rr-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-rr-border">
          <h2 className="font-medium text-[13px] text-rr-text">Infrastructure Topology</h2>
        </div>
        <div className="relative h-64 overflow-hidden bg-rr-bg" style={{ backgroundImage: "radial-gradient(rgba(103,247,177,0.04) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Connection lines */}
            <line x1="50%" y1="20%" x2="25%" y2="50%" stroke="#3c4a41" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50%" y1="20%" x2="50%" y2="50%" stroke="#ffb4ab" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="50%" y1="20%" x2="75%" y2="50%" stroke="#3c4a41" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="40%" y2="80%" stroke="#ffb4ab" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="65%" y2="80%" stroke="#ffb4ab" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
          {/* Nodes */}
          {[
            { name: "API Gateway", x: "50%", y: "15%", status: "healthy" },
            { name: "Auth Service", x: "22%", y: "45%", status: "degraded" },
            { name: "Checkout API", x: "50%", y: "45%", status: "critical" },
            { name: "User API", x: "78%", y: "45%", status: "healthy" },
            { name: "Redis Cache", x: "38%", y: "78%", status: "critical" },
            { name: "DB Primary", x: "62%", y: "78%", status: "degraded" },
          ].map((node) => (
            <div
              key={node.name}
              className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1",
              )}
              style={{ left: node.x, top: node.y }}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg border-2 flex items-center justify-center",
                node.status === "critical" ? "border-rr-error bg-rr-error/10 animate-pulse" :
                node.status === "degraded" ? "border-rr-warn bg-rr-warn/10" :
                "border-rr-green/40 bg-rr-green/5"
              )}>
                <span className={cn(
                  "material-symbols-outlined",
                  node.status === "critical" ? "text-rr-error" :
                  node.status === "degraded" ? "text-rr-warn" : "text-rr-green"
                )} style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
                  hub
                </span>
              </div>
              <span className="font-mono text-[9px] text-rr-muted bg-rr-surface px-1.5 py-0.5 rounded border border-rr-border whitespace-nowrap">{node.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
