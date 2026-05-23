// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · Centralized Telemetry Engine
// Single source of truth. ALL pages consume this.
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = "SEV-1" | "SEV-2" | "SEV-3" | "SEV-4";
export type IncidentStatus = "active" | "investigating" | "mitigated" | "resolved";
export type ServiceStatus = "healthy" | "degraded" | "critical" | "unknown";

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
  type: "gateway" | "service" | "database" | "cache" | "queue" | "external";
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

// ─── Shared Dataset ──────────────────────────────────────────────────────────

export const INCIDENTS: Incident[] = [
  {
    id: "INC-8241",
    title: "Payment Gateway Timeout Cascade",
    service: "services/checkout-api",
    severity: "SEV-1",
    status: "active",
    startedAt: new Date(Date.now() - 12 * 60 * 1000),
    impact: "100% checkout failure, ~$3.2k/min revenue loss",
    aiConfidence: 94,
    rootCause: "Redis connection pool exhaustion on cache-cluster-02 after auth-service v2.4.1 deploy introduced unpaginated query",
    affectedServices: ["checkout-api", "auth-service", "cache-cluster-02", "api-gateway"],
    similarityScore: 91,
    similarTo: "INC-2023-08-12",
    replayAvailable: true,
    postmortemGenerated: false,
    remediationSteps: [
      { step: 1, action: "Increase timeout threshold temporarily", command: "kubectl set env deploy/checkout-api PAYMENT_TIMEOUT=10s" },
      { step: 2, action: "Scale up replicas to handle backlog", command: "kubectl scale deploy/checkout-api --replicas=10" }
    ]
  },
  {
    id: "INC-8239",
    title: "Auth Service Latency Spike",
    service: "services/auth-service",
    severity: "SEV-2",
    status: "investigating",
    startedAt: new Date(Date.now() - 45 * 60 * 1000),
    impact: "P99 latency > 2000ms, login degraded",
    aiConfidence: 87,
    rootCause: "DB connection pool saturation — 87% similar to INC-2023-08-12",
    affectedServices: ["auth-service", "user-profile-api", "db-cluster-primary"],
    similarityScore: 87,
    similarTo: "INC-2023-08-12",
    replayAvailable: true,
    postmortemGenerated: false,
    remediationSteps: [
      { step: 1, action: "Scale auth pods", command: "kubectl scale deploy/auth-service --replicas=5" },
      { step: 2, action: "Flush connections", command: "pg_ctl restart" }
    ]
  },
  {
    id: "INC-8201",
    title: "Elevated 5xx Error Rate",
    service: "services/user-profile",
    severity: "SEV-3",
    status: "mitigated",
    startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    duration: "58m 14s",
    impact: "~12% of profile API requests failing",
    aiConfidence: 78,
    rootCause: "Downstream database slow query from unindexed column join",
    affectedServices: ["user-profile-api", "db-replica-01"],
    replayAvailable: true,
    postmortemGenerated: true,
    remediationSteps: [
      { step: 1, action: "Rollback deployment", command: "kubectl rollout undo deploy/user-profile" },
      { step: 2, action: "Add missing index (async)", command: "CREATE INDEX idx_user_last_login ON users(last_login);" }
    ]
  },
  {
    id: "INC-8180",
    title: "K8s Pod Eviction Cascade",
    service: "services/worker-pool",
    severity: "SEV-2",
    status: "resolved",
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    resolvedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    duration: "42m 15s",
    impact: "Background job processing halted, queue depth exceeded 50k",
    aiConfidence: 96,
    rootCause: "Node memory pressure caused eviction of worker pods; OOMKilled event at 14:02 UTC",
    affectedServices: ["worker-pool", "job-queue", "redis-cluster"],
    replayAvailable: true,
    postmortemGenerated: true,
  },
  {
    id: "INC-8150",
    title: "Redis Saturation Event",
    service: "services/cache-cluster",
    severity: "SEV-1",
    status: "resolved",
    startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    resolvedAt: new Date(Date.now() - 47 * 60 * 60 * 1000),
    duration: "28m 33s",
    impact: "Cache miss storm, 60% traffic fallthrough to primary DB",
    aiConfidence: 99,
    rootCause: "Redis maxmemory policy misconfigured post-deploy; eviction disabled",
    affectedServices: ["cache-cluster-01", "cache-cluster-02", "api-gateway", "checkout-api"],
    similarityScore: 91,
    replayAvailable: true,
    postmortemGenerated: true,
  },
];

export const SERVICES: ServiceNode[] = [
  { id: "api-gw",      name: "API Gateway",      type: "gateway",  status: "healthy",   latency: 18,  errorRate: 0.1,  cpu: 22, memory: 41, requests: 4200, x: 50,  y: 10  },
  { id: "auth",        name: "Auth Service",      type: "service",  status: "degraded",  latency: 420, errorRate: 2.4,  cpu: 68, memory: 72, requests: 1100, x: 20,  y: 40  },
  { id: "checkout",    name: "Checkout API",      type: "service",  status: "critical",  latency: 5200,errorRate: 98.0, cpu: 95, memory: 89, requests: 890,  x: 50,  y: 40  },
  { id: "user-api",    name: "User Profile API",  type: "service",  status: "healthy",   latency: 45,  errorRate: 0.3,  cpu: 31, memory: 55, requests: 2300, x: 80,  y: 40  },
  { id: "cache",       name: "Redis Cache",       type: "cache",    status: "critical",  latency: 0,   errorRate: 100,  cpu: 99, memory: 100,requests: 0,    x: 35,  y: 70  },
  { id: "db-primary",  name: "DB Primary",        type: "database", status: "degraded",  latency: 380, errorRate: 4.2,  cpu: 78, memory: 82, requests: 620,  x: 65,  y: 70  },
  { id: "worker",      name: "Worker Pool",       type: "service",  status: "healthy",   latency: 120, errorRate: 0.5,  cpu: 44, memory: 60, requests: 400,  x: 50,  y: 90  },
];

export const AI_MEMORIES: AIMemory[] = [
  {
    patternId: "PAT-001",
    description: "Redis connection pool exhaustion after deploy",
    similarity: 91,
    occurrences: 4,
    lastSeen: new Date(Date.now() - 48 * 60 * 60 * 1000),
    recommendation: "Gate deploys on Redis memory headroom check (>20%). Enable connection pool monitoring alerts at 80% saturation.",
    relatedIncidents: ["INC-8241", "INC-8150", "INC-2023-08-12", "INC-2023-05-03"],
  },
  {
    patternId: "PAT-002",
    description: "Unpaginated DB query spike on high-traffic tables",
    similarity: 87,
    occurrences: 3,
    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000),
    recommendation: "Mandate EXPLAIN plan analysis in CI for queries touching tables >100k rows.",
    relatedIncidents: ["INC-8239", "INC-8201", "INC-2023-11-04"],
  },
  {
    patternId: "PAT-003",
    description: "Deployment-triggered cascading failure pattern",
    similarity: 78,
    occurrences: 6,
    lastSeen: new Date(Date.now() - 12 * 60 * 60 * 1000),
    recommendation: "Implement canary deploy gates with automated rollback on P99 threshold breach within 5 minutes.",
    relatedIncidents: ["INC-8241", "INC-8180", "INC-8150"],
  },
];

export const DEPLOYMENTS: Deployment[] = [
  {
    id: "DEP-2841",
    service: "auth-service",
    version: "v2.4.1",
    deployedAt: new Date(Date.now() - 14 * 60 * 1000),
    deployedBy: "ci-pipeline",
    status: "rollback",
    triggeredIncident: "INC-8241",
  },
  {
    id: "DEP-2840",
    service: "user-profile-api",
    version: "v3.1.0",
    deployedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    deployedBy: "alex.chen",
    status: "success",
  },
  {
    id: "DEP-2839",
    service: "api-gateway",
    version: "v1.8.4",
    deployedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    deployedBy: "ci-pipeline",
    status: "success",
  },
  {
    id: "DEP-2838",
    service: "worker-pool",
    version: "v2.0.2",
    deployedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    deployedBy: "maya.patel",
    status: "failed",
    triggeredIncident: "INC-8180",
  },
];

// ─── Metric Generators ───────────────────────────────────────────────────────

export function generateMetricHistory(points = 20): Metric[] {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => {
    const t = now - (points - i) * 15000;
    const isSpike = i > 14;
    return {
      timestamp: t,
      latencyP99: isSpike ? 1200 + Math.random() * 4000 : 80 + Math.random() * 60,
      errorRate: isSpike ? 40 + Math.random() * 55 : Math.random() * 2,
      cpuUsage: isSpike ? 80 + Math.random() * 19 : 20 + Math.random() * 30,
      memoryUsage: isSpike ? 75 + Math.random() * 24 : 45 + Math.random() * 20,
      requestRate: 3800 + Math.random() * 600 - (isSpike ? 2000 : 0),
    };
  });
}

export function generateLogs(count = 15): LogEntry[] {
  const logs: LogEntry[] = [
    { timestamp: new Date(Date.now() - 2000),  level: "ERROR", service: "checkout-api",  message: "ERR upstream connect error or disconnect/reset before headers. Reset reason: connection termination", traceId: "4f2a91" },
    { timestamp: new Date(Date.now() - 8000),  level: "ERROR", service: "auth-service",  message: "ERR failed to acquire DB connection: timeout after 5000ms", traceId: "7bc821" },
    { timestamp: new Date(Date.now() - 15000), level: "WARN",  service: "auth-service",  message: "WARN connection pool exhausted (active: 100/100)" },
    { timestamp: new Date(Date.now() - 22000), level: "ERROR", service: "checkout-api",  message: "ERR Redis CONNRESET: cache-cluster-02 connection refused", traceId: "4f2a91" },
    { timestamp: new Date(Date.now() - 30000), level: "WARN",  service: "cache-cluster", message: "WARN memory usage at 94% — approaching maxmemory limit" },
    { timestamp: new Date(Date.now() - 45000), level: "ERROR", service: "cache-cluster", message: "ERR OOM command not allowed when used memory > 'maxmemory'" },
    { timestamp: new Date(Date.now() - 60000), level: "WARN",  service: "api-gateway",   message: "WARN upstream auth-service P99 latency exceeded 400ms threshold" },
    { timestamp: new Date(Date.now() - 75000), level: "INFO",  service: "ci-pipeline",   message: "INFO deployment auth-service v2.4.1 completed — rolling update 3/3 pods" },
    { timestamp: new Date(Date.now() - 90000), level: "INFO",  service: "api-gateway",   message: "INFO health check all services healthy — baseline latency 18ms" },
    { timestamp: new Date(Date.now() - 120000),level: "DEBUG", service: "worker-pool",   message: "DEBUG job queue depth: 847 — within normal operating range" },
  ];
  return logs.slice(0, count);
}

// ─── Formatters ──────────────────────────────────────────────────────────────

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
