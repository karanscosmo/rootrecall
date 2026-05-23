"use client";
import { useState } from "react";
import Link from "next/link";
import AmbientVideo from "@/components/ui/AmbientVideo";
import Logo from "@/components/ui/Logo";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", password: "", role: "" });

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) { setStep(2); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    window.location.href = "/onboarding";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-rr-bg px-4 py-12 relative overflow-hidden">
      {/* Background atmosphere layer */}
      <AmbientVideo opacity={0.05} blur="blur-[10px]" />

      <div className="relative w-full max-w-md space-y-8 z-10">
        {/* Onboarding identity branding */}
        <div className="flex flex-col items-center justify-center gap-3 animate-scale-in mb-2">
          <Logo size="navbar" className="filter drop-shadow-[0_0_8px_rgba(103,247,177,0.2)] animate-pulse" />
        </div>

        {/* Card */}
        <div className="bg-rr-surface/80 backdrop-blur border border-rr-border rounded-2xl p-8" style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className={`flex-1 h-0.5 rounded-full transition-colors ${s <= step ? "bg-rr-green" : "bg-rr-border"}`} />
            ))}
          </div>

          <div className="space-y-1 mb-6">
            <h2 className="text-xl font-semibold text-rr-text tracking-tight">
              {step === 1 ? "Create your account" : "Setup your workspace"}
            </h2>
            <p className="font-mono text-[12px] text-rr-muted">
              {step === 1 ? "Join the ops teams running on RootRecall" : "Configure your incident intelligence environment"}
            </p>
          </div>

          <form onSubmit={handleNext} className="space-y-4">
            {step === 1 ? (
              <>
                <Input label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Alex Kumar" icon="person" />
                <Input label="Work Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="alex@company.ai" icon="mail" />
                <Input label="Access Token" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min. 12 characters" icon="key" />
              </>
            ) : (
              <>
                <Input label="Company / Organization" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Acme Corp" icon="business" />
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] text-rr-muted">Your Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2.5 bg-rr-bg/80 border border-rr-border rounded-lg font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-blue/60 transition-all cursor-pointer"
                  >
                    <option value="">Select your role</option>
                    <option value="sre">SRE / Platform Engineer</option>
                    <option value="devops">DevOps Engineer</option>
                    <option value="lead">Engineering Lead</option>
                    <option value="cto">CTO / VP Engineering</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-rr-green text-rr-bg font-mono text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
              style={{ boxShadow: "0 0 12px rgba(103,247,177,0.2)" }}
            >
              {loading ? (
                <><span className="w-3.5 h-3.5 border-2 border-rr-bg/40 border-t-rr-bg rounded-full animate-spin" />Creating workspace...</>
              ) : step === 1 ? "Continue" : "Create Account"}
            </button>
          </form>

          <p className="text-center font-mono text-[11px] text-rr-muted mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-rr-green hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, icon, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; icon: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[11px] text-rr-muted">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-rr-muted" style={{ fontSize: 16 }}>{icon}</span>
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 bg-rr-bg/80 border border-rr-border rounded-lg font-mono text-[12px] text-rr-text placeholder:text-rr-muted/50 focus:outline-none focus:border-rr-blue/60 focus:ring-1 focus:ring-rr-blue/20 transition-all"
        />
      </div>
    </div>
  );
}
