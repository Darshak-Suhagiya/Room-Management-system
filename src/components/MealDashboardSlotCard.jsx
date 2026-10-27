import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { MEAL_SLOTS } from '../config/menuItems'
import { subscribeVoteLock } from '../services/voteLockService'
import { groupPlannedByCategory } from '../utils/groupMenuByCategory'
import { formatItemVoteSummary } from '../utils/voteDisplayUtils'
import { MenuSlotNote } from './MenuSlotNote'
import { SlotCardToolbar } from './SlotCardToolbar'
import { CookItemInfoButton } from './MenuItemDetailModal'
import { DefaultAppliedLine } from './defaults/DefaultChip'
import { isPastDate } from '../utils/mealDateUtils'

export function MealDashboardSlotCard({
  entry,
  stats,
  isToday,
  onCardClick,
  showSlotToolbar = false,
  canLock = false,
  showVoteBreakdown = true,
  lockBusy = false,
  refreshing = false,
  onToggleLock,
  onRefresh,
  showEveryoneNote = true,
  showMaharajNote = false,
  showCookItemDetails = false,
  onOpenItemDetail,
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

  const notVotedCount = stats?.mealSummary?.notVotedMeal?.length ?? 0
  const showApplyDefaults =
    canApplyDefaults && notVotedCount > 0 && !isPastDate(entry.date)
  const applyProps = {
    showApplyDefaults,
    applyBusy,
    onApplyDefaults: () => onRequestApplyDefaults?.(entry, notVotedCount),
  }

  const grouped = groupPlannedByCategory(
    stats?.plannedItems ?? [],
    stats?.catalog,
  )

  if (!stats) {
    return (
      <article
        className={`meal-vote-panel slot-panel-${entry.slot} ${locked ? 'is-locked' : ''}`}
      >
        <div className="slot-card-header">
          <div className="slot-card-title">
            <h3>{slotInfo.labelEn}</h3>
          </div>
          {showSlotToolbar && onRefresh && (
            <SlotCardToolbar
              locked={locked}
              lockBusy={lockBusy}
              refreshing={refreshing}
              canLock={canLock}
              onToggleLock={() => onToggleLock?.(locked)}
              onRefresh={onRefresh}
              canOpenTimes={false}
              {...applyProps}
            />
          )}
        </div>
        {showEveryoneNote && (
          <MenuSlotNote note={everyoneNote} slot={entry.slot} />
        )}
        {showMaharajNote && (
          <MenuSlotNote
            note={maharajNote}
            slot={entry.slot}
            label="Cook note"
          />
        )}
        <p className="muted">Loading…</p>
      </article>
    )
  }

  const statByItemId = Object.fromEntries(
    stats.itemStats.map((s) => [s.item.id, s]),
  )

  return (
    <article
      className={`meal-vote-panel slot-panel-${entry.slot} meal-card-clickable ${isToday ? 'slot-today' : ''} ${locked ? 'is-locked' : ''}`}
    >
      <div className="slot-card-header">
        <div className="slot-card-title">
          <h3>{slotInfo.labelEn}</h3>
        </div>
        {showSlotToolbar && onRefresh && (
          <SlotCardToolbar
            locked={locked}
            lockBusy={lockBusy}
            refreshing={refreshing}
            canLock={canLock}
            onToggleLock={() => onToggleLock?.(locked)}
            onRefresh={onRefresh}
            canOpenTimes={Boolean(stats)}
            onOpenTimes={() => onOpenVoteTimes?.(entry)}
            {...applyProps}
          />
        )}
      </div>
      <DefaultAppliedLine lock={lockDoc} menu={entry.menu} slot={entry.slot} />
      {showEveryoneNote && (
        <MenuSlotNote note={everyoneNote} slot={entry.slot} />
      )}
      {showMaharajNote && (
        <MenuSlotNote note={maharajNote} slot={entry.slot} label="Cook note" />
      )}

      <button
        type="button"
        className="slot-card-body-btn"
        onClick={() => onCardClick(stats)}
      >
        {grouped.map(({ category, items }, catIndex) => (
          <div
            key={category.id}
            className={`menu-category-block ${catIndex > 0 ? 'has-separator' : ''}`}
          >
            <h4 className="menu-category-title">{category.labelGu}</h4>
            <ul className="menu-vote-list">
              {items.map((item, itemIndex) => {
                const stat = statByItemId[item.id]
                if (!stat) return null
                return (
                  <li
                    key={item.id}
                    className={
                      itemIndex < items.length - 1 ? 'has-item-separator' : ''
                    }
                  >
                    <div className="menu-item-with-vote">
                      <span className="menu-item-name menu-item-name-with-info">
                        {item.gu}
                        {showCookItemDetails && (
                          <CookItemInfoButton
                            item={item}
                            onOpen={onOpenItemDetail}
                          />
                        )}
                      </span>
                      <span className="vote-badge vote-badge-summary">
                        {formatItemVoteSummary(stat, showVoteBreakdown)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <footer className="slot-card-footer">
          <div className="slot-card-footer-copy">
          {stats.mealSummary.notVotedMeal.length > 0 ? (
            <div className="not-voted-footer">
              <strong>Not voted ({stats.mealSummary.notVotedMeal.length}):</strong>
              <span>
                {stats.mealSummary.notVotedMeal.map((p) => p.name).join(', ')}
              </span>
            </div>
          ) : (
            <p className="not-voted-footer all-voted">Everyone voted</p>
          )}
          {stats.mealSummary.defaulted?.length > 0 && (
            <div className="not-voted-footer default-voted-footer">
              <strong>By default ({stats.mealSummary.defaulted.length}):</strong>
              <span>
                {stats.mealSummary.defaulted.map((p) => p.name).join(', ')}
              </span>
            </div>
          )}
          {stats.mealSummary.notEating.length > 0 && (
            <div className="not-voted-footer not-eating-footer">
              <strong>Not eating ({stats.mealSummary.notEating.length}):</strong>
              <span>
                {stats.mealSummary.notEating.map((p) => p.name).join(', ')}
              </span>
            </div>
          )}
          </div>
          <ChevronRight size={18} className="slot-card-chevron" aria-hidden />
        </footer>
      </button>
    </article>
  )
}
