"use client";
import Link from "next/link";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

export default function TopBar() {
  const openCmdPalette = useStore((s) => s.openCommandPalette);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const incidents = useStore((s) => s.incidents);
  const activeCount = incidents.filter((i) => i.status === "active").length;

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-14 z-40 bg-rr-bg/90 backdrop-blur-md border-b border-rr-border flex items-center justify-between px-6 transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-[calc(100%-4rem)]" : "w-[calc(100%-16rem)]"
      )}
    >
      {/* Left side: Toggle + Search trigger / CMD+K */}
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

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/5 transition-colors text-rr-muted hover:text-rr-text">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>notifications</span>
          {activeCount > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rr-error rounded-full" />
          )}
        </button>

        {/* Help / Documentation */}
        <Link
          href="/docs"
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/5 transition-colors text-rr-muted hover:text-rr-text"
          title="Documentation"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>help_outline</span>
        </Link>
      </div>
    </header>
  );
}
