"use client";
import { useState } from "react";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/telemetry";

export default function IncidentHistoryPage() {
  const incidents = useStore(s => s.incidents);
  const [search, setSearch] = useState("");
  
  // Create some historical incidents
  const historical = [
    { id: "INC-7902", title: "API Gateway 502 Errors", severity: "SEV-2", service: "api-gateway", status: "resolved", startedAt: new Date("2023-10-14T09:00:00Z"), resolvedAt: new Date("2023-10-14T09:24:00Z"), aiConfidence: 89 },
    { id: "INC-7855", title: "DB Replica Lag", severity: "SEV-3", service: "db-replica-01", status: "resolved", startedAt: new Date("2023-10-10T14:30:00Z"), resolvedAt: new Date("2023-10-10T15:45:00Z"), aiConfidence: 75 },
    { id: "INC-7810", title: "Checkout Service Crash loop", severity: "SEV-1", service: "checkout-api", status: "resolved", startedAt: new Date("2023-10-02T02:15:00Z"), resolvedAt: new Date("2023-10-02T02:35:00Z"), aiConfidence: 96 },
  ];

  const allIncidents = [...incidents, ...historical as any[]];
  const filtered = allIncidents.filter(inc => inc.title.toLowerCase().includes(search.toLowerCase()) || inc.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 h-full flex flex-col bg-rr-bg overflow-hidden">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-rr-text tracking-tight">Incident History</h1>
          <p className="font-mono text-[12px] text-rr-muted mt-1">Complete record of past incidents and resolutions.</p>
        </div>
        <div className="flex bg-rr-surface border border-rr-border rounded-md p-1">
          {["7d", "30d", "90d", "All"].map(range => (
            <button key={range} className={cn("px-3 py-1 font-mono text-[11px] rounded transition-colors", range === "30d" ? "bg-rr-bg text-rr-text border border-rr-border" : "text-rr-muted hover:text-rr-text border border-transparent")}>
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
        {[
          { label: "Total Incidents", val: allIncidents.length.toString() },
          { label: "Avg MTTR", val: "14m" },
          { label: "SEV-1 Count", val: allIncidents.filter(i => i.severity === "SEV-1").length.toString() },
          { label: "AI Detection Rate", val: "94%" },
        ].map((stat, i) => (
          <div key={i} className="bg-rr-surface border border-rr-border rounded-xl p-4">
            <div className="font-mono text-[10px] text-rr-muted uppercase tracking-widest mb-1">{stat.label}</div>
            <div className="font-mono text-xl font-bold text-rr-text">{stat.val}</div>
          </div>
        ))}
      </div>

      <div className="bg-rr-surface border border-rr-border rounded-xl flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-rr-border flex gap-4">
          <div className="relative w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-rr-muted" style={{fontSize: 16}}>search</span>
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search incidents..." 
              className="w-full bg-rr-bg border border-rr-border rounded-md pl-9 pr-3 py-2 font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left relative">
            <thead className="sticky top-0 bg-rr-surface border-b border-rr-border font-mono text-[10px] text-rr-muted uppercase tracking-widest z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-normal">ID</th>
                <th className="px-4 py-3 font-normal">Severity</th>
                <th className="px-4 py-3 font-normal">Title</th>
                <th className="px-4 py-3 font-normal">Service</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Duration</th>
                <th className="px-4 py-3 font-normal text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rr-border">
              {filtered.map(inc => (
                <tr key={inc.id} className="hover:bg-white/[0.03] transition-colors group cursor-pointer" onClick={() => window.location.href = `/incidents/${inc.id}`}>
                  <td className="px-4 py-3 font-mono text-[11px] text-rr-muted group-hover:text-rr-text">{inc.id}</td>
                  <td className="px-4 py-3">
                    <span className={cn("font-mono text-[9px] px-1.5 py-0.5 rounded border", inc.severity === "SEV-1" ? "text-rr-error border-rr-error/30 bg-rr-error/10" : inc.severity === "SEV-2" ? "text-orange-400 border-orange-400/30 bg-orange-400/10" : "text-rr-warn border-rr-warn/30 bg-rr-warn/10")}>{inc.severity}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-[12px] text-rr-text">{inc.title}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-rr-muted">{inc.service}</td>
                  <td className="px-4 py-3">
                    <span className={cn("font-mono text-[10px] capitalize", inc.status === "active" ? "text-rr-error" : inc.status === "resolved" ? "text-rr-green" : "text-rr-warn")}>{inc.status}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-rr-text">{inc.duration || formatDuration(inc.startedAt, inc.resolvedAt)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-rr-muted text-right">{inc.startedAt.toISOString().split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-rr-border flex justify-between items-center font-mono text-[11px] text-rr-muted">
          <span>Showing {filtered.length} incidents</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-rr-border rounded hover:bg-white/5 disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1 border border-rr-border rounded hover:bg-white/5 disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
