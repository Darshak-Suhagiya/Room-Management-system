import { useEffect, useState } from 'react'
import { ChevronRight, Lock, LockOpen, RefreshCw } from 'lucide-react'
import { MEAL_SLOTS } from '../../../config/menuItems'
import { subscribeVoteLock } from '../../../services/voteLockService'
import { groupPlannedByCategory } from '../../../utils/groupMenuByCategory'
import { formatItemVoteSummary } from '../../../utils/voteDisplayUtils'
import { triggerSelectionHaptic } from '../../../utils/haptics'
import { MenuSlotNote } from '../../MenuSlotNote'

export function VotesSlotCard({
  entry,
  stats,
  canLock = false,
  showVoteBreakdown = true,
  lockBusy = false,
  refreshing = false,
  showEveryoneNote = true,
  showMaharajNote = false,
  onRequestLock,
  onRefresh,
  onOpenDetail,
}) {
  const slotInfo = MEAL_SLOTS[entry.slot]
  const everyoneNote =
    entry.slot === 'morning'
      ? entry.menu?.morningNote
      : entry.menu?.eveningNote
  const maharajNote =
    entry.slot === 'morning'
      ? entry.menu?.morningMaharajNote
      : entry.menu?.eveningMaharajNote
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    return subscribeVoteLock(entry.date, entry.slot, (data) => {
      setLocked(Boolean(data?.locked))
    })
  }, [entry.date, entry.slot])

  const grouped = groupPlannedByCategory(
    stats?.plannedItems ?? [],
    stats?.catalog,
  )
  const statByItemId = Object.fromEntries(
    (stats?.itemStats ?? []).map((s) => [s.item.id, s]),
  )

  const notVotedCount = stats?.mealSummary?.notVotedMeal?.length ?? 0
  const notEatingCount = stats?.mealSummary?.notEating?.length ?? 0

  return (
    <article
      className={`votes-mobile-slot-card rail-card slot-panel-${entry.slot}${locked ? ' is-locked' : ''}`}
    >
      <header className="votes-mobile-slot-card-head">
        <div className="votes-mobile-slot-card-title-row">
          <h3 className="votes-mobile-slot-card-title">{slotInfo.labelEn}</h3>
          {locked && (
            <span className="votes-mobile-lock-badge">
              <Lock size={12} aria-hidden /> Locked
            </span>
          )}
        </div>
        <div className="votes-mobile-slot-card-actions">
          {canLock && (
            <button
              type="button"
              className={`btn btn-sm ${locked ? 'btn-danger' : 'btn-secondary'}`}
              disabled={lockBusy}
              aria-label={locked ? 'Unlock votes' : 'Lock votes'}
              onClick={() => {
                triggerSelectionHaptic()
                onRequestLock?.(entry, locked)
              }}
            >
              {lockBusy ? '…' : locked ? <Lock size={16} /> : <LockOpen size={16} />}
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={refreshing}
            aria-label="Refresh slot"
            onClick={() => {
              triggerSelectionHaptic()
              onRefresh?.(entry)
            }}
          >
            <RefreshCw size={16} className={refreshing ? 'is-spinning' : ''} aria-hidden />
          </button>
        </div>
      </header>

      {showEveryoneNote && everyoneNote?.trim() && (
        <MenuSlotNote note={everyoneNote} slot={entry.slot} />
      )}
      {showMaharajNote && maharajNote?.trim() && (
        <MenuSlotNote note={maharajNote} slot={entry.slot} label="Cook note" />
      )}

      {!stats ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <button
            type="button"
            className="votes-mobile-slot-card-body"
            onClick={() => {
              triggerSelectionHaptic()
              onOpenDetail?.(entry, stats, locked)
            }}
          >
            {grouped.map(({ category, items }) => (
              <div key={category.id} className="votes-mobile-slot-cat">
                <p className="votes-mobile-slot-cat-title muted">{category.labelGu}</p>
                <ul className="votes-mobile-slot-dish-list">
                  {items.map((item) => {
                    const stat = statByItemId[item.id]
                    if (!stat) return null
                    return (
                      <li key={item.id} className="votes-mobile-slot-dish">
                        <span className="votes-mobile-slot-dish-name">{item.gu}</span>
                        <span className="vote-badge vote-badge-summary">
                          {formatItemVoteSummary(stat, showVoteBreakdown)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}

            <div className="votes-mobile-slot-card-foot">
              <span className="muted">
                {notVotedCount > 0
                  ? `${notVotedCount} not voted`
                  : 'Everyone voted'}
                {notEatingCount > 0 ? ` · ${notEatingCount} not eating` : ''}
              </span>
              <ChevronRight size={18} className="votes-mobile-slot-chevron" aria-hidden />
            </div>
          </button>
        </>
      )}
    </article>
  )
}
