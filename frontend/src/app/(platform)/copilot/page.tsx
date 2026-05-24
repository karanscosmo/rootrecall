"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · AI Copilot Chat Page
// 3-column layout: investigation sidebar | chat feed | live telemetry context
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "@/store";
import { cn, formatRelativeTime } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  confidence?: number;
  hasCode?: boolean;
  codeBlock?: string;
  actions?: { label: string; icon: string }[];
}

interface Investigation {
  id: string;
  title: string;
  incidentId: string;
  active: boolean;
  updatedAt: Date;
}

interface RecentSession {
  id: string;
  title: string;
  date: string;
  messageCount: number;
}

// We now use dynamic store data instead of hardcoded constants


const QUICK_COMMANDS = ["/logs", "/query", "/compare"] as const;
type QuickCommand = (typeof QUICK_COMMANDS)[number];

const QUICK_COMMAND_PLACEHOLDER: Record<QuickCommand, string> = {
  "/logs": "/logs checkout-api --last 10m --level ERROR",
  "/query": "/query SELECT * FROM incidents WHERE severity = 'SEV-1'",
  "/compare": "/compare INC-8241 INC-8150",
};

const AFFECTED_ENTITIES = [
  { name: "checkout-api", status: "critical" as const, latency: "5200 ms" },
  { name: "auth-service", status: "degraded" as const, latency: "420 ms" },
  { name: "cache-cluster-02", status: "critical" as const, latency: "OOM" },
  { name: "api-gateway", status: "healthy" as const, latency: "18 ms" },
];

// Seed messages are now generated dynamically based on active context

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: "healthy" | "degraded" | "critical" }) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full flex-shrink-0",
        status === "healthy" && "bg-rr-green",
        status === "degraded" && "bg-rr-warn",
        status === "critical" && "bg-rr-error animate-pulse"
      )}
    />
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-rr-green/60"
          style={{
            animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function AiPsychologyIcon() {
  return (
    <div className="w-7 h-7 rounded-full bg-rr-green/10 border border-rr-green/30 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-rr-green">
        <path d="M21 8c-1.45 0-2.26 1.44-1.93 2.51l-3.55 3.56c-.3-.09-.74-.09-1.04 0l-2.55-2.55C12.26 10.44 11.45 9 10 9c-1.45 0-2.26 1.44-1.93 2.52l-4.56 4.55C2.44 15.74 1 16.55 1 18c0 1.1.9 2 2 2 1.45 0 2.26-1.44 1.93-2.52l4.55-4.55c.3.09.74.09 1.04 0l2.55 2.55C12.74 16.56 13.55 18 15 18c1.45 0 2.26-1.44 1.93-2.51l3.56-3.56c1.06.33 2.51-.48 2.51-1.93 0-1.1-.9-2-2-2z" />
      </svg>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <div className="mt-2 rounded-md border border-rr-border bg-rr-bg overflow-x-auto">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-rr-border">
        <span className="text-[10px] text-rr-muted font-mono uppercase tracking-wider">
          Log Output
        </span>
        <div className="flex gap-1 ml-auto">
          {["w-2 h-2 rounded-full bg-red-500/50", "w-2 h-2 rounded-full bg-yellow-500/50", "w-2 h-2 rounded-full bg-green-500/50"].map(
            (cls, i) => <span key={i} className={cls} />
          )}
        </div>
      </div>
      <div className="p-3 font-mono text-[11px] leading-relaxed space-y-0.5">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre">
            {line.includes("ERROR") ? (
              <span className="text-rr-error">{line}</span>
            ) : line.includes("WARN") ? (
              <span className="text-rr-warn">{line}</span>
            ) : line.includes("INFO") ? (
              <span className="text-rr-green/80">{line}</span>
            ) : (
              <span className="text-rr-muted">{line}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatMessageBubble({
  message,
  isLoading,
}: {
  message: ChatMessage;
  isLoading?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] text-right">
          <div className="inline-block text-left bg-rr-surface border border-rr-border rounded-lg rounded-tr-none px-4 py-2.5">
            <p className="text-sm text-rr-text leading-relaxed">{message.content}</p>
          </div>
          <p className="text-[10px] text-rr-muted mt-1 pr-1">
            {formatRelativeTime(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div className="flex items-start gap-2.5 mb-4">
      <AiPsychologyIcon />
      <div className="flex-1 min-w-0">
        {/* Confidence badge */}
        {message.confidence !== undefined && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] text-rr-muted font-mono">Copilot</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rr-green/10 text-rr-green border border-rr-green/20 tracking-wide">
              Confidence: {message.confidence}%
            </span>
          </div>
        )}

        {/* Bubble */}
        <div className="bg-rr-surface border border-rr-border rounded-lg rounded-tl-none px-4 py-2.5">
          {isLoading ? (
            <TypingIndicator />
          ) : (
            <>
              {/* Render content with basic bold markdown */}
              <div className="text-sm text-rr-text leading-relaxed space-y-1">
                {message.content.split("\n\n").map((para, i) => (
                  <p key={i} className="text-sm text-rr-text leading-relaxed">
                    {para.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                      part.startsWith("**") && part.endsWith("**") ? (
                        <strong key={j} className="text-rr-green font-semibold">
                          {part.slice(2, -2)}
                        </strong>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                  </p>
                ))}
              </div>

              {/* Code block */}
              {message.hasCode && message.codeBlock && (
                <CodeBlock code={message.codeBlock} />
              )}

              {/* Action buttons */}
              {message.actions && message.actions.length > 0 && (
                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-rr-border">
                  {message.actions.map((action) => (
                    <button
                      key={action.label}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rr-border text-[11px] text-rr-muted hover:text-rr-green hover:border-rr-green/40 transition-all"
                    >
                      {action.icon === "chart" ? (
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                        </svg>
                      )}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <p className="text-[10px] text-rr-muted mt-1 pl-0.5">
          {formatRelativeTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CopilotPage() {
  const incidents = useStore((s) => s.incidents);
  const services = useStore((s) => s.services);
  const aiMemories = useStore((s) => s.aiMemories);
  const selectedIncidentId = useStore((s) => s.selectedIncidentId);
  const selectIncident = useStore((s) => s.selectIncident);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Use active incident or fallback to first one if any
  const contextIncident = incidents.find(i => i.id === selectedIncidentId) || 
                          incidents.find(i => i.status === "active") || 
                          incidents[0];

  // Dynamic initial messages
  const initialMessages: ChatMessage[] = contextIncident ? [
    {
      id: "msg-1",
      role: "user",
      content: `What's the status of ${contextIncident.id}?`,
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: "msg-2",
      role: "ai",
      content: `I'm analyzing ${contextIncident.id} (${contextIncident.title}).\n\n**Current Status:** ${contextIncident.status.toUpperCase()}\n**Affected Services:** ${(contextIncident.affectedServices || [contextIncident.service || 'Unknown']).join(', ')}\n\n${contextIncident.rootCause ? `**Root Cause Analysis:** ${contextIncident.rootCause}` : 'I am currently correlating logs and metrics to determine the root cause.'}`,
      timestamp: new Date(),
      confidence: contextIncident.aiConfidence,
    }
  ] : [];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  const adjustTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, []);

  useEffect(() => {
    adjustTextarea();
  }, [input, adjustTextarea]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-u`,
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      // Simulate AI response delay
      await new Promise((r) => setTimeout(r, 1200));
      
      const currentMetrics = useStore.getState().metrics;
      const lastMetric = currentMetrics[currentMetrics.length - 1];
      const p99 = lastMetric?.latencyP99.toFixed(0) || "45";
      
      // Dynamic response based on context
      let aiContent = "I am tracking live telemetry. Currently, P99 latency is at " + p99 + "ms.";
      let conf = 85;
      
      if (trimmed.toLowerCase().includes("pattern") || trimmed.toLowerCase().includes("history")) {
        const memory = aiMemories[0];
        aiContent = memory ? `I found a matching pattern (${memory.similarity}% similar): **${memory.description}**.\n\nRecommendation: ${memory.recommendation}` : "No historical patterns match this current behavior.";
        conf = memory?.similarity || 70;
      } else if (trimmed.toLowerCase().includes("scale") || trimmed.toLowerCase().includes("remediate")) {
        aiContent = `Based on the current load, I recommend scaling the affected services.\n\nExecute the following command to mitigate:`;
        conf = 95;
      } else if (contextIncident) {
        aiContent = `Regarding ${contextIncident.id}: The incident is currently ${contextIncident.status}. The primary impact is ${contextIncident.impact}. \n\nP99 latency across the system is reading ${p99}ms.`;
        conf = contextIncident.aiConfidence;
      }

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "ai",
        content: aiContent,
        timestamp: new Date(),
        confidence: conf,
        codeBlock: trimmed.toLowerCase().includes("scale") ? `kubectl scale deploy/${contextIncident?.service || 'api-gateway'} --replicas=10` : undefined,
        actions: [
          { label: "View Live Metrics", icon: "chart" },
          { label: "View Associated Logs", icon: "file" },
        ],
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    },
    [isLoading, contextIncident, aiMemories]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const applyQuickCommand = (cmd: QuickCommand) => {
    setInput(QUICK_COMMAND_PLACEHOLDER[cmd]);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ── Left: Investigation Sidebar ─────────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 border-r border-rr-border bg-rr-surface flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-rr-border flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-rr-text tracking-tight">
            Active Context
          </h2>
          <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-rr-green/10 border border-rr-green/30 text-rr-green text-[10px] font-semibold hover:bg-rr-green/20 transition-colors">
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            New
          </button>
        </div>

        {/* Active Investigations */}
        <div className="p-3 border-b border-rr-border">
          <p className="text-[10px] text-rr-muted uppercase tracking-widest mb-2">
            Active Investigations
          </p>
          <div className="space-y-1.5">
            {incidents.slice(0, 3).map((inv) => {
              const isActive = inv.id === contextIncident?.id;
              return (
              <div
                key={inv.id}
                onClick={() => selectIncident(inv.id)}
                className={cn(
                  "flex flex-col gap-0.5 px-3 py-2 rounded-md border cursor-pointer transition-all",
                  isActive
                    ? (inv.status === "active" ? "border-l-2 border-l-rr-error border-rr-border bg-rr-error/5 hover:bg-rr-error/10" : "border-l-2 border-l-rr-green border-rr-border bg-rr-surface")
                    : "border-transparent hover:bg-rr-bg border-rr-border/50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-rr-text truncate">
                    {inv.title}
                  </span>
                  {inv.status === "active" && (
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-rr-error animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] text-rr-muted font-mono">
                  {inv.id} · {inv.status}
                </span>
              </div>
            )})}
          </div>
        </div>

        {/* Recent sessions (Using resolved incidents) */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[10px] text-rr-muted uppercase tracking-widest mb-2">
            Historical Context
          </p>
          <div className="space-y-1">
            {incidents.filter(i => i.status === "resolved").slice(0, 5).map((ses) => (
              <div
                key={ses.id}
                onClick={() => selectIncident(ses.id)}
                className="flex items-start justify-between gap-2 px-3 py-2 rounded-md hover:bg-rr-bg cursor-pointer transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] text-rr-text truncate">{ses.title}</span>
                  <span className="text-[10px] text-rr-muted">{ses.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Memory panel */}
        <div className="p-3 border-t border-rr-border bg-rr-bg/50">
          <div className="flex items-center gap-2 mb-2">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-rr-green flex-shrink-0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <h2 className="text-[10px] uppercase font-bold tracking-widest text-rr-green">
              Active AI Pattern
            </h2>
          </div>
          {aiMemories[0] ? (
            <div className="space-y-2">
              <p className="text-[11px] text-rr-text leading-snug">
                {aiMemories[0].description}
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rr-surface border border-rr-border text-rr-muted font-mono">
                  Confidence {aiMemories[0].similarity}%
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rr-surface border border-rr-border text-rr-muted font-mono">
                  Seen {aiMemories[0].occurrences}x
                </span>
                {aiMemories[0].relatedIncidents.slice(0, 1).map((inc: string) => (
                  <span
                    key={inc}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-rr-green/10 border border-rr-green/20 text-rr-green font-mono"
                  >
                    {inc}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-rr-muted">No matching patterns found.</p>
          )}
        </div>
      </aside>

      {/* ── Center: Chat ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative bg-transparent min-w-0 overflow-hidden">
        {/* Message feed */}
        <div className="flex-1 overflow-y-auto p-6 pb-2">
          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-start gap-2.5 mb-4">
              <AiPsychologyIcon />
              <div className="bg-rr-surface border border-rr-border rounded-lg rounded-tl-none">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* ── Command Bar (sticky bottom) ────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-rr-border px-4 pt-3 pb-4 bg-gradient-to-t from-rr-bg via-rr-bg to-transparent">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {/* Textarea + Send row */}
            <div className="flex items-end gap-2 bg-rr-surface border border-rr-border rounded-xl px-3 py-2 focus-within:border-rr-green/50 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask Copilot to analyze logs, compare incidents, or run queries..."
                className="flex-1 resize-none bg-transparent text-sm text-rr-text placeholder:text-rr-muted focus:outline-none leading-relaxed min-h-[24px] max-h-[160px]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  input.trim() && !isLoading
                    ? "bg-rr-green text-rr-bg hover:opacity-90 active:scale-95"
                    : "bg-rr-surface text-rr-muted border border-rr-border cursor-not-allowed"
                )}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
                Send
              </button>
            </div>

            {/* Quick command buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-rr-muted mr-0.5">Quick:</span>
              {QUICK_COMMANDS.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => applyQuickCommand(cmd)}
                  className="px-2 py-0.5 rounded border border-rr-border text-[11px] font-mono text-rr-muted hover:text-rr-green hover:border-rr-green/40 transition-all bg-rr-surface/50"
                >
                  {cmd}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-rr-muted">
                Shift+Enter for new line
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* ── Right: Live Telemetry Context ──────────────────────────────────── */}
      <aside className="w-80 flex-shrink-0 border-l border-rr-border bg-rr-surface flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-rr-border">
          <h2 className="text-xs font-semibold text-rr-text tracking-tight flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rr-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rr-green"></span>
            </span>
            Live Telemetry Context
          </h2>
          <p className="text-[10px] text-rr-muted mt-1 font-mono">
            {contextIncident ? contextIncident.id : 'No active incident'} · Auto-updating
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Affected Entities */}
          <div>
            <h3 className="text-[10px] uppercase font-bold tracking-widest text-rr-muted mb-3 flex justify-between items-center">
              Affected Services
              <span className="bg-rr-error/10 text-rr-error px-1.5 py-0.5 rounded text-[9px]">
                {contextIncident?.affectedServices?.length || 0} Critical
              </span>
            </h3>
            <div className="space-y-2">
              {(contextIncident?.affectedServices || [contextIncident?.service || 'Unknown']).map((svcName) => {
                const svc = services.find(s => s.id === svcName || s.name === svcName);
                const status = svc?.status || "critical";
                return (
                <div
                  key={svcName}
                  className="flex items-center justify-between p-2 rounded border border-rr-border bg-rr-bg/50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        status === "critical"
                          ? "bg-rr-error animate-pulse"
                          : status === "degraded"
                          ? "bg-orange-500"
                          : "bg-rr-green"
                      )}
                    />
                    <span className="text-[11px] font-mono text-rr-text">
                      {svcName}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-mono",
                      status === "critical" ? "text-rr-error" : "text-rr-muted"
                    )}
                  >
                    {svc?.latency || 'N/A'} ms
                  </span>
                </div>
              )})}
            </div>
          </div>

          {/* Current incident context card */}
          <div>
            <p className="text-[10px] text-rr-muted uppercase tracking-widest mb-2">
              Incident Context
            </p>
            {contextIncident && (
              <div className="rounded-lg border border-rr-border bg-rr-bg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-semibold text-rr-text leading-snug">
                    {contextIncident.title || "Diagnosing Anomaly..."}
                  </span>
                  <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rr-error/10 text-rr-error border border-rr-error/20">
                    {contextIncident.severity || "SEV-1"}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-rr-muted">Status</span>
                    <span className="text-[10px] font-semibold text-rr-error uppercase">
                      {contextIncident.status || "active"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-rr-muted">AI Confidence</span>
                    <span className="text-[10px] font-mono text-rr-green">
                      {contextIncident.aiConfidence !== undefined && contextIncident.aiConfidence !== null
                        ? `${contextIncident.aiConfidence}%`
                        : "Analyzing..."}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-rr-muted">Services</span>
                    <span className="text-[10px] font-mono text-rr-muted">
                      {contextIncident.affectedServices ? `${contextIncident.affectedServices.length} affected` : "1 affected"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-rr-muted leading-relaxed border-t border-rr-border pt-2">
                  {contextIncident.impact || "AI Copilot is correlating telemetry events..."}
                </p>
              </div>
            )}
          </div>

          {/* Context being used hint */}
          <div className="rounded-md border border-rr-border bg-rr-bg/50 p-2.5">
            <p className="text-[10px] text-rr-muted uppercase tracking-wider mb-1.5">
              Copilot Context Window
            </p>
            <div className="space-y-1">
              {[
                { label: "Last 15 min logs", active: true },
                { label: "INC-8241 telemetry", active: true },
                { label: "AI Memory patterns", active: true },
                { label: "Deploy history", active: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      item.active ? "bg-rr-green" : "bg-rr-muted/30"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px]",
                      item.active ? "text-rr-text" : "text-rr-muted/50"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
