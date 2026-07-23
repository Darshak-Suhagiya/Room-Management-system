import { VOTE_TYPES, VOTE_TYPE_LABELS } from '../../../config/voteTypes'
import { triggerSelectionHaptic } from '../../../utils/haptics'

export function AdminVoteTypeSegment({ value, onChange, disabled = false }) {
  const options = [
    { id: VOTE_TYPES.YES_NO, label: VOTE_TYPE_LABELS[VOTE_TYPES.YES_NO] },
    { id: VOTE_TYPES.INTEGER, label: VOTE_TYPE_LABELS[VOTE_TYPES.INTEGER] },
  ]

  return (
    <div className="mobile-segmented admin-mobile-vote-seg" role="group" aria-label="Vote type">
      {options.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            className={`mobile-segmented-btn${active ? ' is-active' : ''}`}
            disabled={disabled}
            aria-pressed={active}
            onClick={() => {
              if (disabled || active) return
              triggerSelectionHaptic()
              onChange(opt.id)
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
