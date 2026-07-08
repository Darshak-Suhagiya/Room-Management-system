export function groupPlannedByCategory(plannedItems, catalog) {
  const groups = []
  if (!catalog?.categories) return groups
  for (const cat of catalog.categories) {
    const items = plannedItems.filter((i) => i.categoryId === cat.id)
    if (items.length > 0) {
      groups.push({ category: cat, items })
    }
  }
  return groups
}
