"use client";
import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-rr-bg px-4 py-12">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(rgba(103,247,177,1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="relative w-full max-w-sm space-y-8">
        <div className="flex items-center justify-center gap-2.5">
          <Logo size="navbar" className="filter drop-shadow-[0_0_8px_rgba(103,247,177,0.2)] animate-pulse" />
        </div>

        <div className="bg-rr-surface border border-rr-border rounded-2xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
          {!submitted ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-rr-text tracking-tight">Reset Access Token</h2>
                <p className="font-mono text-[12px] text-rr-muted">Enter your email address and we'll send you a link to reset your token.</p>
              </div>
              <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] text-rr-muted">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-rr-muted" style={{ fontSize: 16 }}>mail</span>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="operator@rootrecall.ai" className="w-full pl-9 pr-3 py-2.5 bg-rr-bg border border-rr-border rounded-lg font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-rr-green text-rr-bg font-mono text-[12px] font-bold py-2.5 rounded-lg hover:opacity-90 shadow-[0_0_12px_rgba(103,247,177,0.2)]">
                  Send Reset Link
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-rr-green/10 border border-rr-green/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 24 }}>mark_email_read</span>
              </div>
              <h2 className="text-xl font-semibold text-rr-text tracking-tight">Check your email</h2>
              <p className="font-mono text-[12px] text-rr-muted">We sent a reset link to {email}</p>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <Link href="/login" className="font-mono text-[11px] text-rr-muted hover:text-rr-text flex items-center justify-center gap-1">
              <span className="material-symbols-outlined" style={{fontSize: 14}}>arrow_back</span> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
