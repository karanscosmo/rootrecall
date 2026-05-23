import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='min-h-screen bg-rr-bg flex items-center justify-center p-6'>
      <div className='text-center space-y-6 max-w-md'>
        <div className='relative'>
          <div className='font-mono text-[120px] font-bold text-rr-border leading-none select-none'>404</div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <span className='material-symbols-outlined text-rr-green' style={{fontSize:48,fontVariationSettings:"'FILL' 1"}}>search_off</span>
          </div>
        </div>
        <div className='font-mono text-[10px] text-rr-muted/60 uppercase tracking-widest'>INCIDENT NOT FOUND</div>
        <h1 className='text-2xl font-semibold text-rr-text tracking-tight'>Page not found</h1>
        <p className='font-mono text-[12px] text-rr-muted'>The route you are looking for does not exist or has been archived.</p>
        <div className='font-mono text-[11px] text-rr-muted/40 bg-rr-surface border border-rr-border rounded-lg p-3 text-left'>
          <div>&gt; rootrecall: route not found in operational map</div>
          <div>&gt; initiating fallback navigation...</div>
        </div>
        <Link href='/dashboard' className='inline-flex items-center justify-center gap-2 bg-rr-green text-rr-bg font-mono text-[12px] font-bold px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity w-full shadow-[0_0_12px_rgba(103,247,177,0.2)]'>
          <span className='material-symbols-outlined' style={{fontSize:16}}>home</span>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
