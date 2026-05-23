"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AmbientVideoProps {
  opacity?: number; // opacity of the video element, e.g. 0.2
  blur?: string; // CSS blur value, e.g. "blur-sm", "blur-[10px]"
  className?: string;
  overlayColor?: string; // background overlay class
}

export default function AmbientVideo({
  opacity = 0.22,
  blur = "blur-[12px]",
  className,
  overlayColor = "bg-[#06070A]/40",
}: AmbientVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  useEffect(() => {
    if (isMounted && videoRef.current && !prefersReducedMotion) {
      videoRef.current.play().catch((err) => {
        console.warn("Ambient video autoplay was blocked or failed: ", err);
      });
    }
  }, [isMounted, prefersReducedMotion]);

  if (!isMounted) return null;

  // Fallback static background if user prefers reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        className={cn(
          "absolute inset-0 w-full h-full bg-[#06070A] pointer-events-none select-none z-0",
          className
        )}
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-[#06070A] via-rr-surface/10 to-[#06070A] opacity-60" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 transform-gpu",
        className
      )}
    >
      {/* Autoplay, muted, loops inline telemetry video */}
      <video
        ref={videoRef}
        src="/ambient_bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className={cn(
          "w-full h-full object-cover transition-opacity duration-1000 ease-in-out will-change-[opacity,filter] transform-gpu",
          blur
        )}
        style={{
          opacity: opacity,
        }}
      />

      {/* Subtle overlay shading & color grading to preserve contrast */}
      <div
        className={cn(
          "absolute inset-0 w-full h-full transition-colors duration-500",
          overlayColor
        )}
      />
      <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-[#06070A] via-transparent to-[#06070A] opacity-60" />
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#06070A] via-transparent to-[#06070A] opacity-60" />
    </div>
  );
}
