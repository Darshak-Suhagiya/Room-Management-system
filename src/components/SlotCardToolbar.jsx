import { Clock, Lock, LockOpen, RefreshCw, WandSparkles } from 'lucide-react'

function RailButton({ label, title, disabled, tone = '', onClick, children }) {
  return (
    <button
      type="button"
      className={`slot-action-rail-btn${tone ? ` is-${tone}` : ''}`}
      disabled={disabled}
      aria-label={title || label}
      title={title || label}
      onClick={onClick}
    >
      <span className="slot-action-rail-icon">{children}</span>
      <span className="slot-action-rail-label">{label}</span>
    </button>
  )
}

/** Segmented actions for one vote-dashboard slot: times, defaults, lock, refresh. */
export function SlotCardToolbar({
  locked,
  lockBusy,
  refreshing,
  canLock = true,
  onToggleLock,
  onRefresh,
  showApplyDefaults = false,
  applyBusy = false,
  onApplyDefaults,
  canOpenTimes = true,
  onOpenTimes,
}) {
  return (
    <div
      className="slot-action-rail"
      role="group"
      aria-label="Slot actions"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <RailButton
        label="Times"
        title="Vote times for this menu"
        disabled={!canOpenTimes}
        onClick={onOpenTimes}
      >
        <Clock size={16} aria-hidden />
      </RailButton>
      {showApplyDefaults && onApplyDefaults && (
        <RailButton
          label="Defaults"
          title="Fill default votes for members who haven't voted, then lock"
          disabled={applyBusy}
          onClick={onApplyDefaults}
        >
          <WandSparkles size={16} aria-hidden />
        </RailButton>
      )}
      {canLock && onToggleLock && (
        <RailButton
          label={locked ? 'Unlock' : 'Lock'}
          title={locked ? 'Unlock votes' : 'Lock votes'}
          disabled={lockBusy}
          tone={locked ? 'danger' : ''}
          onClick={onToggleLock}
        >
          {locked ? <Lock size={16} aria-hidden /> : <LockOpen size={16} aria-hidden />}
        </RailButton>
      )}
      <RailButton
        label="Refresh"
        title="Refresh this slot"
        disabled={refreshing}
        onClick={onRefresh}
      >
        <RefreshCw size={16} className={refreshing ? 'is-spinning' : ''} aria-hidden />
      </RailButton>
    </div>
  )
}
