/**
 * PulseLine — the signature visual motif of the product.
 * An ECG-style waveform that doubles as a section divider (static, subtle)
 * and a loading indicator during AI matching (animated, glowing).
 * This isn't decoration — it's literally the subject (a heartbeat)
 * doing the interface's structural work.
 */
export default function PulseLine({ variant = 'divider', className = '' }) {
  const isActive = variant === 'active';

  return (
    <div className={`w-full ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 400 40"
        className="w-full h-8 md:h-10"
        preserveAspectRatio="none"
      >
        <path
          d="M0 20 L60 20 L75 20 L85 4 L95 36 L105 20 L115 20 L400 20"
          fill="none"
          stroke={isActive ? 'var(--color-blood-bright)' : 'var(--color-ink-line)'}
          strokeWidth={isActive ? 1.5 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isActive ? 'animate-pulse-glow' : ''}
        />
        {isActive && (
          <path
            d="M0 20 L60 20 L75 20 L85 4 L95 36 L105 20 L115 20 L400 20"
            fill="none"
            stroke="var(--color-blood)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="40 960"
            className="animate-pulse-travel"
          />
        )}
      </svg>
    </div>
  );
}
