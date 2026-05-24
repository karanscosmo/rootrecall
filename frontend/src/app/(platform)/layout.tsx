"use client";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import CommandPalette from "@/components/ui/CommandPalette";
import AmbientVideo from "@/components/ui/AmbientVideo";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useWebsocket } from "@/hooks/useWebsocket";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

function PlatformShell({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const checkSession = useStore((s) => s.checkSession);
  const pathname = usePathname();
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);

  // Wire up global hooks
  useCommandPalette(); // keyboard listener
  useWebsocket();      // Connect to FastAPI backend

  useEffect(() => {
    async function verify() {
      const ok = await checkSession();
      // Define public platform routes
      const isPublic = pathname === "/dashboard" || pathname === "/demo" || pathname === "/docs";
      if (!ok && !isPublic) {
        window.location.href = "/login";
      } else {
        setAuthLoading(false);
      }
    }
    verify();
  }, [pathname, checkSession]);

  // Determine ambient video opacity based on the active route
  let videoOpacity = 0.50; // clearly visible telemetry background for dashboard
  let videoBlur = "blur-[2px]";
  if (pathname.includes("/replay")) {
    videoOpacity = 0.65; // cinematic infrastructure ambience
    videoBlur = "blur-[1px]";
  } else if (pathname.includes("/copilot")) {
    videoOpacity = 0.55; // operational intelligence feel
    videoBlur = "blur-[2px]";
  } else if (pathname.includes("/settings")) {
    videoOpacity = 0.35; // cleaner backdrop for settings
    videoBlur = "blur-[3px]";
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen bg-rr-bg overflow-hidden relative">
      {/* Background motion ambience */}
      <AmbientVideo opacity={videoOpacity} blur={videoBlur} />

      <Sidebar />
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen overflow-hidden transition-all duration-300 ease-in-out z-10",
          sidebarCollapsed ? "ml-0 md:ml-16" : "ml-0 md:ml-64"
        )}
      >
        <TopBar />
        <main className="flex-1 mt-14 overflow-auto relative">
          <div className="page-enter min-h-full">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
