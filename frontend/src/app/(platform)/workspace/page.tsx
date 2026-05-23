"use client";
import { cn } from "@/lib/utils";

export default function WorkspacePage() {
  return (
    <div className="flex h-full bg-transparent">
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-rr-text tracking-tight">Team Workspace</h1>
          <button className="bg-rr-green text-rr-bg font-mono text-[12px] font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
            Invite Member
          </button>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="font-mono text-[11px] text-rr-muted uppercase tracking-widest mb-4">Active Members</h2>
            <div className="bg-rr-surface border border-rr-border rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-rr-bg border-b border-rr-border font-mono text-[10px] text-rr-muted uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3 font-normal">Member</th>
                    <th className="px-4 py-3 font-normal">Status</th>
                    <th className="px-4 py-3 font-normal">Current Focus</th>
                    <th className="px-4 py-3 font-normal text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rr-border">
                  {[
                    { name: "Alex Kumar", initials: "AK", role: "SRE Lead", status: "online", focus: "Investigating INC-8241", lastActive: "just now" },
                    { name: "Maya Patel", initials: "MP", role: "DevOps Engineer", status: "online", focus: "Reviewing deploy DEP-2841", lastActive: "just now" },
                    { name: "Sam Rivera", initials: "SR", role: "SRE Engineer", status: "online", focus: "Monitoring system health", lastActive: "5m ago" },
                    { name: "Jordan Lee", initials: "JL", role: "Platform Engineer", status: "offline", focus: "-", lastActive: "2h ago" },
                  ].map((member, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold", member.status === "online" ? "bg-rr-green/20 text-rr-green" : "bg-rr-surface border border-rr-border text-rr-muted")}>
                            {member.initials}
                          </div>
                          <div>
                            <div className="font-medium text-[13px] text-rr-text">{member.name}</div>
                            <div className="font-mono text-[10px] text-rr-muted">{member.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", member.status === "online" ? "bg-rr-green animate-pulse" : "bg-rr-muted")} />
                          <span className="font-mono text-[11px] text-rr-text capitalize">{member.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-rr-text">{member.focus}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-rr-muted text-right">{member.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-mono text-[11px] text-rr-muted uppercase tracking-widest mb-4">Recent Activity Feed</h2>
            <div className="bg-rr-surface border border-rr-border rounded-xl p-6">
              <div className="space-y-6">
                {[
                  { text: "Alex assigned INC-8241", time: "10m ago", icon: "person_add" },
                  { text: "Maya generated postmortem for INC-8150", time: "1h ago", icon: "auto_awesome" },
                  { text: "Jordan reviewed replay for INC-8180", time: "2h ago", icon: "play_circle" },
                ].map((act, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-rr-bg border border-rr-border flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-rr-muted" style={{ fontSize: 16 }}>{act.icon}</span>
                    </div>
                    <div>
                      <div className="font-mono text-[12px] text-rr-text">{act.text}</div>
                      <div className="font-mono text-[10px] text-rr-muted mt-1">{act.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="w-80 border-l border-rr-border bg-rr-surface p-6 overflow-y-auto space-y-6 shrink-0">
        <section>
          <h2 className="font-mono text-[11px] text-rr-muted uppercase tracking-widest mb-3">On-Call Schedule</h2>
          <div className="bg-rr-bg border border-rr-green rounded-lg p-4 mb-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-rr-green opacity-10 rounded-bl-full" />
            <div className="font-mono text-[10px] text-rr-green uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rr-green animate-pulse" /> Current On-Call
            </div>
            <div className="font-medium text-[14px] text-rr-text">Alex Kumar</div>
            <div className="font-mono text-[11px] text-rr-muted mt-1">Primary · Ends in 2d 14h</div>
          </div>
          
          <div className="space-y-3">
            {[
              { name: "Maya Patel", role: "Secondary", time: "Current" },
              { name: "Sam Rivera", role: "Primary", time: "Next (Nov 15)" },
              { name: "Jordan Lee", role: "Secondary", time: "Next (Nov 15)" },
            ].map((oc, i) => (
              <div key={i} className="flex items-center justify-between text-[12px]">
                <div>
                  <div className="font-medium text-rr-text">{oc.name}</div>
                  <div className="font-mono text-[10px] text-rr-muted mt-0.5">{oc.role}</div>
                </div>
                <div className="font-mono text-[10px] text-rr-muted">{oc.time}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-mono text-[11px] text-rr-muted uppercase tracking-widest mb-3">Team Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-rr-bg border border-rr-border rounded-lg p-3">
              <div className="font-mono text-[10px] text-rr-muted uppercase mb-1">Incidents</div>
              <div className="font-mono text-lg font-bold text-rr-text">12</div>
              <div className="font-mono text-[9px] text-rr-error mt-1">↑ 2 from last wk</div>
            </div>
            <div className="bg-rr-bg border border-rr-border rounded-lg p-3">
              <div className="font-mono text-[10px] text-rr-muted uppercase mb-1">Avg MTTR</div>
              <div className="font-mono text-lg font-bold text-rr-text">14m</div>
              <div className="font-mono text-[9px] text-rr-green mt-1">↓ 4m from last wk</div>
            </div>
            <div className="bg-rr-bg border border-rr-border rounded-lg p-3 col-span-2 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] text-rr-muted uppercase mb-1">Postmortems</div>
                <div className="font-mono text-lg font-bold text-rr-text">8</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-rr-green/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 20 }}>auto_awesome</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
