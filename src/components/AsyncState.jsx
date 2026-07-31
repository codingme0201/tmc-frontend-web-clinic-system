export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="async-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="async-state error" role="alert">
      <strong>⚠ {message}</strong>
      {onRetry && (
        <button type="button" className="secondary-pill" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ message = 'No records found.' }) {
  return <div className="async-state empty">{message}</div>
}
