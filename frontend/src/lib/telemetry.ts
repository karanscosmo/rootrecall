// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · Telemetry Types & Utilities
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = "SEV-1" | "SEV-2" | "SEV-3" | "SEV-4";
export type IncidentStatus = "active" | "investigating" | "mitigated" | "resolved";
export type ServiceStatus = "healthy" | "degraded" | "critical" | "unknown";
export type ServiceType = "gateway" | "service" | "database" | "cache" | "queue" | "external";

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  startedAt: Date;
  resolvedAt?: Date;
  duration?: string;
  impact: string;
  aiConfidence: number;
  rootCause: string;
  affectedServices: string[];
  similarityScore?: number;
  similarTo?: string;
  replayAvailable: boolean;
  postmortemGenerated: boolean;
  remediationSteps?: { step: number; action: string; command: string }[];
}

export interface Metric {
  timestamp: number;
  latencyP99: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  requestRate: number;
}

export interface ServiceNode {
  id: string;
  name: string;
  type: ServiceType;
  status: ServiceStatus;
  latency: number;
  errorRate: number;
  cpu: number;
  memory: number;
  requests: number;
  x: number;
  y: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "ERROR" | "WARN" | "INFO" | "DEBUG";
  service: string;
  message: string;
  traceId?: string;
}

export interface Deployment {
  id: string;
  service: string;
  version: string;
  deployedAt: Date;
  deployedBy: string;
  status: "success" | "failed" | "rolling" | "rollback";
  triggeredIncident?: string;
}

export interface AIMemory {
  patternId: string;
  description: string;
  similarity: number;
  occurrences: number;
  lastSeen: Date;
  recommendation: string;
  relatedIncidents: string[];
}

export interface LiveNotification {
  id: string;
  message: string;
  type: "warning" | "error" | "info" | "success";
  timestamp: Date;
  incidentId?: string;
  autoExpireMs?: number;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function formatDuration(startedAt: Date, resolvedAt?: Date): string {
  const end = resolvedAt ?? new Date();
  const ms = end.getTime() - startedAt.getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m ${secs}s`;
}

export function formatTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function getSeverityColor(sev: Severity): string {
  switch (sev) {
    case "SEV-1": return "text-rr-error";
    case "SEV-2": return "text-orange-400";
    case "SEV-3": return "text-rr-warn";
    case "SEV-4": return "text-rr-muted";
  }
}

export function getStatusColor(status: ServiceStatus): string {
  switch (status) {
    case "healthy":  return "text-rr-green";
    case "degraded": return "text-rr-warn";
    case "critical": return "text-rr-error";
    default:         return "text-rr-muted";
  }
}
