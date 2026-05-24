"use client";
import { useEffect, useCallback } from "react";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";

/**
 * Global CMD+K command palette hook.
 * Attach at root layout level.
 */
export function useCommandPalette() {
  const open  = useStore((s) => s.openCommandPalette);
  const close = useStore((s) => s.closeCommandPalette);
  const isOpen = useStore((s) => s.commandPaletteOpen);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? close() : open();
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    },
    [isOpen, open, close]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return { isOpen, open, close };
}

/**
 * Returns navigation actions for the command palette.
 */
export function useCommandActions() {
  const router = useRouter();
  const close  = useStore((s) => s.closeCommandPalette);
  const incidents = useStore((s) => s.incidents);

  const navigate = (path: string) => {
    router.push(path);
    close();
  };

  return {
    navigation: [
      { id: "nav-dashboard",  label: "Dashboard",         icon: "dashboard",      action: () => navigate("/dashboard") },
      { id: "nav-incidents",  label: "Incident Center",   icon: "warning",        action: () => navigate("/incidents") },
      { id: "nav-replay",     label: "Incident Replay",   icon: "play_circle",    action: () => navigate("/replay") },
      { id: "nav-copilot",    label: "AI Copilot",        icon: "psychology",     action: () => navigate("/copilot") },
      { id: "nav-postmortem", label: "Postmortems",       icon: "history_edu",    action: () => navigate("/postmortems") },
      { id: "nav-health",     label: "System Health",     icon: "monitor_heart",  action: () => navigate("/health") },
      { id: "nav-workspace",  label: "Team Workspace",    icon: "group",          action: () => navigate("/workspace") },
      { id: "nav-settings",   label: "Settings",          icon: "settings",       action: () => navigate("/settings") },
    ],
    incidents: incidents.map((inc) => ({
      id: `inc-${inc.id}`,
      label: `${inc.id}: ${inc.title}`,
      icon: "warning",
      badge: inc.severity,
      action: () => navigate(`/incidents/${inc.id}`),
    })),
    aiActions: [
      { id: "ai-rca",        label: "Run AI Root Cause Analysis",   icon: "psychology",   action: () => navigate("/copilot") },
      { id: "ai-sim",        label: "Launch Demo Scenario",          icon: "play_arrow",   action: async () => {
          try {
            const apiBase = typeof window !== 'undefined'
              ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`)
              : 'http://localhost:8000';
            await fetch(`${apiBase}/demo/trigger`, { method: "POST" });
            close();
          } catch (e) {
            console.error("Failed to trigger demo", e);
          }
      }},
      { id: "ai-postmortem", label: "Generate Postmortem",           icon: "auto_awesome", action: () => navigate("/postmortems") },
      { id: "ai-memory",     label: "View AI Memory Patterns",       icon: "memory",       action: () => navigate("/copilot") },
    ],
  };
}
