"use client";
// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · Global Zustand Store (Live Engine)
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import {
  BASE_SERVICES,
  generateInitialIncidents,
  generateInitialLogs,
  generateMetricHistory,
  generateInitialDeployments,
  generateAIMemories,
  generateLiveIncident,
  generateLogEntry,
  type Incident,
  type ServiceNode,
  type AIMemory,
  type Deployment,
  type Metric,
  type LogEntry,
  type LiveNotification,
  type ServiceStatus,
} from "@/lib/telemetry";

// Demo scenario phases (Kept for compatibility, but moving to live simulation)
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
  notifications: LiveNotification[];

  // UI state
  selectedIncidentId: string | null;
  commandPaletteOpen: boolean;
  demoPhase: DemoPhase;
  demoRunning: boolean;
  sidebarCollapsed: boolean;
  activeReplayId: string | null;
  viewMode: "tech" | "exec";

  // Live simulation engine
  liveEngineRunning: boolean;
  startLiveEngine: () => void;
  stopLiveEngine: () => void;
  tickMetrics: () => void;
  tickLogs: () => void;
  tickNotifications: () => void;

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

let metricsTimer: NodeJS.Timeout | null = null;
let logsTimer: NodeJS.Timeout | null = null;
let notificationsTimer: NodeJS.Timeout | null = null;

export const useStore = create<RootRecallStore>((set, get) => ({
  // Initialize with dynamic generators instead of static constants
  incidents:    generateInitialIncidents(),
  services:     BASE_SERVICES,
  aiMemories:   generateAIMemories(),
  deployments:  generateInitialDeployments(),
  metrics:      generateMetricHistory(20, true), // start with an incident active conceptually
  logs:         generateInitialLogs(50),
  notifications: [],

  selectedIncidentId: null,
  commandPaletteOpen: false,
  demoPhase: "idle",
  demoRunning: false,
  sidebarCollapsed: false,
  activeReplayId: null,
  viewMode: "tech",
  liveEngineRunning: false,
  backendState: "HEALTHY",

  startLiveEngine: () => {
    const s = get();
    if (s.liveEngineRunning) return;
    set({ liveEngineRunning: true });

    metricsTimer = setInterval(() => get().tickMetrics(), 2000);
    logsTimer = setInterval(() => get().tickLogs(), 5000);
    notificationsTimer = setInterval(() => get().tickNotifications(), 30000);
  },

  stopLiveEngine: () => {
    set({ liveEngineRunning: false });
    if (metricsTimer) clearInterval(metricsTimer);
    if (logsTimer) clearInterval(logsTimer);
    if (notificationsTimer) clearInterval(notificationsTimer);
  },

  tickMetrics: () => {
    set((s) => {
      const last = s.metrics[s.metrics.length - 1];
      const activeIncidents = s.incidents.filter(i => i.status === "active");
      const isIncident = activeIncidents.length > 0;
      
      const newMetric: Metric = {
        timestamp: Date.now(),
        latencyP99:   isIncident ? Math.min(6000, last.latencyP99 + (Math.random() - 0.3) * 400) : Math.max(40, last.latencyP99 + (Math.random() - 0.5) * 20),
        errorRate:    isIncident ? Math.min(100, last.errorRate + (Math.random() - 0.2) * 8) : Math.max(0, last.errorRate + (Math.random() - 0.6) * 0.5),
        cpuUsage:     isIncident ? Math.min(100, last.cpuUsage + (Math.random() - 0.3) * 5) : Math.max(15, last.cpuUsage + (Math.random() - 0.5) * 3),
        memoryUsage:  isIncident ? Math.min(100, last.memoryUsage + (Math.random() - 0.2) * 3) : Math.max(40, last.memoryUsage + (Math.random() - 0.5) * 2),
        requestRate:  isIncident ? Math.max(500, last.requestRate - Math.random() * 200) : Math.max(3000, last.requestRate + (Math.random() - 0.5) * 100),
      };

      // Also gently fluctuate services
      const updatedServices = s.services.map(svc => {
        const isAffected = activeIncidents.some(inc => inc.affectedServices.includes(svc.id));
        return {
          ...svc,
          latency: isAffected ? Math.min(5000, svc.latency + (Math.random() * 100)) : Math.max(5, svc.latency + (Math.random() - 0.5) * 10),
          cpu: isAffected ? Math.min(100, svc.cpu + (Math.random() * 5)) : Math.max(10, svc.cpu + (Math.random() - 0.5) * 2),
          status: isAffected ? "critical" : "healthy"
        } as ServiceNode;
      });

      return { 
        metrics: [...s.metrics.slice(-19), newMetric],
        services: updatedServices
      };
    });
  },

  tickLogs: () => {
    set((s) => ({ logs: [generateLogEntry(), ...s.logs].slice(0, 50) }));
  },

  tickNotifications: () => {
    const s = get();
    const activeIncident = s.incidents.find(i => i.status === "active");
    
    if (activeIncident) {
      if (Math.random() > 0.5) {
        s.addNotification({
          type: "error",
          message: `${activeIncident.service} P99 latency exceeded critical threshold`,
          incidentId: activeIncident.id
        });
      }
    } else {
      if (Math.random() > 0.7) {
        s.addNotification({
          type: "info",
          message: `Background health check passed for all ${s.services.length} services`
        });
      }
    }
    
    // Simulate new incident randomly
    if (Math.random() > 0.95 && !activeIncident) {
      const newInc = generateLiveIncident("active", 0);
      set((st) => ({ incidents: [newInc, ...st.incidents] }));
      s.addNotification({
        type: "error",
        message: `New anomaly detected: ${newInc.title}`,
        incidentId: newInc.id
      });
    }
  },

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
      // Create a rich incident instead of generic "Anomaly Detected"
      // Match service to generate a somewhat relevant title
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

  startDemo: () => {
    // Left for compatibility, but we prefer startLiveEngine now
    const store = get();
    if (store.demoRunning) return;
    set({ demoRunning: true, demoPhase: "healthy" });
    store.startLiveEngine();
  },

  stopDemo: () => {
    set({ demoRunning: false, demoPhase: "idle" });
    get().stopLiveEngine();
  },

  fetchIncidents: async () => {
    try {
      const apiBase = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`)
        : 'http://localhost:8000';
      const res = await fetch(`${apiBase}/incidents`);
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
      const res = await fetch(`${apiBase}/memory`);
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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "csrfToken=" // Actually we should use next-auth signOut, but we'll redirect to /api/auth/signout
      });
    } catch (e) {
      console.error("Logout request failed", e);
    }
    set({ user: null, isAuthenticated: false });
    window.location.href = "/api/auth/signout";
  },
}));
