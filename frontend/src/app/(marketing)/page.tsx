"use client";
import Link from "next/link";
import AmbientVideo from "@/components/ui/AmbientVideo";
import Logo from "@/components/ui/Logo";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-rr-bg text-rr-text selection:bg-rr-green/20 relative overflow-hidden">
      {/* Fullscreen ambient background video */}
      <AmbientVideo opacity={0.22} blur="blur-[10px]" />

      <nav className="fixed top-0 inset-x-0 h-16 border-b border-rr-border bg-rr-bg/80 backdrop-blur z-50 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center">
          <Logo size="navbar" className="hover:opacity-80 transition-opacity" />
        </div>
        <div className="hidden md:flex items-center gap-8 font-mono text-[13px] text-rr-muted">
          <Link href="#features" className="hover:text-rr-text transition-colors">Features</Link>
          <Link href="/pricing" className="hover:text-rr-text transition-colors">Pricing</Link>
          <Link href="/docs" className="hover:text-rr-text transition-colors">Documentation</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="font-mono text-[13px] text-rr-muted hover:text-rr-text">Login</Link>
          <Link href="/signup" className="font-mono text-[13px] font-bold bg-rr-surface border border-rr-border hover:border-rr-green/50 text-rr-text px-4 py-1.5 rounded-lg transition-colors">Get Started</Link>
        </div>
      </nav>

      <main className="pt-32 pb-24 relative z-10">
        {/* Hero */}
        <section className="px-6 lg:px-12 max-w-5xl mx-auto text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rr-green/5 blur-[120px] rounded-full pointer-events-none" />
          
          {/* Large Hero Branding Logo */}
          <div className="flex justify-center mb-8 animate-scale-in">
            <Logo size="xl" className="filter drop-shadow-[0_0_15px_rgba(103,247,177,0.35)] hover:drop-shadow-[0_0_22px_rgba(103,247,177,0.5)] transition-all duration-500 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rr-green/10 border border-rr-green/20 rounded-full font-mono text-[11px] text-rr-green mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-rr-green animate-pulse" /> Introducing RootRecall AI Copilot
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            From operational chaos<br/>to <span className="text-transparent bg-clip-text bg-gradient-to-r from-rr-green to-rr-blue">clarity in seconds.</span>
          </h1>
          <p className="font-mono text-[14px] md:text-[16px] text-rr-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            The AI-native incident intelligence platform that automatically detects root causes, generates cinematic replays, and writes postmortems for your engineering team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto bg-rr-green text-rr-bg font-mono text-[14px] font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(103,247,177,0.2)]">
              Start Free Trial
            </Link>
            <Link href="/demo" className="w-full sm:w-auto bg-rr-surface border border-rr-border text-rr-text font-mono text-[14px] font-bold px-8 py-3.5 rounded-xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined" style={{fontSize:18}}>play_circle</span> View Demo
            </Link>
          </div>
        </section>

        {/* Social Proof */}
        <section className="mt-24 border-y border-rr-border bg-rr-surface/30 py-8 relative">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="font-mono text-[11px] text-rr-muted uppercase tracking-widest mb-6">Trusted by world-class engineering teams</p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 grayscale font-semibold text-xl tracking-tight text-rr-text">
              <span>Acme Corp</span>
              <span>Globex</span>
              <span>Initech</span>
              <span>Massive Dynamic</span>
              <span>Stark Ind</span>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">A complete intelligence ecosystem.</h2>
            <p className="font-mono text-[14px] text-rr-muted max-w-xl mx-auto">Everything you need to resolve incidents faster and prevent them from happening again.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "AI Root Cause Analysis", icon: "psychology", desc: "Instantly analyze millions of log lines to pinpoint the exact deployment or query that triggered the outage." },
              { title: "Cinematic Incident Replay", icon: "play_circle", desc: "Watch exactly how an incident unfolded with high-fidelity visual timelines and topology animations." },
              { title: "Automated Postmortems", icon: "history_edu", desc: "Let AI write your SEV-1 reports, extracting timelines, impacts, and prevention steps automatically." },
              { title: "Shared AI Memory", icon: "memory", desc: "RootRecall remembers past failures and alerts you instantly when an anomaly matches a historical pattern." },
              { title: "Real-time Telemetry", icon: "monitor_heart", desc: "A unified, live data stream ensuring your entire team looks at the same metrics during a crisis." },
              { title: "Global Command Palette", icon: "keyboard_command_key", desc: "Navigate your entire operational stack instantly with our blazing fast CMD+K interface." },
            ].map((f, i) => (
              <div key={i} className="bg-rr-surface/60 backdrop-blur-sm border border-rr-border rounded-2xl p-6 hover:border-rr-green/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-rr-bg border border-rr-border flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-rr-green">{f.icon}</span>
                </div>
                <h3 className="font-semibold text-lg text-rr-text mb-2">{f.title}</h3>
                <p className="font-mono text-[12px] text-rr-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
        
        {/* CTA */}
        <section className="py-24 px-6 lg:px-12 max-w-4xl mx-auto text-center relative">
          <div className="bg-rr-surface/60 backdrop-blur-sm border border-rr-border rounded-3xl p-12 relative overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rr-green/10 blur-[100px] rounded-full" />
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4 relative z-10">Stop guessing. Start knowing.</h2>
            <p className="font-mono text-[14px] text-rr-muted mb-8 relative z-10">Join thousands of engineers who resolve incidents 5x faster.</p>
            <Link href="/signup" className="inline-block bg-rr-green text-rr-bg font-mono text-[14px] font-bold px-8 py-3.5 rounded-xl hover:opacity-90 relative z-10 shadow-[0_0_20px_rgba(103,247,177,0.2)]">
              Transform Your Workflow
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-rr-border py-12 px-6 lg:px-12 text-center relative z-10">
        <div className="font-mono text-[12px] text-rr-muted">© 2026 RootRecall Inc. All rights reserved.</div>
      </footer>
    </div>
  );
}
