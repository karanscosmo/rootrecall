"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AmbientVideoProps {
  opacity?: number;
  blur?: string;
  className?: string;
}

export default function AmbientVideo({
  opacity = 0.55,
  blur = "blur-[2px]",
  className,
}: AmbientVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Play as soon as the video element is mounted
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || prefersReducedMotion) return;
    vid.muted = true;
    const tryPlay = () => {
      vid.play().catch(() => {
        // retry once after a short delay (handles some Safari quirks)
        setTimeout(() => vid.play().catch(() => {}), 500);
      });
    };
    if (vid.readyState >= 2) {
      tryPlay();
    } else {
      vid.addEventListener("canplay", tryPlay, { once: true });
    }
  }, [isMounted, prefersReducedMotion]);

  if (!isMounted || prefersReducedMotion) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0",
        className
      )}
    >
      <video
        ref={videoRef}
        src="/ambient_bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className={cn(
          "absolute inset-0 w-full h-full object-cover transform-gpu will-change-transform",
          blur
        )}
        style={{ opacity }}
      />
      {/* Very subtle vignette only — no dark blanket */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#06070A]/70 via-transparent to-[#06070A]/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#06070A]/30 via-transparent to-[#06070A]/30 pointer-events-none" />
    </div>
  );
}
