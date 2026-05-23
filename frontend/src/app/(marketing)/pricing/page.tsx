"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-rr-bg text-rr-text">
      <nav className="fixed top-0 inset-x-0 h-16 border-b border-rr-border bg-rr-bg/80 backdrop-blur z-50 flex items-center justify-between px-6 lg:px-12">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rr-green/15 border border-rr-green/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>radar</span>
          </div>
          <span className="font-semibold text-lg text-rr-text tracking-tight">RootRecall</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="font-mono text-[13px] text-rr-muted hover:text-rr-text">Login</Link>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 lg:px-12 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Simple, transparent pricing.</h1>
          <p className="font-mono text-[14px] text-rr-muted">Start for free, upgrade when your team needs advanced intelligence.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              name: "Starter",
              price: "$0",
              desc: "Perfect for small teams getting started with observability.",
              features: ["Up to 3 users", "10 incidents per month", "7-day telemetry history", "Basic dashboard", "Community support"],
              cta: "Start Free",
              href: "/signup",
            },
            {
              name: "Pro",
              price: "$49",
              period: "/mo per user",
              desc: "Advanced intelligence for serious engineering teams.",
              features: ["Unlimited users", "Unlimited incidents", "1-year telemetry history", "AI Copilot RCA", "Cinematic Replay", "Automated Postmortems", "Priority support"],
              cta: "Start Free Trial",
              href: "/signup",
              popular: true,
            },
            {
              name: "Enterprise",
              price: "Custom",
              desc: "Security and scale for large organizations.",
              features: ["Everything in Pro", "Single Sign-On (SSO)", "Custom SLAs", "On-prem deployment", "Dedicated success manager", "Custom integrations"],
              cta: "Contact Sales",
              href: "mailto:sales@rootrecall.ai",
            }
          ].map((plan, i) => (
            <div key={i} className={cn(
              "bg-rr-surface border rounded-2xl p-8 flex flex-col relative",
              plan.popular ? "border-rr-green ring-1 ring-rr-green/50 shadow-[0_25px_60px_rgba(0,0,0,0.3)]" : "border-rr-border"
            )}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-rr-green text-rr-bg font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_12px_rgba(103,247,177,0.3)]">
                  Most Popular
                </div>
              )}
              <h2 className="text-xl font-semibold mb-2">{plan.name}</h2>
              <div className="mb-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="font-mono text-[12px] text-rr-muted">{plan.period}</span>}
              </div>
              <p className="font-mono text-[12px] text-rr-muted mb-8 h-10">{plan.desc}</p>
              
              <Link href={plan.href} className={cn(
                "block text-center font-mono text-[13px] font-bold px-4 py-3 rounded-lg transition-all mb-8",
                plan.popular ? "bg-rr-green text-rr-bg hover:opacity-90 shadow-[0_0_15px_rgba(103,247,177,0.2)]" : "bg-rr-bg border border-rr-border hover:border-rr-green/50 text-rr-text"
              )}>
                {plan.cta}
              </Link>

              <div className="flex-1">
                <div className="font-mono text-[10px] text-rr-muted uppercase tracking-widest mb-4">Includes:</div>
                <ul className="space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-rr-green shrink-0" style={{fontSize: 16}}>check</span>
                      <span className="font-mono text-[12px] text-rr-text">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "How does the AI Copilot work?", a: "RootRecall's AI ingests your logs, metrics, and deployment events in real-time, matching them against known historical failure patterns to surface root causes instantly." },
              { q: "Can I self-host RootRecall?", a: "Yes, our Enterprise plan supports completely air-gapped, on-premise deployments via Kubernetes Helm charts." },
              { q: "What happens after the free trial?", a: "You'll be automatically downgraded to the Starter plan unless you choose to upgrade to Pro. We never delete your historical data." }
            ].map((faq, i) => (
              <div key={i} className="bg-rr-surface border border-rr-border rounded-xl p-6 hover:border-rr-green/30 transition-colors">
                <h3 className="font-semibold text-[15px] mb-2">{faq.q}</h3>
                <p className="font-mono text-[12px] text-rr-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
