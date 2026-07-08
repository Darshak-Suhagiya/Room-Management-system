export function slotHasMenuItems(slot, categoryIds) {
  if (!slot) return false
  return categoryIds.some((id) => (slot[id] ?? []).length > 0)
}

export function validateMenuPlan({
  hasMorning,
  hasEvening,
  morning,
  evening,
  categoryIds,
}) {
  if (!hasMorning && !hasEvening) {
    return 'Select morning and/or evening for this date.'
  }
  if (hasMorning && !slotHasMenuItems(morning, categoryIds)) {
    return 'Morning is enabled but no menu items are selected.'
  }
  if (hasEvening && !slotHasMenuItems(evening, categoryIds)) {
    return 'Evening is enabled but no menu items are selected.'
  }
  return null
}
