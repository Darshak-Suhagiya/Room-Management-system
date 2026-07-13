import { useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { VOTE_TYPES } from '../config/voteTypes'
import { formatQuantity, parseOverrideTotal } from '../utils/voteQuantityUtils'
import { groupPlannedByCategory } from '../utils/groupMenuByCategory'
import { MenuSlotNote } from './MenuSlotNote'

function NameChips({ people, variant = '' }) {
  if (!people?.length) return null
  return (
    <div className={`slot-detail-chips ${variant}`}>
      {people.map((p) => (
        <span key={p.userId} className="slot-detail-chip">
          {p.name}
        </span>
      ))}
    </div>
  )
}

function AttendanceTile({ title, people, tone }) {
  const count = people?.length ?? 0
  return (
    <div className={`slot-detail-attend-tile tone-${tone}`}>
      <div className="slot-detail-attend-head">
        <span className="slot-detail-attend-title">{title}</span>
        <span className="slot-detail-attend-count">{count}</span>
      </div>
      {count > 0 ? (
        <NameChips people={people} />
      ) : (
        <span className="muted slot-detail-attend-empty">None</span>
      )}
    </div>
  )
}

function CompactTotalEditor({ stat, onSaveOverride, saving, onInvalid }) {
  const isInteger = stat.voteType === VOTE_TYPES.INTEGER
  const votedBase = isInteger ? stat.votedSum : stat.votedYesCount
  const display = isInteger ? stat.displayTotal : stat.displayYes
  const [value, setValue] = useState(
    stat.hasOverride ? String(display) : String(votedBase),
  )
  const [inputError, setInputError] = useState(false)

  return (
    <div className="slot-detail-adjust">
      <div className="slot-detail-adjust-row">
        <input
          type="number"
          min={0}
          step={isInteger ? 0.5 : 1}
          inputMode={isInteger ? 'decimal' : 'numeric'}
          aria-label={isInteger ? 'Total count' : 'Total yes'}
          className={`vote-inline-input ${inputError ? 'vote-input-error' : ''}`}
          value={value}
          disabled={saving}
          onChange={(e) => {
            setValue(e.target.value)
            setInputError(false)
          }}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={saving}
          onClick={() => {
            const parsed = parseOverrideTotal(value, { integer: isInteger })
            if (!parsed.ok) {
              setInputError(true)
              onInvalid?.(parsed.message)
              return
            }
            setInputError(false)
            onSaveOverride(stat.item.id, parsed.value)
          }}
        >
          {saving ? '…' : 'Set'}
        </button>
      </div>
      {stat.hasOverride && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={saving}
          onClick={() => onSaveOverride(stat.item.id, null)}
        >
          Use vote count
        </button>
      )}
    </div>
  )
}

function WhoCell({ stat }) {
  if (stat.voteType === VOTE_TYPES.INTEGER) {
    const voted = stat.integerVotes.map((v) => ({
      userId: v.userId,
      name: `${v.name} — ${formatQuantity(v.value)}`,
    }))
    return (
      <div className="slot-detail-who">
        {voted.length > 0 && (
          <div className="slot-detail-who-group">
            <span className="slot-detail-who-label yes">Voted</span>
            <NameChips people={voted} variant="yes" />
          </div>
        )}
        {stat.notVoted?.length > 0 && (
          <div className="slot-detail-who-group">
            <span className="slot-detail-who-label muted">Not voted</span>
            <NameChips people={stat.notVoted} variant="muted" />
          </div>
        )}
        {voted.length === 0 && !stat.notVoted?.length && (
          <span className="muted">—</span>
        )}
      </div>
    )
  }

  return (
    <div className="slot-detail-who">
      {stat.yes?.length > 0 && (
        <div className="slot-detail-who-group">
          <span className="slot-detail-who-label yes">Yes</span>
          <NameChips people={stat.yes} variant="yes" />
        </div>
      )}
      {stat.no?.length > 0 && (
        <div className="slot-detail-who-group">
          <span className="slot-detail-who-label no">No</span>
          <NameChips people={stat.no} variant="no" />
        </div>
      )}
      {stat.notVoted?.length > 0 && (
        <div className="slot-detail-who-group">
          <span className="slot-detail-who-label muted">Not voted</span>
          <NameChips people={stat.notVoted} variant="muted" />
        </div>
      )}
      {!stat.yes?.length && !stat.no?.length && !stat.notVoted?.length && (
        <span className="muted">—</span>
      )}
    </div>
  )
}

function ItemTotalCell({ stat }) {
  const isInteger = stat.voteType === VOTE_TYPES.INTEGER
  const display = isInteger ? formatQuantity(stat.displayTotal) : stat.displayYes

  return (
    <div className="slot-detail-total-cell">
      <strong>{display}</strong>
      {stat.hasOverride && (
        <span className="total-adjusted-badge"> adjusted</span>
      )}
    </div>
  )
}

function VotesCell({ stat, showVoteBreakdown }) {
  if (!showVoteBreakdown) return <span className="muted">—</span>
  const isInteger = stat.voteType === VOTE_TYPES.INTEGER
  const raw = isInteger ? formatQuantity(stat.votedSum) : stat.votedYesCount
  return <span className="slot-detail-votes-cell">{raw}</span>
}

export function MealSlotDetailModal({
  stats,
  mealLabel,
  dateLabel,
  everyoneNote,
  cookNote,
  slot,
  canAdjustTotals = false,
  showVoteBreakdown = true,
  onSaveOverride,
  overrideSavingId,
  onClose,
}) {
  const toast = useToast()
  if (!stats) return null

  const handleInvalid = (message) => {
    toast.error(message ?? 'Invalid value.')
  }

  const grouped = groupPlannedByCategory(
    stats.plannedItems ?? [],
    stats.catalog,
  )
  const statByItemId = Object.fromEntries(
    stats.itemStats.map((s) => [s.item.id, s]),
  )

  const showAdjustCol = canAdjustTotals && Boolean(onSaveOverride)
  const colCount = 3 + (showVoteBreakdown ? 1 : 0) + (showAdjustCol ? 1 : 0)

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="modal-dialog modal-dialog-wide slot-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-slot-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="meal-slot-modal-title">{mealLabel}</h2>
            <p className="modal-subtitle">{dateLabel}</p>
            {everyoneNote?.trim() && (
              <MenuSlotNote
                note={everyoneNote}
                slot={slot}
                label="Notice"
                className="menu-slot-note-in-modal"
              />
            )}
            {cookNote?.trim() && (
              <MenuSlotNote
                note={cookNote}
                slot={slot}
                label="Cook note"
                className="menu-slot-note-in-modal"
              />
            )}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="modal-body slot-detail-body">
          <div className="slot-detail-attendance">
            <AttendanceTile
              title="Not eating"
              people={stats.mealSummary.notEating}
              tone="danger"
            />
            <AttendanceTile
              title="Not voted"
              people={stats.mealSummary.notVotedMeal}
              tone="muted"
            />
            <AttendanceTile
              title="Voted"
              people={stats.mealSummary.votedMeal}
              tone="success"
            />
          </div>

          {showAdjustCol && (
            <p className="muted modal-admin-hint">
              Adjust totals when guest count differs from votes — number items
              (half steps OK) or yes counts for yes/no dishes.
            </p>
          )}

          {grouped.map(({ category, items }, catIndex) => (
            <div
              key={category.id}
              className={`slot-detail-category ${catIndex > 0 ? 'has-separator' : ''}`}
            >
              <h3 className="menu-category-title">{category.labelGu}</h3>
              <div className="slot-detail-table-wrap">
                <table className="slot-detail-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Total</th>
                      {showVoteBreakdown && <th>Votes</th>}
                      {showAdjustCol && <th>Adjust</th>}
                      <th>Who</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const stat = statByItemId[item.id]
                      if (!stat) return null
                      const canOverride =
                        stat.voteType === VOTE_TYPES.INTEGER ||
                        stat.voteType === VOTE_TYPES.YES_NO
                      return (
                        <tr key={item.id}>
                          <td className="slot-detail-item-name">{item.gu}</td>
                          <td>
                            <ItemTotalCell stat={stat} />
                          </td>
                          {showVoteBreakdown && (
                            <td>
                              <VotesCell
                                stat={stat}
                                showVoteBreakdown={showVoteBreakdown}
                              />
                            </td>
                          )}
                          {showAdjustCol && (
                            <td>
                              {canOverride ? (
                                <CompactTotalEditor
                                  key={`${item.id}-${stat.hasOverride}-${stat.displayTotal}-${stat.displayYes}`}
                                  stat={stat}
                                  onSaveOverride={onSaveOverride}
                                  saving={overrideSavingId === item.id}
                                  onInvalid={handleInvalid}
                                />
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                          )}
                          <td>
                            <WhoCell stat={stat} />
                          </td>
                        </tr>
                      )
                    })}
                    {items.every((item) => !statByItemId[item.id]) && (
                      <tr>
                        <td colSpan={colCount} className="muted">
                          No item stats.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
