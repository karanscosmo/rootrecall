"use client";
// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · Global Zustand Store
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import {
  INCIDENTS,
  SERVICES,
  AI_MEMORIES,
  DEPLOYMENTS,
  generateMetricHistory,
  generateLogs,
  type Incident,
  type ServiceNode,
  type AIMemory,
  type Deployment,
  type Metric,
  type LogEntry,
} from "@/lib/telemetry";

// Demo scenario phases
export type DemoPhase =
  | "idle"
  | "healthy"
  | "deploying"
  | "anomaly"
  | "ai_detecting"
  | "replay"
  | "rca"
  | "postmortem"
  | "prevention";

interface RootRecallStore {
  // Core data
  incidents: Incident[];
  services: ServiceNode[];
  aiMemories: AIMemory[];
  deployments: Deployment[];
  metrics: Metric[];
  logs: LogEntry[];

  // UI state
  selectedIncidentId: string | null;
  commandPaletteOpen: boolean;
  demoPhase: DemoPhase;
  demoRunning: boolean;
  sidebarCollapsed: boolean;
  activeReplayId: string | null;
  viewMode: "tech" | "exec";

  // Live simulation
  liveMetricsRunning: boolean;

  // Actions
  selectIncident: (id: string | null) => void;
  toggleCommandPalette: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleSidebar: () => void;
  setDemoPhase: (phase: DemoPhase) => void;
  startDemo: () => void;
  stopDemo: () => void;
  setActiveReplay: (id: string | null) => void;
  addLog: (log: LogEntry) => void;
  updateMetrics: () => void;
  resolveIncident: (id: string) => void;
  setViewMode: (mode: "tech" | "exec") => void;
  
  // Backend integrations
  backendState: string;
  setBackendState: (state: string) => void;
  updateMetricsFromBackend: (metrics: Partial<Metric>) => void;
  updateServicesFromBackend: (serviceMetrics: Record<string, any>) => void;
  handleIncidentCreated: (incident: any) => void;
  handleRcaReady: (incident: any) => void;
  handleIncidentResolved: (incident: any) => void;
  fetchIncidents: () => Promise<void>;
  fetchMemory: () => Promise<void>;
  
  // Auth state
  user: any | null;
  isAuthenticated: boolean;
  checkSession: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useStore = create<RootRecallStore>((set, get) => ({
  incidents:    INCIDENTS,
  services:     SERVICES,
  aiMemories:   AI_MEMORIES,
  deployments:  DEPLOYMENTS,
  metrics:      generateMetricHistory(20),
  logs:         generateLogs(10),

  selectedIncidentId: null,
  commandPaletteOpen: false,
  demoPhase: "idle",
  demoRunning: false,
  sidebarCollapsed: false,
  activeReplayId: null,
  viewMode: "tech",
  liveMetricsRunning: false,
  backendState: "HEALTHY",

  selectIncident: (id) => set({ selectedIncidentId: id }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  openCommandPalette:  () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setDemoPhase: (phase) => set({ demoPhase: phase }),
  setActiveReplay: (id) => set({ activeReplayId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),

  addLog: (log) =>
    set((s) => ({ logs: [log, ...s.logs].slice(0, 50) })),

  updateMetrics: () =>
    set((s) => {
      const last = s.metrics[s.metrics.length - 1];
      const isIncident = s.incidents.some((i) => i.status === "active");
      const newMetric: Metric = {
        timestamp: Date.now(),
        latencyP99:   isIncident ? Math.min(6000, last.latencyP99 + (Math.random() - 0.3) * 400) : Math.max(60, last.latencyP99 + (Math.random() - 0.5) * 20),
        errorRate:    isIncident ? Math.min(100, last.errorRate + (Math.random() - 0.2) * 8) : Math.max(0, last.errorRate + (Math.random() - 0.6) * 0.5),
        cpuUsage:     isIncident ? Math.min(100, last.cpuUsage + (Math.random() - 0.3) * 5) : Math.max(15, last.cpuUsage + (Math.random() - 0.5) * 3),
        memoryUsage:  isIncident ? Math.min(100, last.memoryUsage + (Math.random() - 0.2) * 3) : Math.max(40, last.memoryUsage + (Math.random() - 0.5) * 2),
        requestRate:  isIncident ? Math.max(0, last.requestRate - Math.random() * 200) : 3800 + Math.random() * 600,
      };
      return { metrics: [...s.metrics.slice(-19), newMetric] };
    }),

  resolveIncident: (id) =>
    set((s) => ({
      incidents: s.incidents.map((inc) =>
        inc.id === id ? { ...inc, status: "resolved" as const, resolvedAt: new Date() } : inc
      ),
    })),

  // Backend Integrations
  setBackendState: (state) => set({ backendState: state }),
  
  updateMetricsFromBackend: (backendMetrics) =>
    set((s) => {
      const newMetric: Metric = {
        timestamp: Date.now(),
        latencyP99: backendMetrics.latencyP99 || 40,
        errorRate: backendMetrics.errorRate || 0,
        cpuUsage: backendMetrics.cpuUsage || 30,
        memoryUsage: backendMetrics.memoryUsage || 40,
        requestRate: backendMetrics.requestRate || 4000,
      };
      return { metrics: [...s.metrics.slice(-19), newMetric] };
    }),
    
  updateServicesFromBackend: (serviceMetrics) =>
    set((s) => ({
      services: s.services.map((svc) => {
        const metrics = serviceMetrics[svc.id];
        if (!metrics) return svc;
        
        let status = svc.status;
        if (metrics.status) {
          status = metrics.status;
        } else {
          if (metrics.errors > 50 || metrics.latency > 1000) {
            status = "critical";
          } else if (metrics.errors > 2 || metrics.latency > 200) {
            status = "degraded";
          } else {
            status = "healthy";
          }
        }

        return {
          ...svc,
          latency: Math.round(metrics.latency),
          errorRate: parseFloat(metrics.errors.toFixed(1)),
          cpu: Math.round(metrics.cpu),
          memory: Math.round(metrics.memory),
          status: status,
        };
      })
    })),

  handleIncidentCreated: (backendIncident) =>
    set((s) => {
      const newIncident: Incident = {
        id: backendIncident.id,
        title: "Anomaly Detected",
        status: "active",
        severity: "SEV-1",
        service: backendIncident.service,
        startedAt: new Date(),
        impact: "Unknown impact",
        aiConfidence: 0,
        rootCause: "Unknown",
        affectedServices: [backendIncident.service],
        replayAvailable: true,
        postmortemGenerated: false
      };
      return { incidents: [newIncident, ...s.incidents] };
    }),
    
  handleRcaReady: (backendIncident) =>
    set((s) => {
      return {
        incidents: s.incidents.map(inc => 
          inc.id === backendIncident.id ? { 
            ...inc, 
            title: backendIncident.root_cause,
            rootCause: backendIncident.root_cause,
            aiConfidence: Math.round(backendIncident.confidence * 100),
            remediationSteps: backendIncident.remediation_steps
          } : inc
        )
      };
    }),
    
  handleIncidentResolved: (backendIncident) =>
    set((s) => ({
      incidents: s.incidents.map((inc) =>
        inc.id === backendIncident.id ? { ...inc, status: "resolved" as const, resolvedAt: new Date() } : inc
      ),
    })),

  startDemo: () => {
    const store = get();
    if (store.demoRunning) return;
    set({ demoRunning: true, demoPhase: "healthy" });
  },

  stopDemo: () => set({ demoRunning: false, demoPhase: "idle" }),

  fetchIncidents: async () => {
    try {
      const apiBase = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`)
        : 'http://localhost:8000';
      const res = await fetch(`${apiBase}/api/incidents`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((inc: any) => ({
          ...inc,
          startedAt: inc.startedAt ? new Date(inc.startedAt) : new Date(),
          resolvedAt: inc.resolvedAt ? new Date(inc.resolvedAt) : undefined,
        }));
        set({ incidents: formatted });
      }
    } catch (e) {
      console.error("Failed to fetch incidents", e);
    }
  },

  fetchMemory: async () => {
    try {
      const apiBase = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`)
        : 'http://localhost:8000';
      const res = await fetch(`${apiBase}/api/memory`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((m: any) => ({
          ...m,
          lastSeen: m.lastSeen ? new Date(m.lastSeen) : new Date(),
        }));
        set({ aiMemories: formatted });
      }
    } catch (e) {
      console.error("Failed to fetch memory", e);
    }
  },

  // Auth implementation
  user: null,
  isAuthenticated: false,
  checkSession: async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        set({ user: data, isAuthenticated: true });
        return true;
      }
    } catch (e) {
      console.error("Session verification failed", e);
    }
    set({ user: null, isAuthenticated: false });
    return false;
  },
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout request failed", e);
    }
    set({ user: null, isAuthenticated: false });
    window.location.href = "/";
  },
}));
