import { Moon, Sun } from 'lucide-react'
import { MEAL_SLOTS } from '../../config/menuItems'
import { MEALS_SLOT_ART } from '../../config/mealsArt'

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
        const art = MEALS_SLOT_ART[slot]

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
            {art ? (
              <img
                className="meal-slot-tab-art"
                src={art.src}
                alt=""
                width={36}
                height={36}
                decoding="async"
                style={{ objectPosition: art.position }}
              />
            ) : (
              <Icon size={16} className="meal-slot-tab-icon" aria-hidden />
            )}
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
