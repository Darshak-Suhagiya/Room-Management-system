/**
 * Match stock items by name and linked menu catalog Gu/En labels.
 * @param {object} item - stock item ({ name, menuItemIds? })
 * @param {string} query
 * @param {Map<string, { gu?: string, en?: string }> | Record<string, any>} [catalogById]
 */
export function matchStockItemSearch(item, query, catalogById) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return true
  const parts = [item?.name || '']
  const ids = item?.menuItemIds || []
  const lookup =
    catalogById instanceof Map
      ? (id) => catalogById.get(id)
      : (id) => catalogById?.[id]
  for (const id of ids) {
    const cat = lookup?.(id)
    if (cat) {
      parts.push(cat.gu || '', cat.en || '', cat.name || '')
    }
  }
  return parts.join(' ').toLowerCase().includes(q)
}

/**
 * Match a shopping ticket line by display name and linked menu Gu/En.
 */
export function matchShoppingLineSearch(line, query, catalogById) {
  return matchStockItemSearch(
    {
      name: line?.name,
      menuItemIds: line?.menuItemIds,
    },
    query,
    catalogById,
  )
}
