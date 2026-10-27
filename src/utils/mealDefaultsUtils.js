import { DEFAULT_MEAL_MODE } from '../config/constants'
import { VOTE_TYPES, defaultVoteTypeForCategory } from '../config/voteTypes'
import { getPlannedMenuItems, getVoteValue, isVoteAnswered } from './menuVoteUtils'

export const DEFAULT_MODE_LABELS = {
  [DEFAULT_MEAL_MODE.EATING]: 'Eating',
  [DEFAULT_MEAL_MODE.NOT_EATING]: 'Not eating',
}

/** Every dish in the catalog with a resolved vote type and category info. */
export function getCatalogVoteItems(catalog) {
  if (!catalog?.categories || !catalog?.items) return []
  const out = []
  for (const cat of catalog.categories) {
    for (const item of catalog.items) {
      if (item.categoryId !== cat.id) continue
      out.push({
        ...item,
        categoryId: cat.id,
        categoryLabelGu: cat.labelGu,
        categoryLabelEn: cat.labelEn,
        voteType: item.voteType ?? defaultVoteTypeForCategory(cat.id),
      })
    }
  }
  return out
}

/** Eating / Not eating for a date: calendar override, otherwise the default mode. */
export function resolveDefaultMode(defaults, dateId) {
  const override = dateId ? defaults?.dateOverrides?.[dateId] : null
  if (override === DEFAULT_MEAL_MODE.EATING || override === DEFAULT_MEAL_MODE.NOT_EATING) {
    return override
  }
  return defaults?.mode === DEFAULT_MEAL_MODE.EATING
    ? DEFAULT_MEAL_MODE.EATING
    : DEFAULT_MEAL_MODE.NOT_EATING
}

export function isDefaultVoteSet(item, votes) {
  return isVoteAnswered(item, getVoteValue(votes, item.id))
}

export function getMissingDefaultItemIds(items, votes) {
  return items.filter((item) => !isDefaultVoteSet(item, votes)).map((i) => i.id)
}

function slotsOf(menu) {
  const slots = []
  if (menu?.hasMorning) slots.push('morning')
  if (menu?.hasEvening) slots.push('evening')
  return slots
}

/**
 * Dishes on open planned menus (today onward, not locked) whose day resolves
 * to Eating, that still have no default vote. Slots the member already
 * answered completely do not count.
 *
 * Returns { items: [{ item, dates: [dateId] }], count }.
 */
export function findDefaultsGate({
  menus,
  catalog,
  defaults,
  locks = {},
  today,
  isSlotAnswered,
}) {
  const byItem = new Map()
  for (const menu of menus ?? []) {
    if (!menu?.date || menu.date < today) continue
    if (resolveDefaultMode(defaults, menu.date) !== DEFAULT_MEAL_MODE.EATING) {
      continue
    }
    for (const slot of slotsOf(menu)) {
      if (locks[`${menu.date}_${slot}`]) continue
      if (isSlotAnswered?.(menu, slot)) continue
      const planned = getPlannedMenuItems(menu, slot, catalog)
      for (const item of planned) {
        if (isDefaultVoteSet(item, defaults?.votes)) continue
        const entry = byItem.get(item.id) ?? { item, dates: [] }
        if (!entry.dates.includes(menu.date)) entry.dates.push(menu.date)
        byItem.set(item.id, entry)
      }
    }
  }
  const items = [...byItem.values()].map((e) => ({
    ...e,
    dates: e.dates.sort((a, b) => a.localeCompare(b)),
  }))
  return { items, count: items.length }
}

/** Dish ids from the gate, for the "Not set" highlight on the defaults page. */
export function gateItemIdSet(gate) {
  return new Set((gate?.items ?? []).map((e) => e.item.id))
}

/** Used when a dish has no default: No for yes/no dishes, 0 for quantity dishes. */
function fallbackVote(item) {
  return item.voteType === VOTE_TYPES.INTEGER ? 0 : false
}

/**
 * Participation payload fields for a member who never voted.
 * Not eating -> notEating, no votes. Eating -> default vote per planned dish.
 */
export function buildDefaultParticipation(defaults, plannedItems, dateId) {
  const mode = resolveDefaultMode(defaults, dateId)
  if (mode === DEFAULT_MEAL_MODE.NOT_EATING) {
    return { notEating: true, votes: {} }
  }
  const votes = {}
  for (const item of plannedItems) {
    const stored = getVoteValue(defaults?.votes, item.id)
    const value = isVoteAnswered(item, stored) ? stored : fallbackVote(item)
    votes[item.id] = { voteType: item.voteType, value }
  }
  return { notEating: false, votes }
}

/** True when the lock doc's "default votes applied" note is still current. */
export function isDefaultAppliedCurrent(lock, menu, slot) {
  const applied = lock?.defaultApplied
  if (!applied?.displayName) return false
  const editedAt = menu?.slotEdits?.[slot]?.at
  if (editedAt && applied.at && editedAt > applied.at) return false
  return true
}

export function formatDefaultAppliedLine(applied) {
  if (!applied?.displayName) return ''
  let when = ''
  if (applied.at) {
    const d = new Date(applied.at)
    if (!Number.isNaN(d.getTime())) {
      when = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }
  }
  const line = `Default votes applied by ${applied.displayName}`
  return when ? `${line} · ${when}` : line
}

/** Short label for a participation that came from defaults, with who applied. */
export function formatDefaultByLine(participation) {
  const by = participation?.defaultAppliedBy?.displayName
  return by ? `Default vote · applied by ${by}` : 'Default vote'
}
