// MIYASHI logo: a baobab — the tree markets gather under — growing in the valley of the "M".
type Props = { className?: string; title?: string };

export function BrandMark({ className = "w-10 h-10", title = "MIYASHI" }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="mk-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD24A" />
          <stop offset="1" stopColor="#F2A90C" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="16" fill="url(#mk-gold)" />
      {/* the M, set low to leave room for the tree */}
      <path d="M10 55V25h8.2L32 43.5 45.8 25H54v30h-7.6V37.6L35.2 51.5h-6.4L17.6 37.6V55z" fill="#0D0B12" />
      {/* baobab: bottle trunk rising from the valley of the M, short branches, wide flat crown */}
      <path d="M27.6 45.5c.9-7.5 1.8-15 2.7-22.8h3.4c.9 7.8 1.8 15.3 2.7 22.8z" fill="#0D0B12" />
      <g stroke="#0D0B12" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M31.2 24 22 14.5" /><path d="M31.6 23.4 26.8 11.4" /><path d="M32 23V10" /><path d="M32.4 23.4 37.2 11.4" /><path d="M32.8 24 42 14.5" />
      </g>
      <g fill="#0D0B12">
        <ellipse cx="32" cy="10.4" rx="13" ry="3.1" />
        <ellipse cx="20.2" cy="13.6" rx="5.2" ry="2.4" />
        <ellipse cx="43.8" cy="13.6" rx="5.2" ry="2.4" />
        <ellipse cx="26" cy="8.6" rx="4.6" ry="2" />
        <ellipse cx="38" cy="8.6" rx="4.6" ry="2" />
      </g>
    </svg>
  );
}

/** Logo + wordmark. */
export function BrandLogo({ className = "", size = "w-10 h-10", wordClass = "text-xl" }: { className?: string; size?: string; wordClass?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark className={`${size} shrink-0 drop-shadow-[0_6px_18px_hsl(42_100%_55%/0.35)]`} />
      <span className={`font-display font-black tracking-tight ${wordClass}`}>MIYASHI</span>
    </span>
  );
}
