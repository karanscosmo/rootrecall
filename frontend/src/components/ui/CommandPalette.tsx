"use client";
import { useState, useEffect, useRef } from "react";
import Logo from "@/components/ui/Logo";
import { useCommandPalette, useCommandActions } from "@/hooks/useCommandPalette";
import { cn } from "@/lib/utils";

interface FuzzyResult {
  score: number;
  highlighted: string;
}

function fuzzyMatch(text: string, query: string): FuzzyResult | null {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return { score: 1, highlighted: text };
  }

  // Check for substring match
  const subIdx = normalizedText.indexOf(normalizedQuery);
  if (subIdx !== -1) {
    const score = 1000 - subIdx; // higher score for earlier match
    const highlighted =
      text.slice(0, subIdx) +
      `<span class="text-rr-green font-bold bg-rr-green/10 px-0.5 rounded">` +
      text.slice(subIdx, subIdx + normalizedQuery.length) +
      `</span>` +
      text.slice(subIdx + normalizedQuery.length);
    return { score, highlighted };
  }

  // Non-contiguous fuzzy match
  let score = 0;
  let textIdx = 0;
  let queryIdx = 0;
  let highlighted = "";
  let lastMatchIdx = -1;

  while (textIdx < text.length && queryIdx < normalizedQuery.length) {
    if (normalizedText[textIdx] === normalizedQuery[queryIdx]) {
      highlighted += `<span class="text-rr-green font-bold bg-rr-green/10 px-0.5 rounded">${text[textIdx]}</span>`;
      if (lastMatchIdx !== -1) {
        score += Math.max(1, 10 - (textIdx - lastMatchIdx));
      } else {
        score += 10;
      }
      lastMatchIdx = textIdx;
      queryIdx++;
    } else {
      highlighted += text[textIdx];
    }
    textIdx++;
  }

  if (queryIdx === normalizedQuery.length) {
    if (textIdx < text.length) {
      highlighted += text.slice(textIdx);
    }
    return { score, highlighted };
  }

  return null;
}

export default function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const { navigation, incidents, aiActions } = useCommandActions();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allCommands = [
    ...navigation.map((i) => ({ ...i, group: "Navigation" })),
    ...incidents.map((i)  => ({ ...i, group: "Incidents" })),
    ...aiActions.map((i)  => ({ ...i, group: "AI Actions" })),
  ];

  const filtered = allCommands
    .map((cmd) => {
      const match = fuzzyMatch(cmd.label, query);
      if (!match) return null;
      return {
        ...cmd,
        score: match.score,
        highlightedLabel: match.highlighted,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score);

  // Group filtered
  const groups = filtered.reduce<Record<string, typeof filtered>>((acc, item) => {
    acc[item.group] = [...(acc[item.group] || []), item];
    return acc;
  }, {});

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        setQuery("");
        setActiveIdx(0);
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter") { filtered[activeIdx]?.action(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, filtered, activeIdx]);

  if (!isOpen) return null;

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl mx-4 bg-rr-surface border border-rr-border rounded-xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(103,247,177,0.06)" }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-rr-border">
          <Logo iconOnly size="sm" className="filter drop-shadow-[0_0_4px_rgba(103,247,177,0.2)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder="Search incidents, navigate, or run AI actions..."
            className="flex-1 bg-transparent font-mono text-[13px] text-rr-text placeholder:text-rr-muted/50 outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-rr-muted hover:text-rr-text">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          )}
          <kbd className="font-mono text-[10px] text-rr-muted/60 bg-rr-border px-1.5 py-0.5 rounded border border-rr-border/60">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto py-2">
          {Object.entries(groups).length === 0 && (
            <div className="px-4 py-8 text-center font-mono text-[12px] text-rr-muted">
              No results for "{query}"
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 py-1.5 font-mono text-[10px] text-rr-muted/60 uppercase tracking-widest">
                {group}
              </div>
              {items.map((item) => {
                const isCurrent = flatIdx === activeIdx;
                const currentFlatIdx = flatIdx++;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setActiveIdx(currentFlatIdx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      isCurrent ? "bg-rr-green/8 text-rr-text" : "text-rr-muted hover:bg-white/[0.03]"
                    )}
                  >
                    <span
                      className={cn("material-symbols-outlined", isCurrent ? "text-rr-green" : "text-rr-muted")}
                      style={{ fontSize: 16 }}
                    >
                      {item.icon}
                    </span>
                    <span 
                      className="font-mono text-[12px] flex-1 truncate"
                      dangerouslySetInnerHTML={{ __html: item.highlightedLabel }}
                    />
                    {("badge" in item) && (item as any).badge && (
                      <span className="font-mono text-[10px] text-rr-error bg-rr-error/10 border border-rr-error/20 px-1.5 py-0.5 rounded">
                        {(item as any).badge as string}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="material-symbols-outlined text-rr-muted" style={{ fontSize: 14 }}>
                        keyboard_return
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-rr-border bg-rr-bg/50">
          <span className="font-mono text-[10px] text-rr-muted/50 flex items-center gap-1">
            <kbd className="bg-rr-border px-1 rounded">↑↓</kbd> navigate
          </span>
          <span className="font-mono text-[10px] text-rr-muted/50 flex items-center gap-1">
            <kbd className="bg-rr-border px-1 rounded">↵</kbd> open
          </span>
          <span className="font-mono text-[10px] text-rr-muted/50 flex items-center gap-1">
            <kbd className="bg-rr-border px-1 rounded">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
