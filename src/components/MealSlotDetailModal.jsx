import { useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { VOTE_TYPES } from '../config/voteTypes'
import { formatQuantity, parseOverrideTotal } from '../utils/voteQuantityUtils'
import { groupPlannedByCategory } from '../utils/groupMenuByCategory'
import { MenuSlotNote } from './MenuSlotNote'

function PersonList({ title, people, variant }) {
  if (!people?.length) return null
  return (
    <div className={`modal-person-list ${variant ?? ''}`}>
      <strong>{title}</strong>
      <ul>
        {people.map((p) => (
          <li key={p.userId}>{p.name}</li>
        ))}
      </ul>
    </div>
  )
}

function TotalCountEditor({ stat, onSaveOverride, saving, onInvalid }) {
  const isInteger = stat.voteType === VOTE_TYPES.INTEGER
  const votedBase = isInteger ? stat.votedSum : stat.votedYesCount
  const display = isInteger ? stat.displayTotal : stat.displayYes
  const [value, setValue] = useState(
    stat.hasOverride ? String(display) : String(votedBase),
  )
  const [inputError, setInputError] = useState(false)

  return (
    <div className="integer-total-editor">
      <p className="modal-item-summary">
        {isInteger ? 'Sum from votes' : 'Yes votes'}: <strong>{votedBase}</strong>
        {stat.hasOverride && (
          <>
            {' '}
            · Adjusted total: <strong>{display}</strong>
          </>
        )}
      </p>
      <div className="integer-total-editor-row">
        <label>
          {isInteger ? 'Total count' : 'Total yes'}
          <input
            type="number"
            min={0}
            step={isInteger ? 0.5 : 1}
            inputMode={isInteger ? 'decimal' : 'numeric'}
            className={`vote-inline-input ${inputError ? 'vote-input-error' : ''}`}
            value={value}
            disabled={saving}
            onChange={(e) => {
              setValue(e.target.value)
              setInputError(false)
            }}
          />
        </label>
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
          {saving ? '…' : 'Set total'}
        </button>
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
    </div>
  )
}

function ItemDetailSection({
  stat,
  canAdjustTotals,
  showVoteBreakdown,
  onSaveOverride,
  overrideSavingId,
  onInvalid,
}) {
  const { item } = stat
  const saving = overrideSavingId === item.id
  const canOverride =
    stat.voteType === VOTE_TYPES.INTEGER ||
    stat.voteType === VOTE_TYPES.YES_NO

  return (
    <section className="modal-item-section">
      <h3 className="modal-item-title">{item.gu}</h3>
      {stat.voteType === VOTE_TYPES.INTEGER ? (
        <>
          {canAdjustTotals && onSaveOverride ? (
            <TotalCountEditor
              stat={stat}
              onSaveOverride={onSaveOverride}
              saving={saving}
              onInvalid={onInvalid}
            />
          ) : (
            <p className="modal-item-summary">
              Total: {formatQuantity(stat.displayTotal)}
              {canAdjustTotals && stat.hasOverride && (
                <span className="total-adjusted-badge"> (adjusted)</span>
              )}
              {showVoteBreakdown &&
                stat.hasOverride &&
                stat.votedSum !== stat.displayTotal && (
                <span className="muted">
                  {' '}
                  · votes summed to {formatQuantity(stat.votedSum)}
                </span>
              )}
            </p>
          )}
          <PersonList
            title="Voted"
            people={stat.integerVotes.map((v) => ({
              userId: v.userId,
              name: `${v.name} — ${formatQuantity(v.value)}`,
            }))}
            variant="yes"
          />
          <PersonList title="Not voted" people={stat.notVoted} variant="muted" />
        </>
      ) : (
        <>
          {canAdjustTotals && onSaveOverride && canOverride ? (
            <TotalCountEditor
              stat={stat}
              onSaveOverride={onSaveOverride}
              saving={saving}
              onInvalid={onInvalid}
            />
          ) : (
            <p className="modal-item-summary">
              Total: <strong>{stat.displayYes}</strong>
              {showVoteBreakdown &&
                stat.hasOverride &&
                stat.votedYesCount !== stat.displayYes && (
                <span className="muted"> · {stat.votedYesCount} yes votes</span>
              )}
            </p>
          )}
          <PersonList title="Yes" people={stat.yes} variant="yes" />
          <PersonList title="No" people={stat.no} variant="no" />
          <PersonList title="Not voted" people={stat.notVoted} variant="muted" />
        </>
      )}
    </section>
  )
}

export function MealSlotDetailModal({
  stats,
  mealLabel,
  dateLabel,
  slotNote,
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

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="modal-dialog modal-dialog-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-slot-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="meal-slot-modal-title">{mealLabel}</h2>
            <p className="modal-subtitle">{dateLabel}</p>
            {slotNote?.trim() && (
              <MenuSlotNote
                note={slotNote}
                slot={slot}
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

        <div className="modal-body">
          {canAdjustTotals && (
            <p className="muted modal-admin-hint">
              Adjust totals when guest count differs from votes — number items
              (half steps OK) or yes counts for yes/no dishes.
            </p>
          )}
          <section className="modal-meal-summary">
            <h3 className="modal-section-heading">Summary</h3>
            <PersonList
              title="Not eating"
              people={stats.mealSummary.notEating}
              variant="no"
            />
            <PersonList
              title="Not voted"
              people={stats.mealSummary.notVotedMeal}
              variant="muted"
            />
            <PersonList
              title="Voted"
              people={stats.mealSummary.votedMeal}
              variant="yes"
            />
          </section>

          <h3 className="modal-section-heading">Each item</h3>
          {grouped.map(({ category, items }, catIndex) => (
            <div
              key={category.id}
              className={`modal-category-block ${catIndex > 0 ? 'has-separator' : ''}`}
            >
              <h4 className="menu-category-title">{category.labelGu}</h4>
              {items.map((item) => {
                const stat = statByItemId[item.id]
                if (!stat) return null
                return (
                  <ItemDetailSection
                    key={item.id}
                    stat={stat}
                    canAdjustTotals={canAdjustTotals}
                    showVoteBreakdown={showVoteBreakdown}
                    onSaveOverride={onSaveOverride}
                    overrideSavingId={overrideSavingId}
                    onInvalid={handleInvalid}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
