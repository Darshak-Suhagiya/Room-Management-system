/** Lock + refresh controls inside a meal slot card (admin dashboard). */
export function SlotCardToolbar({
  locked,
  lockBusy,
  refreshing,
  canLock = true,
  onToggleLock,
  onRefresh,
}) {
  return (
    <div
      className="slot-card-toolbar"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {canLock && onToggleLock && (
        <button
          type="button"
          className={`btn btn-sm ${locked ? 'btn-danger' : 'btn-secondary'}`}
          disabled={lockBusy}
          onClick={onToggleLock}
          title={locked ? 'Unlock votes' : 'Lock votes'}
        >
          {lockBusy ? '…' : locked ? '🔒 Locked' : 'Lock'}
        </button>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={refreshing}
        onClick={onRefresh}
        title="Refresh data for this slot"
      >
        {refreshing ? '…' : '↻'}
      </button>
    </div>
  )
}
