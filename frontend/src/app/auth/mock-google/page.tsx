"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function MockGoogleAuthContent() {
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get("redirect_uri") || "/api/auth/callback";
  
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleSelectMockAccount = (selectedEmail: string, selectedName: string) => {
    const mockCode = `mock_code_${Buffer.from(JSON.stringify({ email: selectedEmail, name: selectedName })).toString("base64")}`;
    window.location.href = `${redirectUri}?code=${mockCode}&state=security_state_string`;
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const finalName = name || email.split("@")[0];
    handleSelectMockAccount(email, finalName);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0F10] text-[#E3E3E3] font-sans selection:bg-blue-500/20">
      <div className="w-full max-w-[400px] bg-[#1E1E20] border border-[#2F2F32] rounded-lg p-8 space-y-6 shadow-2xl">
        {/* Google Logo and title */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 flex items-center justify-center">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Sign in with Google</h1>
          <p className="text-[13px] text-[#A1A1A5] text-center">to continue to <span className="font-semibold text-white">RootRecall Sandbox</span></p>
        </div>

        {/* Account Choose List */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-[#A1A1A5] uppercase tracking-wider mb-2">Select Mock Session</div>
          
          {[
            { email: "karan.sharma@rootrecall.ai", name: "Karan Sharma", initial: "KS" },
            { email: "sre.team@rootrecall.ai", name: "SRE Platform Pool", initial: "SP" },
          ].map((acc) => (
            <button
              key={acc.email}
              onClick={() => handleSelectMockAccount(acc.email, acc.name)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[#2F2F32] bg-[#252528] hover:bg-[#2A2A2E] hover:border-[#3E3E42] text-left transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-xs text-blue-400">
                {acc.initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-white truncate">{acc.name}</div>
                <div className="text-[11px] text-[#A1A1A5] truncate">{acc.email}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Custom entry */}
        <div className="relative flex items-center py-2">
          <div className="flex-1 border-t border-[#2F2F32]" />
          <span className="mx-3 font-mono text-[9px] text-[#A1A1A5] uppercase tracking-widest">Or Use Custom</span>
          <div className="flex-1 border-t border-[#2F2F32]" />
        </div>

        <form onSubmit={handleCustomSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] text-[#A1A1A5] uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              placeholder="operator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#252528] border border-[#2F2F32] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-[#A1A1A5] uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              placeholder="operator@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#252528] border border-[#2F2F32] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#4285F4] hover:bg-[#357AE8] text-white font-medium text-sm py-2 rounded-lg transition-colors shadow-lg"
          >
            Authorize Mock Session
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MockGoogleAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F0F10] flex items-center justify-center text-[#A1A1A5] font-mono text-sm">
        Loading authorization portal...
      </div>
    }>
      <MockGoogleAuthContent />
    </Suspense>
  );
}
