export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="9" stroke="var(--line-strong)" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 00-9-9" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="row gap-8 muted"
      style={{ justifyContent: 'center', padding: '64px 0' }}
    >
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
