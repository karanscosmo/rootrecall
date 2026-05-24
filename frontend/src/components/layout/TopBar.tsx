"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

export default function TopBar() {
  const openCmdPalette    = useStore((s) => s.openCommandPalette);
  const sidebarCollapsed  = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar     = useStore((s) => s.toggleSidebar);
  const incidents         = useStore((s) => s.incidents);
  const activeCount       = incidents.filter((i) => i.status === "active").length;
  const activeIncidents   = incidents.filter((i) => i.status === "active").slice(0, 5);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notification panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-14 z-40 bg-rr-bg/90 backdrop-blur-md border-b border-rr-border flex items-center justify-between px-6 transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-[calc(100%-4rem)]" : "w-[calc(100%-16rem)]"
      )}
    >
      {/* Left side: Toggle + Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-rr-border bg-rr-surface text-rr-muted hover:text-rr-green hover:border-rr-green/30 transition-all cursor-pointer"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <span className="material-symbols-outlined text-[18px]">
            {sidebarCollapsed ? "menu" : "menu_open"}
          </span>
        </button>

        <button
          onClick={openCmdPalette}
          className="flex items-center gap-2.5 px-3 py-1.5 bg-rr-surface border border-rr-border rounded-md hover:border-rr-green/30 transition-colors group"
        >
          <span className="material-symbols-outlined text-rr-muted group-hover:text-rr-green transition-colors" style={{ fontSize: 16 }}>
            search
          </span>
          <span className="font-mono text-[11px] text-rr-muted">Search incidents, logs, services...</span>
          <span className="ml-2 font-mono text-[10px] text-rr-muted/60 bg-rr-border px-1.5 py-0.5 rounded border border-rr-border/60">⌘K</span>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* System status */}
        {activeCount > 0 ? (
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-rr-error">
            <span className="w-1.5 h-1.5 rounded-full bg-rr-error animate-pulse" />
            {activeCount} Active Incident{activeCount > 1 ? "s" : ""}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-rr-green">
            <span className="w-1.5 h-1.5 rounded-full bg-rr-green animate-pulse" />
            All Systems Operational
          </div>
        )}

        <div className="w-px h-5 bg-rr-border" />

        {/* ── Notifications Bell ── */}
        <div ref={notifRef} className="relative">
          <button
            id="topbar-notifications"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/5 transition-colors text-rr-muted hover:text-rr-text"
            title="Notifications"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>notifications</span>
            {activeCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rr-error rounded-full border border-rr-bg" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div className="absolute top-10 right-0 w-80 bg-rr-surface border border-rr-border rounded-xl shadow-2xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-rr-border">
                <span className="font-mono text-[11px] text-rr-muted uppercase tracking-widest">Notifications</span>
                {activeCount > 0 && (
                  <span className="font-mono text-[10px] text-rr-error bg-rr-error/10 px-2 py-0.5 rounded-full border border-rr-error/20">
                    {activeCount} active
                  </span>
                )}
              </div>

              {/* Items */}
              <div className="max-h-72 overflow-y-auto">
                {activeIncidents.length > 0 ? (
                  activeIncidents.map((inc) => (
                    <Link
                      key={inc.id}
                      href={`/incidents/${inc.id}`}
                      onClick={() => setNotifOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 border-b border-rr-border/50 transition-colors group"
                    >
                      <span className="w-2 h-2 rounded-full bg-rr-error mt-1.5 shrink-0 animate-pulse" />
                      <div className="min-w-0">
                        <div className="font-mono text-[12px] text-rr-text truncate group-hover:text-rr-green transition-colors">
                          {inc.title}
                        </div>
                        <div className="font-mono text-[10px] text-rr-muted mt-0.5">
                          {inc.service} · SEV-{inc.severity}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-rr-muted group-hover:text-rr-green transition-colors shrink-0 mt-0.5" style={{ fontSize: 14 }}>
                        chevron_right
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-mono text-[12px] text-rr-muted">All systems operational</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-rr-border bg-rr-bg/40">
                <Link
                  href="/incidents"
                  onClick={() => setNotifOpen(false)}
                  className="font-mono text-[11px] text-rr-muted hover:text-rr-green transition-colors"
                >
                  View all incidents →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Docs Button ── */}
        <Link
          id="topbar-docs"
          href="/docs"
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/5 transition-colors text-rr-muted hover:text-rr-text"
          title="Documentation"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>book_2</span>
        </Link>
      </div>
    </header>
  );
}
