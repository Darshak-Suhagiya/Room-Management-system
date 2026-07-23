import {
  REVIEW_RATINGS,
  REVIEW_RATING_LABELS,
} from '../../../utils/menuReviewUtils'
import { triggerSelectionHaptic } from '../../../utils/haptics'

const RATING_OPTIONS = [
  { value: REVIEW_RATINGS.GOOD, label: REVIEW_RATING_LABELS[REVIEW_RATINGS.GOOD] },
  { value: REVIEW_RATINGS.OKAY, label: REVIEW_RATING_LABELS[REVIEW_RATINGS.OKAY] },
  { value: REVIEW_RATINGS.BAD, label: REVIEW_RATING_LABELS[REVIEW_RATINGS.BAD] },
  { value: null, label: 'None' },
]

export function MobileRatingChips({
  value,
  onChange,
  disabled = false,
}) {
  return (
    <div className="meal-feedback-rating-chips" role="group" aria-label="Item rating">
      {RATING_OPTIONS.map((opt) => {
        const active = opt.value === null ? value == null : value === opt.value
        return (
          <button
            key={opt.label}
            type="button"
            className={`meal-feedback-rating-chip${active ? ' is-active' : ''}${
              opt.value ? ` rating-${opt.value}` : ''
            }`}
            disabled={disabled}
            aria-pressed={active}
            onClick={() => {
              if (disabled) return
              triggerSelectionHaptic()
              onChange(opt.value)
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
