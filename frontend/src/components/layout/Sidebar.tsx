"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/Logo";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/dashboard",   label: "Dashboard",       icon: "dashboard" },
  { href: "/incidents",   label: "Incidents",        icon: "warning" },
  { href: "/replay",      label: "Replay",           icon: "play_circle" },
  { href: "/copilot",     label: "AI Copilot",       icon: "psychology" },
  { href: "/postmortems", label: "Postmortems",      icon: "history_edu" },
  { href: "/health",      label: "System Health",    icon: "monitor_heart" },
  { href: "/workspace",   label: "Team Workspace",   icon: "group" },
];

const BOTTOM_ITEMS = [
  { href: "/settings",    label: "Settings",         icon: "settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const incidents = useStore((s) => s.incidents);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const activeCount = incidents.filter((i) => i.status === "active" || i.status === "investigating").length;

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav
      className={cn(
        "fixed left-0 top-0 h-screen bg-rr-surface border-r border-rr-border flex flex-col z-50 shrink-0 transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-0 -translate-x-full md:w-16 md:translate-x-0" : "w-64 translate-x-0"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "border-b border-rr-border flex items-center h-14",
          sidebarCollapsed ? "justify-center px-2" : "px-5"
        )}
      >
        <Link href="/dashboard" className={cn("flex items-center min-w-0 justify-center w-full")}>
          {sidebarCollapsed ? (
            <Logo iconOnly size="md" className="filter drop-shadow-[0_0_6px_rgba(103,247,177,0.25)]" />
          ) : (
            <Logo size="navbar" className="animate-scale-in filter drop-shadow-[0_0_8px_rgba(103,247,177,0.15)] hover:drop-shadow-[0_0_12px_rgba(103,247,177,0.3)] transition-all" />
          )}
        </Link>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-3 px-2 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={sidebarCollapsed ? label : undefined}
              className={cn(
                "relative flex items-center rounded-md transition-all duration-150 group",
                sidebarCollapsed ? "justify-center px-0 py-2 h-10 w-10 mx-auto" : "gap-3 px-3 py-2 border-l-2",
                active
                  ? "bg-rr-green/10 text-rr-green border-l-rr-green shadow-[0_0_12px_rgba(103,247,177,0.06)]"
                  : "text-rr-muted hover:text-rr-text hover:bg-white/[0.04] border-l-transparent"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[18px]",
                  active ? "text-rr-green" : "text-rr-muted group-hover:text-rr-text"
                )}
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              {!sidebarCollapsed && (
                <span className="font-mono text-[12px] font-medium truncate">{label}</span>
              )}

              {/* Badges */}
              {href === "/incidents" && activeCount > 0 && (
                sidebarCollapsed ? (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rr-error animate-pulse" />
                ) : (
                  <span className="ml-auto flex items-center justify-center w-4 h-4 rounded-full bg-rr-error/20 border border-rr-error/30 font-mono text-[10px] text-rr-error animate-pulse">
                    {activeCount}
                  </span>
                )
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="p-3 border-t border-rr-border bg-rr-surface">
        {/* AI Memory Status (only when expanded) */}
        {!sidebarCollapsed && (
          <div className="bg-rr-green/5 border border-rr-green/15 rounded-md p-3 mb-3 animate-scale-in">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>
                memory
              </span>
              <span className="font-mono text-[10px] text-rr-green uppercase tracking-widest">AI Memory Active</span>
            </div>
            <div className="font-mono text-[10px] text-rr-muted leading-relaxed">
              91% similarity to INC-2023-08-12<br/>
              Repeated Redis saturation pattern
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <div className="flex flex-col gap-1">
          {BOTTOM_ITEMS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              title={sidebarCollapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-md transition-all duration-150 group border-l-2",
                sidebarCollapsed ? "justify-center px-0 py-2 h-10 w-10 mx-auto" : "gap-3 px-3 py-2",
                isActive(href)
                  ? "bg-rr-green/10 text-rr-green border-rr-green shadow-[0_0_12px_rgba(103,247,177,0.06)]"
                  : "text-rr-muted hover:text-rr-text hover:bg-white/[0.04] border-transparent"
              )}
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              {!sidebarCollapsed && (
                <span className="font-mono text-[12px] font-medium">{label}</span>
              )}
            </Link>
          ))}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={sidebarCollapsed ? "Log Out" : undefined}
            className={cn(
              "flex items-center rounded-md transition-all duration-150 group border-l-2 w-full text-left",
              sidebarCollapsed ? "justify-center px-0 py-2 h-10 w-10 mx-auto" : "gap-3 px-3 py-2 border-transparent",
              "text-rr-muted hover:text-rr-error hover:bg-rr-error/5"
            )}
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {!sidebarCollapsed && (
              <span className="font-mono text-[12px] font-medium">Log Out</span>
            )}
          </button>
        </div>

        {/* User */}
        <div
          className={cn(
            "flex items-center border-t border-rr-border mt-3 pt-3",
            sidebarCollapsed ? "justify-center" : "gap-2.5"
          )}
        >
          <div className="w-7 h-7 rounded-full bg-rr-green/20 border border-rr-green/30 flex items-center justify-center flex-shrink-0">
            <span className="font-mono text-[11px] text-rr-green font-bold">KS</span>
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 animate-scale-in">
              <div className="font-mono text-[11px] text-rr-text truncate">karan.sharma</div>
              <div className="font-mono text-[9px] text-rr-muted uppercase">SRE Lead</div>
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="w-1.5 h-1.5 rounded-full bg-rr-green animate-pulse flex-shrink-0" />
          )}
        </div>
      </div>
    </nav>
  );
}
