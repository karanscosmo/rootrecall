"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "navbar";
}

export default function Logo({ className, iconOnly = false, size = "md" }: LogoProps) {
  // Highly balanced typography and icon dimension mappings
  const dims = {
    sm: { h: 16, icon: 14, textClass: "text-xs tracking-tight font-semibold" },
    md: { h: 24, icon: 18, textClass: "text-base tracking-tight font-semibold" },
    navbar: { h: 32, icon: 24, textClass: "text-[21px] tracking-tight font-bold" },
    lg: { h: 48, icon: 36, textClass: "text-2xl tracking-tight font-bold" },
    xl: { h: 64, icon: 48, textClass: "text-4xl tracking-tight font-extrabold" },
  }[size];

  return (
    <div className={cn("flex items-center gap-2.5 select-none shrink-0 font-sans", className)}>
      {/* Icon Mark: High-fidelity telemetry node representing root recall */}
      <svg
        width={dims.icon}
        height={dims.icon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-rr-green filter drop-shadow-[0_0_6px_rgba(103,247,177,0.35)] shrink-0"
      >
        <path
          d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dynamic telemetry-inspired inner details */}
        <path
          d="M12 6V18"
          stroke="url(#logo-grad-gradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M7 10L12 15L17 10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <defs>
          <linearGradient id="logo-grad-gradient" x1="12" y1="6" x2="12" y2="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#67F7B1" />
            <stop offset="1" stopColor="#4DA3FF" />
          </linearGradient>
        </defs>
      </svg>

      {!iconOnly && (
        <span
          className={cn(
            "flex items-center leading-none text-rr-text font-bold",
            dims.textClass
          )}
        >
          root
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#67F7B1] to-[#4DA3FF]">
            recall
          </span>
        </span>
      )}
    </div>
  );
}
