export const MEAL_SLOTS = {
  morning: { key: 'morning', labelEn: 'Morning', labelGu: 'સવાર' },
  evening: { key: 'evening', labelEn: 'Evening', labelGu: 'સાંજ' },
}

export function emptyMealSlot(categoryIds = []) {
  return Object.fromEntries(categoryIds.map((id) => [id, []]))
}

export function buildItemLabelMap(catalog) {
  const map = {}
  if (!catalog?.items) return map
  for (const item of catalog.items) {
    map[item.id] = { ...item, categoryId: item.categoryId }
  }
  return map
}

export function getItemLabel(itemId, categoryId, catalog) {
  const item = catalog?.items?.find(
    (i) => i.id === itemId && i.categoryId === categoryId,
  )
  return item ? `${item.gu} (${item.en})` : itemId
}
