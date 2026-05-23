// ─────────────────────────────────────────────────────────────────────────────
// RootRecall · Dashboard Loading State
// Cinematic scanning animation — not a spinner
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardLoading() {
  return (
    <div className='flex items-center justify-center h-full min-h-[400px]'>
      <div className='flex flex-col items-center gap-4'>
        <div className='relative w-12 h-12 border border-rr-green/30 rounded-lg flex items-center justify-center'>
          <div className='scanner-line' />
          <span
            className='material-symbols-outlined text-rr-green'
            style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}
          >
            radar
          </span>
        </div>
        <div className='font-mono text-[11px] text-rr-muted'>
          Initializing telemetry stream...
        </div>
        <div className='flex gap-1'>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className='w-1 h-1 rounded-full bg-rr-green animate-pulse'
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
