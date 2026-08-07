/**
 * ScoreRing — radial meter for an AI match score (0-100).
 * Reinforces the "measured, not vibes" feel: a precise number
 * inside a ring rather than a generic flat progress bar.
 */
export default function ScoreRing({ score = 0, size = 56 }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;

  const color =
    score >= 75 ? 'var(--color-sage)' : score >= 45 ? 'var(--color-amber)' : 'var(--color-blood)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ink-line)"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute font-mono text-xs font-semibold" style={{ color }}>
        {Math.round(score)}
      </span>
    </div>
  );
}
