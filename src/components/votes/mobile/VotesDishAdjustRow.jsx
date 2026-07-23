import { useEffect, useState } from 'react'
import { VOTE_TYPES } from '../../../config/voteTypes'
import { formatQuantity } from '../../../utils/voteQuantityUtils'
import { AdminQtyField } from '../../admin/mobile/AdminQtyField'
import { triggerSelectionHaptic } from '../../../utils/haptics'

function WhoChips({ people, label, tone = '' }) {
  if (!people?.length) return null
  return (
    <div className={`votes-mobile-who-group ${tone}`.trim()}>
      <span className="votes-mobile-who-label">{label}</span>
      <div className="votes-mobile-who-chips">
        {people.map((p) => (
          <span key={p.userId} className="votes-mobile-who-chip">
            {p.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export function VotesDishAdjustRow({
  stat,
  showVoteBreakdown = true,
  canAdjust = false,
  saving = false,
  onSaveOverride,
}) {
  const isInteger = stat.voteType === VOTE_TYPES.INTEGER
  const votedBase = isInteger ? Number(stat.votedSum) || 0 : Number(stat.votedYesCount) || 0
  const display = isInteger ? Number(stat.displayTotal) || 0 : Number(stat.displayYes) || 0
  const [qty, setQty] = useState(stat.hasOverride ? display : votedBase)
  const [showWho, setShowWho] = useState(false)

  useEffect(() => {
    setQty(stat.hasOverride ? display : votedBase)
  }, [stat.item.id, stat.hasOverride, display, votedBase])

  const dirty = Number(qty) !== Number(display)
  const canOverride =
    canAdjust &&
    (stat.voteType === VOTE_TYPES.INTEGER || stat.voteType === VOTE_TYPES.YES_NO)

  const step = isInteger ? 0.5 : 1

  const handleQtyChange = (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return
    if (isInteger) {
      setQty(Math.max(0, n))
    } else {
      setQty(Math.max(0, Math.round(n)))
    }
  }

  return (
    <div className="votes-mobile-dish-row rail-card">
      <div className="votes-mobile-dish-row-head">
        <div>
          <strong className="votes-mobile-dish-name">{stat.item.gu}</strong>
          {stat.item.en && (
            <p className="muted votes-mobile-dish-en">{stat.item.en}</p>
          )}
        </div>
        <div className="votes-mobile-dish-totals">
          <strong>{isInteger ? formatQuantity(display) : display}</strong>
          {stat.hasOverride && (
            <span className="total-adjusted-badge">adjusted</span>
          )}
          {showVoteBreakdown && (
            <span className="muted">
              {isInteger
                ? `${formatQuantity(stat.votedSum)} voted`
                : `${stat.votedYesCount} voted`}
            </span>
          )}
        </div>
      </div>

      {canOverride && (
        <div className="votes-mobile-dish-adjust">
          <AdminQtyField
            label={isInteger ? 'Total count' : 'Total yes'}
            value={qty}
            onChange={handleQtyChange}
            disabled={saving}
            step={step}
            min={0}
            hint={isInteger ? 'Steps of 0.5' : 'Whole numbers · +/− 1'}
          />
          <div className="votes-mobile-dish-adjust-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={saving || !dirty}
              onClick={() => {
                triggerSelectionHaptic()
                onSaveOverride?.(stat.item.id, qty)
              }}
            >
              {saving ? 'Saving…' : 'Save total'}
            </button>
            {stat.hasOverride && (
              <button
                type="button"
                className="btn btn-ghost btn-block"
                disabled={saving}
                onClick={() => {
                  triggerSelectionHaptic()
                  onSaveOverride?.(stat.item.id, null)
                }}
              >
                Use vote count
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn btn-secondary btn-sm votes-mobile-who-toggle"
        onClick={() => setShowWho((v) => !v)}
      >
        {showWho ? 'Hide who' : 'Who voted'}
      </button>

      {showWho && (
        <div className="votes-mobile-who">
          {isInteger ? (
            <>
              <WhoChips
                label="Voted"
                tone="is-yes"
                people={(stat.integerVotes ?? []).map((v) => ({
                  userId: v.userId,
                  name: `${v.name} — ${formatQuantity(v.value)}`,
                }))}
              />
              <WhoChips label="Not voted" tone="is-muted" people={stat.notVoted} />
            </>
          ) : (
            <>
              <WhoChips label="Yes" tone="is-yes" people={stat.yes} />
              <WhoChips label="No" tone="is-no" people={stat.no} />
              <WhoChips label="Not voted" tone="is-muted" people={stat.notVoted} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
