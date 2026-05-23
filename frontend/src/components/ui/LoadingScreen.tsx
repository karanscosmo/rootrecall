"use client";
import { useEffect, useState } from "react";
import Logo from "@/components/ui/Logo";

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#06070A] select-none pointer-events-none">
      {/* Radial backdrop glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03] blur-[80px]"
        style={{
          background: "radial-gradient(circle, #67F7B1 0%, transparent 70%)",
        }}
      />

      {/* Main branding container */}
      <div className="relative flex flex-col items-center gap-4 animate-scale-in">
        {/* Pulsing Logo Text */}
        <Logo size="navbar" className="filter drop-shadow-[0_0_12px_rgba(103,247,177,0.35)] animate-pulse duration-[2000ms]" />

        {/* Subtitle */}
        <div className="text-center">
          <div className="font-mono text-[9px] text-rr-muted uppercase tracking-[0.2em]">
            Operational Intelligence Platform
          </div>
        </div>

        {/* Telemetry loading bar */}
        <div className="w-48 space-y-2 mt-2">
          <div className="h-[2px] bg-rr-border rounded-full overflow-hidden w-full">
            <div
              className="h-full bg-rr-green transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between font-mono text-[9px] text-rr-muted uppercase tracking-widest">
            <span>Connecting daemon...</span>
            <span>{Math.min(Math.round(progress), 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
