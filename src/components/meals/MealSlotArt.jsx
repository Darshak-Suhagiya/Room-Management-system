import { MEALS_SLOT_ART } from '../../config/mealsArt'

export function MealSlotArt({ slot }) {
  const art = MEALS_SLOT_ART[slot]
  if (!art) return null

  return (
    <div className={`meal-slot-art meal-slot-art-${slot}`} aria-hidden>
      <img
        src={art.src}
        alt=""
        width={1000}
        height={360}
        decoding="async"
        style={{ objectPosition: art.position }}
      />
    </div>
  )
}
