// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · Centralized Telemetry Engine (Live Generators)
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

// ─── Base Topologies ─────────────────────────────────────────────────────────

export const BASE_SERVICES: ServiceNode[] = [
  { id: "api-gateway", name: "API Gateway", type: "gateway", status: "healthy", latency: 15, errorRate: 0.1, cpu: 20, memory: 40, requests: 4200, x: 50, y: 10 },
  { id: "auth-service", name: "Auth Service", type: "service", status: "healthy", latency: 45, errorRate: 0.2, cpu: 30, memory: 50, requests: 1100, x: 20, y: 40 },
  { id: "checkout-api", name: "Checkout API", type: "service", status: "healthy", latency: 80, errorRate: 0.1, cpu: 35, memory: 60, requests: 890, x: 50, y: 40 },
  { id: "user-profile", name: "User Profile API", type: "service", status: "healthy", latency: 50, errorRate: 0.1, cpu: 25, memory: 45, requests: 2300, x: 80, y: 40 },
  { id: "cache-cluster", name: "Redis Cache", type: "cache", status: "healthy", latency: 2, errorRate: 0.0, cpu: 15, memory: 60, requests: 12000, x: 35, y: 70 },
  { id: "db-primary", name: "PostgreSQL Primary", type: "database", status: "healthy", latency: 30, errorRate: 0.0, cpu: 40, memory: 75, requests: 620, x: 65, y: 70 },
  { id: "worker-pool", name: "Worker Pool", type: "service", status: "healthy", latency: 120, errorRate: 0.5, cpu: 45, memory: 55, requests: 400, x: 50, y: 90 },
  { id: "job-queue", name: "Job Queue", type: "queue", status: "healthy", latency: 5, errorRate: 0.0, cpu: 10, memory: 30, requests: 1500, x: 80, y: 90 },
];

const USERS = ["alex.chen", "maya.patel", "sam.wilson", "ci-pipeline", "system-auto"];

// ─── Generators ──────────────────────────────────────────────────────────────

let idCounter = Math.floor(Math.random() * 1000) + 8000;

function randomId(prefix: string) {
  return `${prefix}-${idCounter++}`;
}

function randomTraceId() {
  return Math.random().toString(16).substring(2, 8);
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const INCIDENT_SCENARIOS = [
  {
    title: "Redis Connection Pool Exhaustion",
    service: "cache-cluster",
    severity: "SEV-1" as Severity,
    impact: "Cache miss storm causing 100% checkout failure",
    rootCause: "Maxmemory policy misconfigured, eviction disabled leading to OOM.",
    affectedServices: ["cache-cluster", "checkout-api", "api-gateway"],
    remediationSteps: [
      { step: 1, action: "Increase maxmemory threshold temporarily", command: "redis-cli config set maxmemory 8gb" },
      { step: 2, action: "Set eviction policy", command: "redis-cli config set maxmemory-policy allkeys-lru" }
    ]
  },
  {
    title: "K8s Pod Eviction Cascade",
    service: "worker-pool",
    severity: "SEV-2" as Severity,
    impact: "Background job processing halted, queue depth > 50k",
    rootCause: "Memory leak in worker version v2.0.2 causing node memory pressure and OOMKilled events.",
    affectedServices: ["worker-pool", "job-queue", "db-primary"],
    remediationSteps: [
      { step: 1, action: "Rollback worker deployment", command: "kubectl rollout undo deploy/worker-pool" },
      { step: 2, action: "Scale up temporarily to drain queue", command: "kubectl scale deploy/worker-pool --replicas=20" }
    ]
  },
  {
    title: "Database Connection Saturation",
    service: "db-primary",
    severity: "SEV-1" as Severity,
    impact: "P99 latency > 2000ms, all DB-dependent services degraded",
    rootCause: "Unpaginated query from user-profile service holding locks too long.",
    affectedServices: ["db-primary", "user-profile", "auth-service"],
    remediationSteps: [
      { step: 1, action: "Terminate long-running queries", command: "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND state_change < current_timestamp - INTERVAL '5 minutes';" },
      { step: 2, action: "Scale user-profile pods down to reduce load", command: "kubectl scale deploy/user-profile --replicas=2" }
    ]
  },
  {
    title: "Auth JWT Latency Spike",
    service: "auth-service",
    severity: "SEV-2" as Severity,
    impact: "Login degraded, API gateway returning 504 timeouts",
    rootCause: "New encryption library in v2.4.1 consumes 3x CPU for token validation.",
    affectedServices: ["auth-service", "api-gateway"],
    remediationSteps: [
      { step: 1, action: "Rollback auth-service", command: "kubectl rollout undo deploy/auth-service" }
    ]
  },
  {
    title: "API Gateway 502 Storm",
    service: "api-gateway",
    severity: "SEV-1" as Severity,
    impact: "100% traffic drop across all routes",
    rootCause: "Upstream connection limits reached due to misconfigured rate limiter in new gateway deployment.",
    affectedServices: ["api-gateway", "checkout-api", "auth-service"],
    remediationSteps: [
      { step: 1, action: "Revert rate limit config map", command: "kubectl apply -f config/gateway-limits-stable.yaml" },
      { step: 2, action: "Restart gateway pods", command: "kubectl rollout restart deploy/api-gateway" }
    ]
  }
];

export function generateLiveIncident(status: IncidentStatus, ageMinutes: number): Incident {
  const scenario = randomChoice(INCIDENT_SCENARIOS);
  const startedAt = new Date(Date.now() - ageMinutes * 60 * 1000);
  let resolvedAt;
  
  if (status === "resolved" || status === "mitigated") {
    resolvedAt = new Date(startedAt.getTime() + randomInt(15, 120) * 60 * 1000);
    // Ensure it doesn't resolve in the future relative to 'now' when generated
    if (resolvedAt > new Date()) resolvedAt = new Date(Date.now() - 5 * 60 * 1000);
  }

  return {
    id: randomId("INC"),
    title: scenario.title,
    service: scenario.service,
    severity: scenario.severity,
    status,
    startedAt,
    resolvedAt,
    duration: resolvedAt ? formatDuration(startedAt, resolvedAt) : undefined,
    impact: scenario.impact,
    aiConfidence: randomInt(75, 98),
    rootCause: scenario.rootCause,
    affectedServices: scenario.affectedServices,
    similarityScore: randomInt(70, 95),
    similarTo: `INC-${randomInt(2000, 7000)}`,
    replayAvailable: true,
    postmortemGenerated: status === "resolved",
    remediationSteps: scenario.remediationSteps
  };
}

export function generateInitialIncidents(): Incident[] {
  return [
    generateLiveIncident("active", randomInt(5, 15)),
    generateLiveIncident("investigating", randomInt(20, 60)),
    generateLiveIncident("resolved", randomInt(120, 400)),
    generateLiveIncident("resolved", randomInt(500, 1000)),
  ];
}

const LOG_TEMPLATES = [
  { level: "ERROR", service: "checkout-api", msg: "ERR upstream connect error or disconnect/reset before headers" },
  { level: "ERROR", service: "auth-service", msg: "ERR failed to acquire DB connection: timeout after 5000ms" },
  { level: "WARN",  service: "auth-service", msg: "WARN connection pool exhausted (active: 100/100)" },
  { level: "ERROR", service: "checkout-api", msg: "ERR Redis CONNRESET: cache-cluster connection refused" },
  { level: "WARN",  service: "cache-cluster",msg: "WARN memory usage at 94% — approaching maxmemory limit" },
  { level: "ERROR", service: "cache-cluster",msg: "ERR OOM command not allowed when used memory > 'maxmemory'" },
  { level: "WARN",  service: "api-gateway",  msg: "WARN upstream P99 latency exceeded threshold" },
  { level: "INFO",  service: "ci-pipeline",  msg: "INFO deployment completed — rolling update 3/3 pods" },
  { level: "INFO",  service: "api-gateway",  msg: "INFO health check all services healthy" },
  { level: "DEBUG", service: "worker-pool",  msg: "DEBUG job queue depth processing normally" },
  { level: "WARN",  service: "db-primary",   msg: "WARN slow query detected duration=1250ms" },
  { level: "ERROR", service: "worker-pool",  msg: "ERR OOMKilled pod worker-pool-7b5f99d9b-x82m" },
  { level: "INFO",  service: "system-auto",  msg: "INFO auto-scaler triggering scale up event +2 replicas" },
  { level: "DEBUG", service: "user-profile", msg: "DEBUG cache miss for user profile, falling back to DB" }
];

export function generateLogEntry(): LogEntry {
  const tmpl = randomChoice(LOG_TEMPLATES);
  return {
    id: `log-${randomTraceId()}`,
    timestamp: new Date(),
    level: tmpl.level as any,
    service: tmpl.service,
    message: tmpl.msg,
    traceId: tmpl.level === "ERROR" ? randomTraceId() : undefined
  };
}

export function generateInitialLogs(count = 50): LogEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const log = generateLogEntry();
    log.timestamp = new Date(Date.now() - (count - i) * 5000);
    return log;
  });
}

export function generateMetricHistory(points = 20, isIncidentActive = false): Metric[] {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => {
    const t = now - (points - i) * 2000; // 2s intervals to match live updates
    const spike = isIncidentActive && i > points - 10;
    
    return {
      timestamp: t,
      latencyP99: spike ? randomInt(1000, 5000) : randomInt(40, 100),
      errorRate: spike ? randomInt(20, 95) : randomInt(0, 2) + Math.random(),
      cpuUsage: spike ? randomInt(80, 99) : randomInt(20, 45),
      memoryUsage: spike ? randomInt(85, 99) : randomInt(40, 60),
      requestRate: spike ? randomInt(500, 2000) : randomInt(3800, 4500),
    };
  });
}

export function generateInitialDeployments(): Deployment[] {
  return [
    { id: randomId("DEP"), service: "auth-service", version: `v${randomInt(2,4)}.${randomInt(0,9)}.${randomInt(0,9)}`, deployedAt: new Date(Date.now() - 15 * 60 * 1000), deployedBy: "ci-pipeline", status: "rollback" },
    { id: randomId("DEP"), service: "user-profile", version: `v3.1.0`, deployedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), deployedBy: "alex.chen", status: "success" },
    { id: randomId("DEP"), service: "api-gateway", version: `v1.8.4`, deployedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), deployedBy: "ci-pipeline", status: "success" },
    { id: randomId("DEP"), service: "worker-pool", version: `v2.0.2`, deployedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), deployedBy: "maya.patel", status: "failed" },
  ];
}

export function generateAIMemories(): AIMemory[] {
  return [
    {
      patternId: randomId("PAT"),
      description: "Redis connection pool exhaustion after deploy",
      similarity: randomInt(85, 95),
      occurrences: randomInt(2, 6),
      lastSeen: new Date(Date.now() - 48 * 60 * 60 * 1000),
      recommendation: "Gate deploys on Redis memory headroom check (>20%). Enable connection pool monitoring alerts at 80% saturation.",
      relatedIncidents: ["INC-8241", "INC-8150"],
    },
    {
      patternId: randomId("PAT"),
      description: "Unpaginated DB query spike on high-traffic tables",
      similarity: randomInt(80, 90),
      occurrences: randomInt(2, 4),
      lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000),
      recommendation: "Mandate EXPLAIN plan analysis in CI for queries touching tables >100k rows.",
      relatedIncidents: ["INC-8239"],
    },
    {
      patternId: randomId("PAT"),
      description: "Deployment-triggered cascading failure pattern",
      similarity: randomInt(70, 85),
      occurrences: randomInt(4, 8),
      lastSeen: new Date(Date.now() - 12 * 60 * 60 * 1000),
      recommendation: "Implement canary deploy gates with automated rollback on P99 threshold breach within 5 minutes.",
      relatedIncidents: ["INC-8241", "INC-8180"],
    },
  ];
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
