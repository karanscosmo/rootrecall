"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ── Per-service config ─────────────────────────────────────────────────────
const SERVICES = [
  {
    id: "kubernetes",
    name: "Kubernetes",
    icon: "dns",
    color: "text-blue-400",
    fields: [
      { key: "endpoint",    label: "Cluster API Endpoint",  placeholder: "https://your-cluster.example.com", type: "text" },
      { key: "namespace",   label: "Namespace",              placeholder: "production",                        type: "text" },
      { key: "token",       label: "Service Account Token",  placeholder: "eyJhbGciOiJS...",                   type: "password" },
    ],
    oauthLabel: null,
  },
  {
    id: "aws",
    name: "AWS",
    icon: "cloud",
    color: "text-orange-400",
    fields: [
      { key: "access_key",  label: "Access Key ID",          placeholder: "AKIAIOSFODNN7EXAMPLE",  type: "text" },
      { key: "secret_key",  label: "Secret Access Key",      placeholder: "wJalrXUtnFEMI/K7...",   type: "password" },
      { key: "region",      label: "Region",                 placeholder: "us-east-1",              type: "text" },
    ],
    oauthLabel: null,
  },
  {
    id: "datadog",
    name: "Datadog",
    icon: "monitoring",
    color: "text-purple-400",
    fields: [
      { key: "api_key",     label: "API Key",                placeholder: "dd_api_xxxxxxxxxxxxxxxx", type: "password" },
      { key: "app_key",     label: "Application Key",        placeholder: "dd_app_xxxxxxxxxxxxxxxx", type: "password" },
      { key: "site",        label: "Datadog Site",           placeholder: "datadoghq.com",           type: "text" },
    ],
    oauthLabel: null,
  },
  {
    id: "pagerduty",
    name: "PagerDuty",
    icon: "notifications_active",
    color: "text-green-400",
    fields: [
      { key: "api_token",   label: "REST API Token",         placeholder: "u+_R1xxxxxxxxxxxxxxxxxx",  type: "password" },
      { key: "service_id",  label: "Service ID (optional)",  placeholder: "P1234AB",                  type: "text" },
      { key: "escalation",  label: "Escalation Policy ID",   placeholder: "E1234AB",                  type: "text" },
    ],
    oauthLabel: null,
  },
  {
    id: "github",
    name: "GitHub",
    icon: "code",
    color: "text-white",
    fields: [
      { key: "token",       label: "Personal Access Token",  placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx", type: "password" },
      { key: "org",         label: "Organization / Owner",   placeholder: "karanscosmo",              type: "text" },
      { key: "repo",        label: "Repository (optional)",  placeholder: "rootrecall",               type: "text" },
    ],
    oauthLabel: "Connect with GitHub OAuth",
  },
  {
    id: "slack",
    name: "Slack",
    icon: "forum",
    color: "text-yellow-400",
    fields: [
      { key: "webhook",     label: "Incoming Webhook URL",   placeholder: "https://hooks.slack.com/services/T.../B.../...", type: "text" },
      { key: "channel",     label: "Alert Channel",          placeholder: "#incidents",               type: "text" },
      { key: "bot_token",   label: "Bot Token (optional)",   placeholder: "xoxb-xxxxxxxxxxxx",        type: "password" },
    ],
    oauthLabel: "Connect with Slack OAuth",
  },
];

type ServiceId = typeof SERVICES[number]["id"];
type Status = "idle" | "connecting" | "connected" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────
const getApiBase = () =>
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? `http://${window.location.hostname}:8000` : "");

async function postSetting(key: string, value: string) {
  const base = getApiBase();
  if (!base) return;
  try {
    await fetch(`${base}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  } catch {
    // Backend unreachable — fail silently, continue onboarding
  }
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Per-service state
  const [statuses, setStatuses]       = useState<Record<ServiceId, Status>>({} as Record<ServiceId, Status>);
  const [modalSvc, setModalSvc]       = useState<typeof SERVICES[number] | null>(null);
  const [formValues, setFormValues]   = useState<Record<string, string>>({});
  const [formError, setFormError]     = useState("");

  // Alert threshold state (step 3)
  const [latencyThreshold, setLatencyThreshold] = useState(2000);
  const [errorThreshold,   setErrorThreshold]   = useState(5);
  const [channels, setChannels] = useState<Record<string, boolean>>({
    slack:      true,
    pagerduty:  true,
    email:      true,
  });

  const getStatus = (id: ServiceId): Status => statuses[id] ?? "idle";

  const openModal = (svc: typeof SERVICES[number]) => {
    if (getStatus(svc.id) === "connected") return;
    setFormValues({});
    setFormError("");
    setModalSvc(svc);
  };

  const closeModal = () => setModalSvc(null);

  const handleConnect = async () => {
    if (!modalSvc) return;
    // Validate all fields filled
    const missing = modalSvc.fields.filter(f => !formValues[f.key]?.trim());
    if (missing.length > 0) {
      setFormError(`Please fill in: ${missing.map(f => f.label).join(", ")}`);
      return;
    }
    setFormError("");
    setStatuses(s => ({ ...s, [modalSvc.id]: "connecting" }));
    closeModal();
    // Simulate async handshake (1.5s)
    await new Promise(r => setTimeout(r, 1500));
    setStatuses(s => ({ ...s, [modalSvc.id]: "connected" }));
  };

  const handleOAuth = async (svc: typeof SERVICES[number]) => {
    setStatuses(s => ({ ...s, [svc.id]: "connecting" }));
    closeModal();
    await new Promise(r => setTimeout(r, 2000));
    setStatuses(s => ({ ...s, [svc.id]: "connected" }));
  };

  const nextStep = async () => {
    // On step 3 → save alert config to backend
    if (step === 3) {
      await Promise.all([
        postSetting("p99_latency_threshold_ms",   String(latencyThreshold)),
        postSetting("error_rate_threshold_pct",   String(errorThreshold)),
        postSetting("notify_slack",               String(channels.slack)),
        postSetting("notify_pagerduty",           String(channels.pagerduty)),
        postSetting("notify_email",               String(channels.email)),
        postSetting("integrations_connected",     connectedCount.toString()),
      ]);
    }
    if (step === 4) {
      setLoading(true);
      await new Promise(r => setTimeout(r, 1200));
      window.location.href = "/dashboard";
      return;
    }
    setStep(s => s + 1);
  };

  const connectedCount = SERVICES.filter(s => getStatus(s.id) === "connected").length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-rr-bg p-6 relative">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "radial-gradient(rgba(103,247,177,1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="w-full max-w-xl relative z-10">
        {/* Step dots */}
        <div className="flex justify-center gap-3 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className={cn("w-2 h-2 rounded-full transition-colors", step >= i ? "bg-rr-green" : "bg-rr-border")} />
          ))}
        </div>

        <div className="bg-rr-surface border border-rr-border rounded-2xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.5)]">

          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rr-green/10 border border-rr-green/25 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>radar</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-rr-text tracking-tight mb-2">Welcome to RootRecall</h1>
                <p className="font-mono text-[13px] text-rr-muted">Your AI incident intelligence platform is ready.</p>
              </div>
              <div className="flex flex-col gap-2 text-left max-w-xs mx-auto">
                {["Connect your infrastructure tools", "Set alert thresholds", "Go live in minutes"].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 font-mono text-[12px] text-rr-muted">
                    <span className="w-5 h-5 rounded-full bg-rr-green/10 border border-rr-green/25 flex items-center justify-center text-rr-green text-[10px] font-bold shrink-0">{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Connect Services ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-rr-text tracking-tight">Connect Services</h2>
                  <p className="font-mono text-[12px] text-rr-muted mt-1">Integrate your operational stack for automatic context.</p>
                </div>
                {connectedCount > 0 && (
                  <span className="font-mono text-[11px] text-rr-green bg-rr-green/10 border border-rr-green/20 px-2.5 py-1 rounded-full">
                    {connectedCount}/{SERVICES.length} connected
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SERVICES.map(svc => {
                  const status = getStatus(svc.id);
                  return (
                    <div key={svc.id} className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all",
                      status === "connected" ? "bg-rr-green/5 border-rr-green/25" :
                      status === "connecting" ? "bg-rr-surface border-rr-border animate-pulse" :
                      "bg-rr-bg border-rr-border hover:border-rr-border/80"
                    )}>
                      <span className={cn("font-medium text-[13px] flex items-center gap-2", status === "connected" ? "text-rr-text" : "text-rr-muted")}>
                        <span className={cn("material-symbols-outlined", svc.color)} style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>{svc.icon}</span>
                        {svc.name}
                      </span>
                      <button
                        onClick={() => openModal(svc)}
                        disabled={status === "connecting" || status === "connected"}
                        className={cn(
                          "font-mono text-[10px] px-3 py-1 rounded-lg border transition-all",
                          status === "connected"  ? "bg-rr-green/10 text-rr-green border-rr-green/20 cursor-default" :
                          status === "connecting" ? "bg-rr-border text-rr-muted border-rr-border cursor-wait" :
                          "bg-rr-surface text-rr-muted border-rr-border hover:text-rr-green hover:border-rr-green/30 cursor-pointer"
                        )}
                      >
                        {status === "connecting" ? "Connecting..." : status === "connected" ? "Connected ✓" : "Connect"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Configure Alerts ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-rr-text tracking-tight">Configure Alerts</h2>
                <p className="font-mono text-[12px] text-rr-muted mt-1">Define baseline thresholds and notification channels.</p>
              </div>
              <div className="space-y-5">

                {/* ── P99 Latency Slider ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[11px] text-rr-muted">P99 Latency Threshold (SEV-1)</label>
                    <span className="font-mono text-[13px] font-bold text-rr-green">{latencyThreshold.toLocaleString()} ms</span>
                  </div>
                  <input
                    type="range" min={100} max={5000} step={50}
                    value={latencyThreshold}
                    onChange={e => setLatencyThreshold(Number(e.target.value))}
                    className="w-full accent-rr-green cursor-pointer"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-rr-muted">
                    <span>100ms (strict)</span><span>5,000ms (permissive)</span>
                  </div>
                  <div className="font-mono text-[10px] text-rr-muted">
                    {latencyThreshold <= 500  && "⚡ Tight — will alert on minor slowdowns"}
                    {latencyThreshold > 500  && latencyThreshold <= 2000 && "✓ Recommended for production"}
                    {latencyThreshold > 2000 && "⚠ Permissive — only severe spikes will trigger"}
                  </div>
                </div>

                {/* ── Error Rate Slider ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[11px] text-rr-muted">Error Rate Threshold (SEV-1)</label>
                    <span className="font-mono text-[13px] font-bold text-rr-green">{errorThreshold}%</span>
                  </div>
                  <input
                    type="range" min={1} max={50} step={1}
                    value={errorThreshold}
                    onChange={e => setErrorThreshold(Number(e.target.value))}
                    className="w-full accent-rr-green cursor-pointer"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-rr-muted">
                    <span>1% (strict)</span><span>50% (permissive)</span>
                  </div>
                  <div className="font-mono text-[10px] text-rr-muted">
                    {errorThreshold <= 2  && "⚡ Tight — good for zero-downtime SLAs"}
                    {errorThreshold > 2  && errorThreshold <= 10 && "✓ Recommended for most production workloads"}
                    {errorThreshold > 10 && "⚠ Permissive — may miss early degradation"}
                  </div>
                </div>

                {/* ── Notification Channels ── */}
                <div className="pt-4 border-t border-rr-border space-y-3">
                  <label className="font-mono text-[11px] text-rr-muted uppercase tracking-widest">Notification Channels</label>
                  {([
                    { key: "slack",     label: "Slack (#incidents)",          connected: getStatus("slack")      === "connected" },
                    { key: "pagerduty", label: "PagerDuty (Primary On-Call)", connected: getStatus("pagerduty")  === "connected" },
                    { key: "email",     label: "Email digest",                connected: true },
                  ] as const).map(ch => (
                    <label key={ch.key} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={channels[ch.key]}
                        onChange={e => setChannels(c => ({ ...c, [ch.key]: e.target.checked }))}
                        className="accent-rr-green w-4 h-4 cursor-pointer"
                      />
                      <span className="font-mono text-[12px] text-rr-text group-hover:text-rr-green transition-colors">{ch.label}</span>
                      {ch.connected && (ch.key as string) !== "email" && (
                        <span className="font-mono text-[9px] text-rr-green bg-rr-green/10 border border-rr-green/20 px-1.5 py-0.5 rounded-full ml-auto">connected ✓</span>
                      )}
                      {!ch.connected && (ch.key as string) !== "email" && (
                        <span className="font-mono text-[9px] text-rr-muted ml-auto">not connected</span>
                      )}
                    </label>
                  ))}
                  <p className="font-mono text-[10px] text-rr-muted pt-1">
                    Settings will be saved to your workspace and applied immediately.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Ready ── */}
          {step === 4 && (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rr-green/10 border border-rr-green/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-rr-text tracking-tight mb-2">Your workspace is ready</h2>
                <p className="font-mono text-[13px] text-rr-muted">Initial telemetry synchronization complete.</p>
              </div>
              <div className="flex justify-center gap-4 py-4">
                {[
                  { v: "14", l: "Incidents Analyzed" },
                  { v: connectedCount > 0 ? String(connectedCount) : "0", l: "Integrations Connected" },
                  { v: "3",  l: "Patterns Detected" },
                ].map(m => (
                  <div key={m.l} className="bg-rr-bg border border-rr-border p-3 rounded-xl text-center min-w-[90px]">
                    <div className="font-mono text-xl font-bold text-rr-green">{m.v}</div>
                    <div className="font-mono text-[9px] text-rr-muted uppercase mt-1">{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-rr-border">
            <button
              onClick={() => setStep(s => Math.min(4, s + 1))}
              className="font-mono text-[12px] text-rr-muted hover:text-rr-text transition-colors"
            >
              {step < 4 ? "Skip" : ""}
            </button>
            <button
              onClick={nextStep}
              disabled={loading}
              className="bg-rr-green text-rr-bg font-mono text-[12px] font-bold px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-[0_0_12px_rgba(103,247,177,0.2)]"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-rr-bg/40 border-t-rr-bg rounded-full animate-spin" />}
              {step === 1 ? "Get Started" : step === 4 ? "Open Dashboard" : "Continue"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Connection Modal ── */}
      {modalSvc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-rr-surface border border-rr-border rounded-2xl w-full max-w-md shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-rr-border">
              <div className="flex items-center gap-3">
                <span className={cn("material-symbols-outlined", modalSvc.color)} style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{modalSvc.icon}</span>
                <span className="font-semibold text-rr-text">Connect {modalSvc.name}</span>
              </div>
              <button onClick={closeModal} className="text-rr-muted hover:text-rr-text transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* OAuth option */}
              {modalSvc.oauthLabel && (
                <>
                  <button
                    onClick={() => handleOAuth(modalSvc)}
                    className="w-full flex items-center justify-center gap-2 bg-rr-green text-rr-bg font-mono text-[13px] font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all"
                    style={{ boxShadow: "0 0 16px rgba(103,247,177,0.2)" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>open_in_new</span>
                    {modalSvc.oauthLabel}
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-rr-border" />
                    <span className="font-mono text-[10px] text-rr-muted">or use API token</span>
                    <div className="flex-1 h-px bg-rr-border" />
                  </div>
                </>
              )}

              {/* Credential fields */}
              {modalSvc.fields.map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="font-mono text-[11px] text-rr-muted">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formValues[field.key] ?? ""}
                    onChange={e => setFormValues(v => ({ ...v, [field.key]: e.target.value }))}
                    className="w-full bg-rr-bg border border-rr-border rounded-lg px-3 py-2 font-mono text-[12px] text-rr-text placeholder:text-rr-muted/50 focus:outline-none focus:border-rr-green/40 transition-colors"
                  />
                </div>
              ))}

              {formError && (
                <div className="font-mono text-[11px] text-rr-error bg-rr-error/10 border border-rr-error/20 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-rr-border gap-3">
              <button onClick={closeModal} className="font-mono text-[12px] text-rr-muted hover:text-rr-text transition-colors px-4 py-2 border border-rr-border rounded-lg hover:border-rr-border/70">
                Cancel
              </button>
              <button
                onClick={handleConnect}
                className="flex-1 bg-rr-green text-rr-bg font-mono text-[12px] font-bold py-2.5 rounded-xl hover:opacity-90 transition-all"
                style={{ boxShadow: "0 0 12px rgba(103,247,177,0.2)" }}
              >
                Authenticate &amp; Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
