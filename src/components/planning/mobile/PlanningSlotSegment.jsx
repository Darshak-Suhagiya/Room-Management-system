import { MEAL_SLOTS } from '../../../config/menuItems'
import { triggerSelectionHaptic } from '../../../utils/haptics'

export function PlanningSlotSegment({
  activeSlot,
  hasMorning,
  hasEvening,
  onSelectSlot,
  onToggleSlot,
}) {
  const slots = [
    { key: 'morning', label: 'Morning', enabled: hasMorning },
    { key: 'evening', label: 'Evening', enabled: hasEvening },
  ]

  return (
    <div className="admin-mobile-plan-slot-wrap">
      <div className="mobile-segmented admin-mobile-plan-slot-seg" role="tablist">
        {slots.map((slot) => (
          <button
            key={slot.key}
            type="button"
            role="tab"
            aria-selected={activeSlot === slot.key}
            className={`mobile-segmented-btn${activeSlot === slot.key ? ' is-active' : ''}`}
            onClick={() => {
              triggerSelectionHaptic()
              onSelectSlot(slot.key)
            }}
          >
            {slot.label}
            {!slot.enabled && (
              <span className="admin-mobile-plan-slot-off">Off</span>
            )}
          </button>
        ))}
      </div>
      <label className="admin-mobile-plan-slot-enable feedback-switch">
        <span className="feedback-switch-label">
          {activeSlot === 'morning' ? 'Morning' : 'Evening'} slot enabled
        </span>
        <span className="feedback-switch-control">
          <input
            type="checkbox"
            role="switch"
            checked={activeSlot === 'morning' ? hasMorning : hasEvening}
            onChange={(e) => {
              triggerSelectionHaptic()
              onToggleSlot(activeSlot, e.target.checked)
            }}
            aria-label={`Enable ${activeSlot} slot`}
          />
          <span className="feedback-switch-track" aria-hidden>
            <span className="feedback-switch-thumb" />
          </span>
        </span>
      </label>
    </div>
  )
}

export function PlanningSlotEmpty({ slotKey, onEnable }) {
  const label = MEAL_SLOTS[slotKey]?.labelEn ?? slotKey
  return (
    <div className="admin-mobile-plan-slot-empty">
      <p className="muted">{label} is turned off for this date.</p>
      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={() => onEnable(slotKey)}
      >
        Enable {label.toLowerCase()}
      </button>
    </div>
  )
}
