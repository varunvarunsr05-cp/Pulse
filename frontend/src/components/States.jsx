import PulseLine from './PulseLine';

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-4">
      <div className="w-full max-w-xs">
        <PulseLine variant="active" />
      </div>
      <p className="text-sm text-[var(--color-bone-dim)] font-mono">{label}</p>
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center border border-dashed border-[var(--color-ink-line)] rounded-sm">
      <h3 className="text-[var(--color-bone)] font-medium mb-2">{title}</h3>
      {body && <p className="text-sm text-[var(--color-bone-dim)] max-w-sm mb-5">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center text-center border border-[var(--color-blood)] bg-[var(--color-blood-dim)] rounded-sm">
      <p className="text-sm text-[var(--color-bone)] mb-4">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm px-4 py-2 bg-[var(--color-blood)] hover:bg-[var(--color-blood-bright)] rounded-sm transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
