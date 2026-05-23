export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3" | "SEV-4";
  status: "active" | "investigating" | "mitigated" | "resolved";
  startedAt: Date;
  resolvedAt?: Date;
  duration?: string;
  impact: string;
  aiConfidence: number;
  rootCause: string;
  affectedServices: string[];
  replayAvailable: boolean;
  postmortemGenerated: boolean;
}

export interface Metric {
  timestamp: number;
  latencyP99: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  requestRate: number;
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

export interface TelemetryEvent {
  type: 'telemetry' | 'status_change' | 'incident_created' | 'rca_ready' | 'incident_resolved' | 'ai_thinking';
  timestamp: string;
  data: any;
}
