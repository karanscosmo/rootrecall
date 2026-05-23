"use client";
import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import AmbientVideo from "@/components/ui/AmbientVideo";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-rr-bg relative">
      {/* Background motion backdrop */}
      <AmbientVideo opacity={0.05} blur="blur-[10px]" />

      {/* Left — cinematic panel */}
      <div className="hidden md:flex w-[55%] relative bg-rr-surface/40 backdrop-blur-sm border-r border-rr-border flex-col justify-between p-16 overflow-hidden z-10">
        {/* Grid bg */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "linear-gradient(to right, #3c4a41 1px, transparent 1px), linear-gradient(to bottom, #3c4a41 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        {/* Gradient fades */}
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-rr-bg to-transparent z-10" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-rr-bg to-transparent z-10" />
        {/* Radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #67F7B1 0%, transparent 70%)" }} />

        {/* Brand */}
        <div className="relative z-20 flex items-center">
          <Logo size="navbar" className="filter drop-shadow-[0_0_8px_rgba(103,247,177,0.2)]" />
        </div>

        {/* Hero content */}
        <div className="relative z-20 space-y-6 max-w-md">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rr-green/8 border border-rr-green/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rr-green animate-pulse" />
            <span className="font-mono text-[11px] text-rr-green uppercase tracking-widest">System Online</span>
          </div>

          <h1 className="text-[42px] font-semibold text-rr-text tracking-tight leading-none">
            Operational<br/>Intelligence.
          </h1>
          <p className="font-mono text-[13px] text-rr-muted leading-relaxed">
            Secure access to high-fidelity incident replay and real-time system health telemetrics.
          </p>

          {/* Stats card */}
          <div className="bg-rr-bg/80 backdrop-blur border border-rr-border rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-rr-green to-transparent opacity-50" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rr-green/10 border border-rr-green/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
              <div>
                <div className="font-mono text-[10px] text-rr-muted uppercase tracking-widest mb-0.5">AI Copilot Activity</div>
                <div className="font-mono text-[13px] text-rr-text flex items-center gap-1">
                  <span className="text-rr-green">›</span> 14 incidents processed today
                </div>
              </div>
            </div>
          </div>

          {/* Terminal decoration */}
          <div className="font-mono text-[11px] text-rr-muted/40 space-y-1 select-none">
            <div>&gt; rootrecall_auth daemon v2.4.0 started</div>
            <div>&gt; waiting for valid credentials...</div>
            <div className="animate-blink">_</div>
          </div>
        </div>
      </div>

      {/* Right — auth panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative z-10 bg-rr-bg/50 backdrop-blur-[2px]">
        {/* Mobile brand */}
        <div className="md:hidden absolute top-6 left-6 flex items-center">
          <Logo size="md" className="filter drop-shadow-[0_0_6px_rgba(103,247,177,0.15)]" />
        </div>

        <div className="w-full max-w-sm space-y-7">
          {/* Centered premium auth branding */}
          <div className="flex flex-col items-center text-center space-y-4 mb-6">
            <Logo size="navbar" className="mb-2 filter drop-shadow-[0_0_8px_rgba(103,247,177,0.25)] animate-pulse" />
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-rr-text tracking-tight">Authenticate</h2>
              <p className="font-mono text-[12px] text-rr-muted">Enter your credentials to access the terminal.</p>
            </div>
          </div>

          {/* SSO */}
          <button 
            type="button"
            onClick={() => window.location.href = "/api/auth/login/google"}
            className="w-full flex items-center justify-center gap-3 py-2.5 bg-rr-surface border border-rr-border rounded-lg hover:border-rr-border/80 hover:bg-white/[0.03] transition-colors font-mono text-[12px] text-rr-text cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-rr-border" />
            <span className="mx-3 font-mono text-[10px] text-rr-muted uppercase tracking-widest bg-[#06070A]/80 px-2 z-10 rounded">Or</span>
            <div className="flex-1 border-t border-rr-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] text-rr-muted" htmlFor="email">Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-rr-muted" style={{ fontSize: 16 }}>mail</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@rootrecall.ai"
                  className="w-full pl-9 pr-3 py-2.5 bg-rr-surface border border-rr-border rounded-lg font-mono text-[12px] text-rr-text placeholder:text-rr-muted/50 focus:outline-none focus:border-rr-blue/60 focus:ring-1 focus:ring-rr-blue/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-mono text-[11px] text-rr-muted" htmlFor="password">Access Token</label>
                <Link href="/forgot-password" className="font-mono text-[11px] text-rr-muted hover:text-rr-green transition-colors">Forgot token?</Link>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-rr-muted" style={{ fontSize: 16 }}>key</span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-rr-surface border border-rr-border rounded-lg font-mono text-[12px] text-rr-text placeholder:text-rr-muted/50 focus:outline-none focus:border-rr-blue/60 focus:ring-1 focus:ring-rr-blue/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-rr-green text-rr-bg font-mono text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
              style={{ boxShadow: "0 0 12px rgba(103,247,177,0.2)" }}
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-rr-bg/40 border-t-rr-bg rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Initialize Session
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center font-mono text-[11px] text-rr-muted">
            New to RootRecall?{" "}
            <Link href="/signup" className="text-rr-green hover:underline">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
