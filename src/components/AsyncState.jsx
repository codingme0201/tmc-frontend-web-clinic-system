export function LoadingState({ label = 'Loading...' }) {
  return (
    <div
      className="flex min-h-[120px] flex-col items-center justify-center gap-[10px] p-[40px_20px] text-center text-muted"
      role="status"
    >
      <span
        className="size-[26px] animate-spin rounded-full border-[3px] border-[#dce8e5] border-t-primary"
        aria-hidden="true"
      />
      <p className="m-0 text-[13px] font-bold">{label}</p>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div
      className="flex min-h-[120px] flex-col items-center justify-center gap-[10px] p-[40px_20px] text-center text-danger"
      role="alert"
    >
      <strong>⚠ {message}</strong>
      {onRetry && (
        <button
          type="button"
          className="mt-1 cursor-pointer rounded-full bg-bg px-[14px] py-2 text-[13px] font-extrabold text-primary transition-colors duration-200 hover:bg-[#dbeae5]"
          onClick={onRetry}
        >
          Try Again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ message = 'No records found.' }) {
  return (
    <div className="min-h-0 p-[26px_16px] text-[13px] font-bold text-muted">{message}</div>
  )
}
