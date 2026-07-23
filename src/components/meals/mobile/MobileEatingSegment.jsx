import { triggerSelectionHaptic } from '../../../utils/haptics'

export function MobileEatingSegment({
  notEating,
  onChange,
  disabled = false,
  slot = 'morning',
}) {
  const select = (nextNotEating) => {
    if (disabled) return
    triggerSelectionHaptic()
    onChange(nextNotEating)
  }

  return (
    <div
      className={`mobile-segmented meal-vote-mobile-eating slot-${slot}`}
      role="group"
      aria-label="Meal attendance"
    >
      <button
        type="button"
        className={`mobile-segmented-btn${!notEating ? ' is-active' : ''}`}
        disabled={disabled}
        aria-pressed={!notEating}
        onClick={() => select(false)}
      >
        Eating
      </button>
      <button
        type="button"
        className={`mobile-segmented-btn${notEating ? ' is-active' : ''}`}
        disabled={disabled}
        aria-pressed={notEating}
        onClick={() => select(true)}
      >
        Not eating
      </button>
    </div>
  )
}
