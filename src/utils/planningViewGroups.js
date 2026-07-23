/**
 * Optional planning-only view groups within a category.
 * If a category has no planningGroups, items stay a flat list in Menu Planning.
 * If groups exist, every item in that category must be assigned to one group.
 */

export function normalizePlanningGroups(groups) {
  if (!Array.isArray(groups)) return []
  return groups
    .map((g, index) => ({
      id: String(g.id ?? `grp-${index + 1}`),
      label: String(g.label ?? '').trim(),
      order: typeof g.order === 'number' ? g.order : index,
    }))
    .filter((g) => g.label)
    .sort((a, b) => a.order - b.order)
}

/**
 * Sections for Menu Planning CategoryPicker.
 * Flat list when no groups; otherwise one section per group (+ Unassigned if any).
 */
export function getPlanningViewSections(category, items) {
  const groups = normalizePlanningGroups(category?.planningGroups)
  const list = items ?? []
  if (groups.length === 0) {
    return [{ id: null, label: null, items: list }]
  }

  const sections = groups.map((g) => ({
    id: g.id,
    label: g.label,
    items: list.filter((i) => i.planningGroupId === g.id),
  }))

  const assigned = new Set(
    sections.flatMap((s) => s.items.map((i) => i.id)),
  )
  const unassigned = list.filter((i) => !assigned.has(i.id))
  if (unassigned.length > 0) {
    sections.push({
      id: '__unassigned__',
      label: 'Unassigned',
      items: unassigned,
    })
  }

  return sections.filter((s) => s.items.length > 0 || s.id === '__unassigned__')
}

/**
 * Validate: if groups exist, every item must be in exactly one existing group.
 */
export function validatePlanningGroupAssignments(groups, items) {
  const normalized = normalizePlanningGroups(groups)
  if (normalized.length === 0) {
    return { ok: true }
  }
  const groupIds = new Set(normalized.map((g) => g.id))
  const missing = []
  for (const item of items ?? []) {
    if (!item.planningGroupId || !groupIds.has(item.planningGroupId)) {
      missing.push(item.gu || item.en || item.id)
    }
  }
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Assign every item to a group. Missing: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`,
    }
  }
  return { ok: true }
}

export function makePlanningGroupId(label, index = 0) {
  const base = String(label ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `grp-${Date.now()}-${index}`
}
