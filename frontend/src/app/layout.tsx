import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "material-symbols/outlined.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

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
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
      </head>
      <body className="antialiased bg-rr-bg text-rr-text min-h-screen">
        {children}
      </body>
    </html>
  );
}
