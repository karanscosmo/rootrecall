"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const nextStep = async () => {
    if (step === 4) {
      setLoading(true);
      await new Promise(r => setTimeout(r, 1200));
      window.location.href = "/dashboard";
      return;
    }
    setStep(s => s + 1);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-rr-bg p-6 relative">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(rgba(103,247,177,1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="w-full max-w-xl relative z-10">
        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={cn("w-2 h-2 rounded-full transition-colors", step >= i ? "bg-rr-green" : "bg-rr-border")} />
          ))}
        </div>

        <div className="bg-rr-surface border border-rr-border rounded-2xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
          {step === 1 && (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rr-green/10 border border-rr-green/25 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>radar</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-rr-text tracking-tight mb-2">Welcome to RootRecall</h1>
                <p className="font-mono text-[13px] text-rr-muted">Your AI incident intelligence platform is ready.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-rr-text tracking-tight">Connect Services</h2>
                <p className="font-mono text-[12px] text-rr-muted mt-1">Integrate your operational stack for automatic context.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {["Kubernetes", "AWS", "Datadog", "PagerDuty", "GitHub", "Slack"].map((svc, i) => (
                  <div key={svc} className="flex items-center justify-between p-3 bg-rr-bg border border-rr-border rounded-lg">
                    <span className="font-medium text-[13px] text-rr-text flex items-center gap-2">
                      <span className="material-symbols-outlined text-rr-muted" style={{fontSize: 16}}>apps</span>
                      {svc}
                    </span>
                    <button className={cn("font-mono text-[10px] px-3 py-1 rounded transition-colors", i < 2 ? "bg-rr-green/10 text-rr-green border border-rr-green/20" : "bg-rr-surface text-rr-muted border border-rr-border hover:text-rr-text")}>
                      {i < 2 ? "Connected" : "Connect"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-rr-text tracking-tight">Configure Alerts</h2>
                <p className="font-mono text-[12px] text-rr-muted mt-1">Define baseline thresholds and notification channels.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-rr-muted">P99 Latency Threshold (SEV-1)</label>
                  <input type="range" min="100" max="5000" defaultValue="2000" className="w-full accent-rr-green" />
                  <div className="flex justify-between font-mono text-[10px] text-rr-muted"><span>100ms</span><span>5000ms</span></div>
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-rr-muted">Error Rate Threshold (SEV-1)</label>
                  <input type="range" min="1" max="100" defaultValue="5" className="w-full accent-rr-green" />
                  <div className="flex justify-between font-mono text-[10px] text-rr-muted"><span>1%</span><span>100%</span></div>
                </div>
                <div className="pt-4 border-t border-rr-border space-y-3">
                  <label className="font-mono text-[11px] text-rr-muted uppercase tracking-widest">Notification Channels</label>
                  {["Slack (#incidents)", "PagerDuty (Primary On-Call)", "Email"].map(ch => (
                    <label key={ch} className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="accent-rr-green w-4 h-4" />
                      <span className="font-mono text-[12px] text-rr-text">{ch}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                <div className="bg-rr-bg border border-rr-border p-3 rounded-lg text-center min-w-[100px]">
                  <div className="font-mono text-xl font-bold text-rr-green">14</div>
                  <div className="font-mono text-[9px] text-rr-muted uppercase mt-1">Incidents Analyzed</div>
                </div>
                <div className="bg-rr-bg border border-rr-border p-3 rounded-lg text-center min-w-[100px]">
                  <div className="font-mono text-xl font-bold text-rr-green">3</div>
                  <div className="font-mono text-[9px] text-rr-muted uppercase mt-1">Patterns Detected</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-rr-border">
            <button onClick={() => setStep(s => Math.min(4, s + 1))} className="font-mono text-[12px] text-rr-muted hover:text-rr-text">
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
    </div>
  );
}
