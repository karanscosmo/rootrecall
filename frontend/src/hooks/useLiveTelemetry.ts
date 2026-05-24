"use client";
import { useEffect } from "react";
import { useStore } from "@/store";

/**
 * Drives live metric updates every 3 seconds.
 * Drop this hook into the root layout — it runs globally.
 */
export function useLiveTelemetry(enabled = true) {
  const tickMetrics = useStore((s) => s.tickMetrics);
  const addLog       = useStore((s) => s.addLog);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      tickMetrics();

      // Occasionally inject a live log
      if (Math.random() < 0.3) {
        const sampleLogs = [
          { level: "ERROR" as const, service: "checkout-api",  message: "ERR upstream timeout: cache-cluster-02 unreachable" },
          { level: "WARN"  as const, service: "auth-service",  message: "WARN connection pool at 92% capacity" },
          { level: "INFO"  as const, service: "api-gateway",   message: "INFO retrying upstream connection (attempt 3/5)" },
          { level: "ERROR" as const, service: "cache-cluster", message: "ERR MISCONF Redis is configured to save RDB snapshots" },
          { level: "WARN"  as const, service: "worker-pool",   message: "WARN job queue depth: 4821 — exceeds alert threshold" },
        ];
        const log = sampleLogs[Math.floor(Math.random() * sampleLogs.length)];
        addLog({ ...log, id: `log-${Date.now()}-${Math.random()}`, timestamp: new Date() });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [enabled, tickMetrics, addLog]);
}
