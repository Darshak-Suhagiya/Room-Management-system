import { Modal } from '../../ui/Modal'
import { MenuSlotNote } from '../../MenuSlotNote'
import { CookItemInfoButton } from '../../MenuItemDetailModal'
import { groupPlannedByCategory } from '../../../utils/groupMenuByCategory'
import { VotesDishAdjustRow } from './VotesDishAdjustRow'

function AttendanceSection({ title, people, tone }) {
  const count = people?.length ?? 0
  return (
    <details className={`votes-mobile-attend tone-${tone}`}>
      <summary>
        <span>{title}</span>
        <span className="votes-mobile-attend-count">{count}</span>
      </summary>
      {count === 0 ? (
        <p className="muted">None</p>
      ) : (
        <div className="votes-mobile-who-chips">
          {people.map((p) => (
            <span key={p.userId} className="votes-mobile-who-chip">
              {p.name}
            </span>
          ))}
        </div>
      )}
    </details>
  )
}

export function VotesSlotDetailSheet({
  open,
  onClose,
  stats,
  mealLabel,
  dateLabel,
  everyoneNote,
  cookNote,
  slot,
  canAdjustTotals = false,
  showVoteBreakdown = true,
  showCookItemDetails = false,
  overrideSavingId,
  onSaveOverride,
  onOpenItemDetail,
}) {
  if (!stats) return null

  const grouped = groupPlannedByCategory(
    stats.plannedItems ?? [],
    stats.catalog,
  )
  const statByItemId = Object.fromEntries(
    stats.itemStats.map((s) => [s.item.id, s]),
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mealLabel}
      subtitle={dateLabel}
      fullScreenMobile
      className="votes-mobile-detail-sheet"
    >
      <div className="votes-mobile-detail mobile-section-gap">
        {(everyoneNote?.trim() || cookNote?.trim()) && (
          <div className="votes-mobile-detail-notes">
            {everyoneNote?.trim() && (
              <MenuSlotNote note={everyoneNote} slot={slot} label="Notice" />
            )}
            {cookNote?.trim() && (
              <MenuSlotNote note={cookNote} slot={slot} label="Cook note" />
            )}
          </div>
        )}

        <div className="votes-mobile-attend-list">
          <AttendanceSection
            title="Not eating"
            people={stats.mealSummary.notEating}
            tone="danger"
          />
          <AttendanceSection
            title="Not voted"
            people={stats.mealSummary.notVotedMeal}
            tone="muted"
          />
          <AttendanceSection
            title="Voted"
            people={stats.mealSummary.votedMeal}
            tone="success"
          />
        </div>

        {canAdjustTotals && (
          <p className="muted votes-mobile-adjust-hint">
            Adjust totals when guest count differs from votes.
          </p>
        )}

        {grouped.map(({ category, items }) => (
          <section key={category.id} className="votes-mobile-detail-cat">
            <h4 className="votes-mobile-detail-cat-title">{category.labelGu}</h4>
            <div className="votes-mobile-detail-dishes">
              {items.map((item) => {
                const stat = statByItemId[item.id]
                if (!stat) return null
                return (
                  <div key={item.id} className="votes-mobile-detail-dish-wrap">
                    {showCookItemDetails && (item.notes || item.recipe) && (
                      <div className="votes-mobile-dish-info-row">
                        <span className="votes-mobile-dish-info-label">{item.gu}</span>
                        <CookItemInfoButton item={item} onOpen={onOpenItemDetail} />
                      </div>
                    )}
                    <VotesDishAdjustRow
                      key={`${item.id}-${stat.hasOverride}-${stat.displayTotal}-${stat.displayYes}`}
                      stat={stat}
                      showVoteBreakdown={showVoteBreakdown}
                      canAdjust={canAdjustTotals}
                      saving={overrideSavingId === item.id}
                      onSaveOverride={onSaveOverride}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  )
}
