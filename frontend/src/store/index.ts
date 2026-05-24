"use client";
// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · Global Zustand Store (Enterprise Cache)
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import {
  type Incident,
  type ServiceNode,
  type AIMemory,
  type Deployment,
  type Metric,
  type LogEntry,
  type LiveNotification,
  type ServiceStatus,
} from "@/lib/telemetry";

const BASE_SERVICES: ServiceNode[] = [
  { id: "api-gateway", name: "API Gateway", type: "gateway", status: "healthy", latency: 15, errorRate: 0.1, cpu: 20, memory: 40, requests: 4200, x: 50, y: 10 },
  { id: "auth-service", name: "Auth Service", type: "service", status: "healthy", latency: 45, errorRate: 0.2, cpu: 30, memory: 50, requests: 1100, x: 20, y: 40 },
  { id: "checkout-api", name: "Checkout API", type: "service", status: "healthy", latency: 80, errorRate: 0.1, cpu: 35, memory: 60, requests: 890, x: 50, y: 40 },
  { id: "user-profile", name: "User Profile API", type: "service", status: "healthy", latency: 50, errorRate: 0.1, cpu: 25, memory: 45, requests: 2300, x: 80, y: 40 },
  { id: "cache-cluster", name: "Redis Cache", type: "cache", status: "healthy", latency: 2, errorRate: 0.0, cpu: 15, memory: 60, requests: 12000, x: 35, y: 70 },
  { id: "db-primary", name: "PostgreSQL Primary", type: "database", status: "healthy", latency: 30, errorRate: 0.0, cpu: 40, memory: 75, requests: 620, x: 65, y: 70 },
  { id: "worker-pool", name: "Worker Pool", type: "service", status: "healthy", latency: 120, errorRate: 0.5, cpu: 45, memory: 55, requests: 400, x: 50, y: 90 },
  { id: "job-queue", name: "Job Queue", type: "queue", status: "healthy", latency: 5, errorRate: 0.0, cpu: 10, memory: 30, requests: 1500, x: 80, y: 90 },
];

interface RootRecallStore {
  // Core data (Empty until backend fetches)
  incidents: Incident[];
  services: ServiceNode[];
  aiMemories: AIMemory[];
  deployments: Deployment[];
  metrics: Metric[];
  logs: LogEntry[];
  notifications: LiveNotification[];

  // UI state
  selectedIncidentId: string | null;
  commandPaletteOpen: boolean;
  sidebarCollapsed: boolean;
  activeReplayId: string | null;
  viewMode: "tech" | "exec";

  // Actions
  selectIncident: (id: string | null) => void;
  toggleCommandPalette: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleSidebar: () => void;
  setActiveReplay: (id: string | null) => void;
  addLog: (log: LogEntry) => void;
  addNotification: (notification: Omit<LiveNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
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
  incidents:    [],
  services:     BASE_SERVICES,
  aiMemories:   [],
  deployments:  [],
  metrics:      [],
  logs:         [],
  notifications: [],

  selectedIncidentId: null,
  commandPaletteOpen: false,
  sidebarCollapsed: false,
  activeReplayId: null,
  viewMode: "tech",
  backendState: "HEALTHY",

  selectIncident: (id) => set({ selectedIncidentId: id }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  openCommandPalette:  () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveReplay: (id) => set({ activeReplayId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),

  addLog: (log) =>
    set((s) => ({ logs: [log, ...s.logs].slice(0, 50) })),

  addNotification: (notif) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newNotif: LiveNotification = { ...notif, id, timestamp: new Date() };
    set(s => ({ notifications: [newNotif, ...s.notifications] }));
    
    if (notif.autoExpireMs !== 0) {
      setTimeout(() => get().removeNotification(id), notif.autoExpireMs || 15000);
    }
  },

  removeNotification: (id) => {
    set(s => ({ notifications: s.notifications.filter(n => n.id !== id) }));
  },

  resolveIncident: (id) =>
    set((s) => ({
      incidents: s.incidents.map((inc) =>
        inc.id === id ? { ...inc, status: "resolved" as const, resolvedAt: new Date(), duration: "Just now" } : inc
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
          status: status as ServiceStatus,
        };
      })
    })),

  handleIncidentCreated: (backendIncident) =>
    set((s) => {
      const serviceName = backendIncident.service || "unknown";
      const newIncident: Incident = {
        id: backendIncident.id,
        title: `${serviceName} Degradation Detected`,
        status: "active",
        severity: backendIncident.severity || "SEV-2",
        service: serviceName,
        startedAt: new Date(),
        impact: `Performance degraded on ${serviceName}`,
        aiConfidence: 0,
        rootCause: "Investigating telemetry...",
        affectedServices: [serviceName],
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
            title: backendIncident.root_cause || inc.title,
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

  fetchIncidents: async () => {
    try {
      const apiBase = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`)
        : 'http://localhost:8000';
      const token = get().user?.accessToken;
      const res = await fetch(`${apiBase}/incidents`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((inc: any) => ({
          ...inc,
          startedAt: inc.startedAt ? new Date(inc.startedAt) : new Date(),
          resolvedAt: inc.resolvedAt ? new Date(inc.resolvedAt) : undefined,
        }));
        // Merge with existing ones (prefer backend)
        set(s => ({ incidents: [...formatted, ...s.incidents.filter(localInc => !formatted.find((f:any) => f.id === localInc.id))] }));
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
      const token = get().user?.accessToken;
      const res = await fetch(`${apiBase}/memory`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
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

  user: null,
  isAuthenticated: false,
  checkSession: async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const session = await res.json();
        if (session && Object.keys(session).length > 0) {
          set({ user: session.user, isAuthenticated: true });
          return true;
        }
      }
    } catch (e) {
      console.error("Session verification failed", e);
    }
    set({ user: null, isAuthenticated: false });
    return false;
  },
  logout: async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "csrfToken="
      });
    } catch (e) {
      console.error("Logout request failed", e);
    }
    set({ user: null, isAuthenticated: false });
    window.location.href = "/api/auth/signout";
  },
}));
