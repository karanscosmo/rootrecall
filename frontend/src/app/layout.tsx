import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | RootRecall",
    default: "RootRecall — AI Incident Intelligence Platform",
  },
  description: "RootRecall transforms operational chaos into actionable intelligence. AI-native incident replay, root cause analysis, and postmortem generation for engineering teams.",
  keywords: ["incident management", "SRE", "AI", "root cause analysis", "postmortem", "observability"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-rr-bg text-rr-text min-h-screen">
        {children}
      </body>
    </html>
  );
}
