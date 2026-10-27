import { useEffect, useState } from 'react'
import { ChevronRight, Clock, Lock, LockOpen, RefreshCw, WandSparkles } from 'lucide-react'
import { MEAL_SLOTS } from '../../../config/menuItems'
import { subscribeVoteLock } from '../../../services/voteLockService'
import { groupPlannedByCategory } from '../../../utils/groupMenuByCategory'
import { formatItemVoteSummary } from '../../../utils/voteDisplayUtils'
import { triggerSelectionHaptic } from '../../../utils/haptics'
import { MenuSlotNote } from '../../MenuSlotNote'
import { DefaultAppliedLine } from '../../defaults/DefaultChip'
import { isPastDate } from '../../../utils/mealDateUtils'

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
  canApplyDefaults = false,
  applyBusy = false,
  onRequestApplyDefaults,
  onOpenVoteTimes,
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
  const [lockDoc, setLockDoc] = useState(null)
  const locked = Boolean(lockDoc?.locked)

  useEffect(() => {
    return subscribeVoteLock(entry.date, entry.slot, setLockDoc)
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
  const defaultedCount = stats?.mealSummary?.defaulted?.length ?? 0
  const showApplyDefaults =
    canApplyDefaults && notVotedCount > 0 && !isPastDate(entry.date)

  return (
    <article
      className={`votes-mobile-slot-card rail-card slot-panel-${entry.slot}${locked ? ' is-locked' : ''}`}
    >
      <header className="votes-mobile-slot-card-head">
        <h3 className="votes-mobile-slot-card-title">{slotInfo.labelEn}</h3>
        <div className="votes-mobile-action-rail" role="group" aria-label="Slot actions">
          <button
            type="button"
            className="votes-mobile-action-btn"
            disabled={!stats}
            aria-label="Vote times for this menu"
            onClick={() => {
              triggerSelectionHaptic()
              onOpenVoteTimes?.(entry)
            }}
          >
            <Clock size={18} aria-hidden />
            <span>Times</span>
          </button>
          {showApplyDefaults && (
            <button
              type="button"
              className="votes-mobile-action-btn"
              disabled={applyBusy}
              aria-label="Apply default votes"
              onClick={() => {
                triggerSelectionHaptic()
                onRequestApplyDefaults?.(entry, notVotedCount)
              }}
            >
              <WandSparkles size={18} aria-hidden />
              <span>Defaults</span>
            </button>
          )}
          {canLock && (
            <button
              type="button"
              className={`votes-mobile-action-btn${locked ? ' is-danger' : ''}`}
              disabled={lockBusy}
              aria-label={locked ? 'Unlock votes' : 'Lock votes'}
              onClick={() => {
                triggerSelectionHaptic()
                onRequestLock?.(entry, locked)
              }}
            >
              {locked ? <Lock size={18} aria-hidden /> : <LockOpen size={18} aria-hidden />}
              <span>{locked ? 'Unlock' : 'Lock'}</span>
            </button>
          )}
          <button
            type="button"
            className="votes-mobile-action-btn"
            disabled={refreshing}
            aria-label="Refresh slot"
            onClick={() => {
              triggerSelectionHaptic()
              onRefresh?.(entry)
            }}
          >
            <RefreshCw size={18} className={refreshing ? 'is-spinning' : ''} aria-hidden />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <DefaultAppliedLine lock={lockDoc} menu={entry.menu} slot={entry.slot} />
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
                {defaultedCount > 0 ? ` · ${defaultedCount} by default` : ''}
              </span>
              <ChevronRight size={18} className="votes-mobile-slot-chevron" aria-hidden />
            </div>
          </button>
        </>
      )}
    </article>
  )
}
