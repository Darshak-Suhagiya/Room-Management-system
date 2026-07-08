import { emptyMealSlot } from '../config/menuItems'

/** Stable signature of planned items in a slot (ignores note text). */
export function slotMenuSignature(slot, categoryIds) {
  const parts = []
  for (const catId of categoryIds) {
    const ids = [...(slot?.[catId] ?? [])].sort()
    if (ids.length > 0) {
      parts.push(`${catId}=${ids.join(',')}`)
    }
  }
  return parts.join('|')
}

/**
 * Whether the planned menu items for a slot changed (enabled/disabled or item list).
 * Note-only edits do not count as a menu change.
 *
 * Creating / first-enabling a slot is NOT a change that should clear votes —
 * only changing or disabling an already-planned slot is.
 */
export function didSlotMenuChange(existingMenu, newData, slot, categoryIds) {
  const enabledKey = slot === 'morning' ? 'hasMorning' : 'hasEvening'
  const wasEnabled = Boolean(existingMenu?.[enabledKey])
  const isEnabled = Boolean(newData[enabledKey])

  // No prior plan for this slot → nothing meaningful to clear
  if (!existingMenu || !wasEnabled) return false

  // Slot was planned and is now turned off → clear votes for it
  if (!isEnabled) return true

  const prevSlot = existingMenu?.[slot] ?? emptyMealSlot(categoryIds)
  const nextSlot = newData[slot] ?? emptyMealSlot(categoryIds)

  return (
    slotMenuSignature(prevSlot, categoryIds) !==
    slotMenuSignature(nextSlot, categoryIds)
  )
}
