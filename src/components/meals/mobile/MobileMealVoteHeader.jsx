import { Lock as IconLock, Moon as IconMoon, RefreshCw as IconRefresh, Sun as IconSun } from 'lucide-react'

export function MobileMealVoteHeader({
  slot,
  slotLabel,
  hydrated,
  isComplete,
  locked,
  refreshing,
  onRefresh,
}) {
  const SlotIcon = slot === 'morning' ? IconSun : IconMoon

  return (
    <header className="meal-vote-mobile-header">
      <div className="meal-vote-mobile-header-main">
        <span className={`meal-vote-mobile-header-icon slot-icon-${slot}`} aria-hidden>
          <SlotIcon size={20} />
        </span>
        <h3 className="meal-vote-mobile-header-title">{slotLabel}</h3>
        {hydrated && (
          <span
            className={`vote-status-pill ${isComplete ? 'is-done' : 'is-pending'}`}
          >
            {isComplete ? 'Voted' : 'Not voted'}
          </span>
        )}
      </div>
      <div className="meal-vote-mobile-header-actions">
        {locked && (
          <span className="lock-badge">
            <IconLock size={14} />
            Locked
          </span>
        )}
        {onRefresh && (
          <button
            type="button"
            className="btn btn-icon btn-ghost meal-vote-mobile-refresh"
            disabled={refreshing}
            onClick={onRefresh}
            title="Refresh menu and votes"
            aria-label="Refresh"
          >
            <IconRefresh size={18} className={refreshing ? 'spin' : ''} />
          </button>
        )}
      </div>
    </header>
  )
}
