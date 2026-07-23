import { Moon, Sun } from 'lucide-react'
import { MEAL_SLOTS } from '../../config/menuItems'

const SLOT_ICONS = {
  morning: Sun,
  evening: Moon,
}

/**
 * Segmented Morning / Evening control for mobile My Meals.
 */
export function MealSlotTabs({
  slots = [],
  selectedSlot,
  slotComplete = {},
  onSelect,
}) {
  if (slots.length === 0) return null

  return (
    <div className="meal-slot-tabs" role="tablist" aria-label="Meal time">
      {slots.map((slot) => {
        const Icon = SLOT_ICONS[slot]
        const isSelected = slot === selectedSlot
        const complete = slotComplete[slot]
        const label = MEAL_SLOTS[slot]?.labelEn ?? slot

        return (
          <button
            key={slot}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={[
              'meal-slot-tab',
              `meal-slot-tab-${slot}`,
              isSelected ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(slot)}
          >
            <Icon size={16} className="meal-slot-tab-icon" aria-hidden />
            <span className="meal-slot-tab-label">{label}</span>
            {complete !== undefined && (
              <span
                className={`meal-slot-tab-status ${complete ? 'is-done' : 'is-pending'}`}
              >
                {complete ? 'Voted' : 'Not voted'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
