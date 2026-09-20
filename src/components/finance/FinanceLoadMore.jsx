export function FinanceLoadMore({
  shown = 0,
  hasMore = false,
  loading = false,
  onClick,
  endedLabel = 'End of history.',
}) {
  if (shown === 0 && !loading) return null
  if (!hasMore) {
    return shown > 0 ? <p className="muted finance-load-more-end">{endedLabel}</p> : null
  }
  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={loading}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {loading ? <span className="btn-spinner" aria-hidden /> : null}
      {loading ? 'Loading…' : 'Load more'}
    </button>
  )
}
