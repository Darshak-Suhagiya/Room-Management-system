import { emptySevaSlot } from '../config/defaultSevaSeed'
import { getWeeklyColumnCount } from './sevaMutations'

export function createAssignmentState(config) {
  const personIds = config.people.map((p) => p.id)
  const byPerson = {}
  for (const id of personIds) {
    byPerson[id] = {
      dailyByDay: {},
      weeklyTaskIds: [],
      loadKeyWeek: {},
      groupIdWeek: {},
      dailyWeekTotal: 0,
    }
  }
  return { byPerson, config }
}

function getGroup(config, groupId) {
  return config.dailyGroups.find((g) => g.id === groupId)
}

export function getPersonTotalLoad(state, personId) {
  const p = state.byPerson[personId]
  if (!p) return 0
  return p.dailyWeekTotal + p.weeklyTaskIds.length
}

/** Max allowed difference between highest and lowest person total load (must). */
export const MAX_LOAD_SPREAD = 1

export function getLoadSpread(state, config) {
  const loads = config.people.map((p) => getPersonTotalLoad(state, p.id))
  if (loads.length === 0) return 0
  return Math.max(...loads) - Math.min(...loads)
}

/** Total load per person if one more assignment is given to personId. */
export function getLoadSpreadAfterAssignment(state, config, personId) {
  const loads = config.people.map((p) => {
    let load = getPersonTotalLoad(state, p.id)
    if (p.id === personId) load += 1
    return load
  })
  if (loads.length === 0) return 0
  return Math.max(...loads) - Math.min(...loads)
}

export function canAssignWithinLoadSpread(state, config, personId) {
  return getLoadSpreadAfterAssignment(state, config, personId) <= MAX_LOAD_SPREAD
}

export function isLoadSpreadBalanced(state, config) {
  return getLoadSpread(state, config) <= MAX_LOAD_SPREAD
}

export function registerDailyAssignment(state, dayId, groupId, personId) {
  if (!personId) return
  const group = getGroup(state.config, groupId)
  const p = state.byPerson[personId]
  if (!p) return
  if (!p.dailyByDay[dayId]) p.dailyByDay[dayId] = []
  p.dailyByDay[dayId].push({ groupId, loadKey: group?.loadKey ?? null })
  if (group?.loadKey) {
    p.loadKeyWeek[group.loadKey] = (p.loadKeyWeek[group.loadKey] ?? 0) + 1
  }
  p.groupIdWeek[groupId] = (p.groupIdWeek[groupId] ?? 0) + 1
  p.dailyWeekTotal += 1
}

export function unregisterDailyAssignment(state, dayId, groupId, personId) {
  if (!personId) return
  const group = getGroup(state.config, groupId)
  const p = state.byPerson[personId]
  if (!p) return
  const arr = p.dailyByDay[dayId] ?? []
  const i = arr.findIndex((a) => a.groupId === groupId)
  if (i < 0) return
  arr.splice(i, 1)
  if (group?.loadKey && (p.loadKeyWeek[group.loadKey] ?? 0) > 0) {
    p.loadKeyWeek[group.loadKey] -= 1
  }
  if ((p.groupIdWeek[groupId] ?? 0) > 0) {
    p.groupIdWeek[groupId] -= 1
  }
  p.dailyWeekTotal -= 1
}

export function registerWeeklyAssignment(state, taskId, personId) {
  if (!personId) return
  const p = state.byPerson[personId]
  if (!p) return
  if (!p.weeklyTaskIds.includes(taskId)) {
    p.weeklyTaskIds.push(taskId)
  }
}

export function unregisterWeeklyAssignment(state, taskId, personId) {
  if (!personId) return
  const p = state.byPerson[personId]
  if (!p) return
  p.weeklyTaskIds = p.weeklyTaskIds.filter((id) => id !== taskId)
}

export function personHasLoadKeyOnDay(state, personId, dayId, loadKey) {
  const day = state.byPerson[personId]?.dailyByDay[dayId] ?? []
  return day.some((a) => a.loadKey === loadKey)
}

export function personDailyCount(state, personId, dayId) {
  return (state.byPerson[personId]?.dailyByDay[dayId] ?? []).length
}

export function personWeeklyCount(state, personId) {
  return state.byPerson[personId]?.weeklyTaskIds.length ?? 0
}

export function clearAllAssignments(config) {
  const next = JSON.parse(JSON.stringify(config))
  for (const day of next.weekDays) {
    if (!next.assignments[day.id]) next.assignments[day.id] = {}
    for (const group of next.dailyGroups) {
      next.assignments[day.id][group.id] = Array.from(
        { length: group.slotCount ?? 1 },
        () => emptySevaSlot(),
      )
    }
  }
  const colCount = getWeeklyColumnCount(next)
  for (const task of next.weeklyTasks) {
    task.personIds = Array.from({ length: colCount }, () => null)
  }
  return next
}

export function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function collectDailySlots(config) {
  const slots = []
  for (const day of config.weekDays) {
    for (const group of config.dailyGroups) {
      if (group.optional && group.id === 'extra') continue
      const count = group.slotCount ?? 1
      for (let i = 0; i < count; i++) {
        slots.push({ dayId: day.id, groupId: group.id, slotIndex: i })
      }
    }
  }
  return slots
}
