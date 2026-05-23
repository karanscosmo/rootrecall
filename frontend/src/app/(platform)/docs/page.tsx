"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "rocket_launch",
    content: (
      <div className="space-y-4">
        <p className="text-[13px] text-rr-muted leading-relaxed">
          RootRecall is an autonomous, AI-native operational intelligence platform. It acts as an SRE copilot by monitoring telemetry events, automatically detecting incident root causes, generating cinematic replays, and authoring postmortems.
        </p>
        <div className="bg-rr-surface border border-rr-border rounded-lg p-4 space-y-3">
          <h4 className="font-mono text-[11px] uppercase tracking-wider text-rr-green">Quick Local Run</h4>
          <p className="font-mono text-[11px] text-rr-muted leading-relaxed">
            To start the backend telemetry simulation and API server:
          </p>
          <pre className="bg-black/40 border border-rr-border rounded px-3 py-2 font-mono text-[11px] text-rr-text overflow-x-auto">
{`cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000`}
          </pre>
          <p className="font-mono text-[11px] text-rr-muted leading-relaxed">
            To start the frontend dashboard workspace:
          </p>
          <pre className="bg-black/40 border border-rr-border rounded px-3 py-2 font-mono text-[11px] text-rr-text overflow-x-auto">
{`cd frontend
npm install
npm run dev`}
          </pre>
        </div>
      </div>
    ),
  },
  {
    id: "architecture",
    title: "System Architecture",
    icon: "schema",
    content: (
      <div className="space-y-4">
        <p className="text-[13px] text-rr-muted leading-relaxed">
          RootRecall uses a decoupled architecture where the UI listens to live SRE events and coordinates with python-based automated telemetry simulators.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-rr-border rounded-lg p-3 bg-rr-surface/40">
            <h5 className="font-mono text-[11px] text-rr-text uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rr-green" /> FastAPI Ingestion Layer
            </h5>
            <p className="font-mono text-[11px] text-rr-muted leading-relaxed">
              Handles authentication fallbacks, seeds standard incident databases, runs active telemetry loops, and maintains a WebSocket event stream at <code className="text-rr-green bg-rr-green/10 px-1 rounded">/ws/telemetry</code>.
            </p>
          </div>
          <div className="border border-rr-border rounded-lg p-3 bg-rr-surface/40">
            <h5 className="font-mono text-[11px] text-rr-text uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rr-blue" /> Next.js Workspace
            </h5>
            <p className="font-mono text-[11px] text-rr-muted leading-relaxed">
              Maintains user onboarding, dashboard views, settings toggles, interactive topology canvas renderers, and instant command palettes.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "simulation",
    title: "Anomaly Simulation Engine",
    icon: "play_arrow",
    content: (
      <div className="space-y-4">
        <p className="text-[13px] text-rr-muted leading-relaxed">
          The background server maintains an active simulation engine demonstrating live microservice metrics degradation:
        </p>
        <ul className="space-y-2.5 font-mono text-[11px] text-rr-muted pl-4 list-disc">
          <li>
            <strong className="text-rr-text">Healthy State:</strong> Normal throughput and P99 latency levels. All node indicators render green.
          </li>
          <li>
            <strong className="text-rr-text">Anomaly Trigger:</strong> A code deployment introduces memory saturation or unindexed queries.
          </li>
          <li>
            <strong className="text-rr-text">AI Diagnosis:</strong> Heuristic engines match logs against historical memories, raising confidence indicators.
          </li>
          <li>
            <strong className="text-rr-text">Remediation Loop:</strong> If settings toggle Auto-Remediation to true, the system restores the backup deployment environment automatically.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "replay",
    title: "Incident Replay Canvas",
    icon: "play_circle",
    content: (
      <div className="space-y-4">
        <p className="text-[13px] text-rr-muted leading-relaxed">
          The Replay System allows engineers to go back in time to analyze microservice failure sequences:
        </p>
        <div className="bg-rr-surface border border-rr-border rounded-lg p-4 space-y-3">
          <h4 className="font-mono text-[11px] uppercase tracking-wider text-rr-green">Topology Navigation</h4>
          <p className="font-mono text-[11px] text-rr-muted leading-relaxed">
            Drag the time slider to witness traffic redirection, server error spikes, and Redis connection pool saturation events as they occurred in milliseconds.
          </p>
        </div>
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState(SECTIONS[0].id);

  const activeSection = SECTIONS.find((s) => s.id === activeTab) ?? SECTIONS[0];

  return (
    <div className="min-h-full bg-transparent p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>menu_book</span>
          <h1 className="font-mono text-headline-md text-rr-text tracking-tight animate-fade-in">
            Platform Documentation
          </h1>
        </div>
        <p className="font-mono text-[12px] text-rr-muted pl-9">
          Learn how to deploy, monitor, and configure the RootRecall AI operational intelligence ecosystem.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 bg-rr-surface border border-rr-border rounded-lg p-3 flex flex-col gap-1.5">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveTab(sec.id)}
              className={cn(
                "w-full text-left font-mono text-[12px] px-3.5 py-2.5 rounded-md transition-all flex items-center gap-2.5",
                activeTab === sec.id
                  ? "bg-rr-green/10 text-rr-green border border-rr-green/20 font-bold"
                  : "text-rr-muted hover:text-rr-text hover:bg-white/[0.02]"
              )}
            >
              <span className="material-symbols-outlined text-[16px]">{sec.icon}</span>
              {sec.title}
            </button>
          ))}
        </div>

        {/* Content Viewer */}
        <div className="lg:col-span-3 bg-rr-surface border border-rr-border rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-rr-border pb-4">
            <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 20 }}>{activeSection.icon}</span>
            <h2 className="text-xl font-bold tracking-tight text-rr-text">{activeSection.title}</h2>
          </div>

          <div className="animate-fade-in">
            {activeSection.content}
          </div>
        </div>
      </div>
    </div>
  );
}
