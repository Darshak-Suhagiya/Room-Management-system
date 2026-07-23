import { MEAL_SLOTS } from '../../../config/menuItems'
import { triggerSelectionHaptic } from '../../../utils/haptics'

const OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'morning', label: MEAL_SLOTS.morning.labelEn },
  { id: 'evening', label: MEAL_SLOTS.evening.labelEn },
]

export function VotesSlotSegment({ value, onChange }) {
  return (
    <div className="votes-mobile-slot-segment" role="tablist" aria-label="Meal slot">
      <div className="mobile-segmented">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={value === opt.id}
            className={`mobile-segmented-btn${value === opt.id ? ' is-active' : ''}`}
            onClick={() => {
              triggerSelectionHaptic()
              onChange(opt.id)
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
