import Link from 'next/link';

export default function IncidentNotFound() {
  return (
    <div className='flex items-center justify-center h-full min-h-[500px]'>
      <div className='text-center space-y-4'>
        <div className='font-mono text-[10px] text-rr-muted uppercase tracking-widest'>
          404 — Incident Not Found
        </div>
        <div className='font-semibold text-2xl text-rr-text tracking-tight'>
          No incident found
        </div>
        <div className='font-mono text-[12px] text-rr-muted'>
          This incident may have been archived or does not exist.
        </div>
        <Link
          href='/incidents'
          className='inline-flex items-center gap-2 font-mono text-[12px] text-rr-green hover:underline mt-4'
        >
          <span className='material-symbols-outlined' style={{ fontSize: 14 }}>
            arrow_back
          </span>{' '}
          Back to Incidents
        </Link>
      </div>
    </div>
  );
}
