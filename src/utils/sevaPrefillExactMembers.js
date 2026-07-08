import { emptySevaSlot } from '../config/defaultSevaSeed'
import { getWeeklyColumnCount } from './sevaMutations'
import { buildDailySlotMeta, buildWeeklySlotMeta, canAssign } from './sevaRuleChecks'
import {
  canAssignWithinLoadSpread,
  registerDailyAssignment,
  registerWeeklyAssignment,
  unregisterDailyAssignment,
  unregisterWeeklyAssignment,
} from './sevaPrefillState'

export const EXACT_SCOPE_WEEKLY = 'weekly'
export const EXACT_SCOPE_DAILY = 'daily'
export const WEEKLY_EXACT_TARGET = '__weekly__'

/** @deprecated use WEEKLY_EXACT_TARGET */
export const WEEKLY_MIN_TARGET = WEEKLY_EXACT_TARGET

export function resolveDailyGroup(config, groupIdOrCode) {
  if (!groupIdOrCode) return null
  const key = String(groupIdOrCode).toLowerCase()
  return (
    config.dailyGroups.find((g) => g.id === groupIdOrCode) ||
    config.dailyGroups.find((g) => g.id.toLowerCase() === key) ||
    config.dailyGroups.find((g) => g.code?.toLowerCase() === key)
  )
}

export function resolveWeeklyTask(config, taskIdOrTitle) {
  if (!taskIdOrTitle) return null
  const key = String(taskIdOrTitle).toLowerCase()
  return (
    config.weeklyTasks.find((t) => t.id === taskIdOrTitle) ||
    config.weeklyTasks.find((t) => t.id.toLowerCase() === key) ||
    config.weeklyTasks.find((t) => t.title?.toLowerCase() === key)
  )
}

export function getExactCountFromParams(params = {}) {
  return Number(params.exact ?? params.min ?? params.max) || 1
}

export function getExactMembersRuleScope(rule) {
  const p = rule.params ?? {}
  if (p.scope === EXACT_SCOPE_WEEKLY) return EXACT_SCOPE_WEEKLY
  if (p.scope === EXACT_SCOPE_DAILY) return EXACT_SCOPE_DAILY
  if (
    p.taskId &&
    (!p.groupId ||
      p.groupId === WEEKLY_EXACT_TARGET ||
      String(p.groupId).toLowerCase() === 's5')
  ) {
    return EXACT_SCOPE_WEEKLY
  }
  return EXACT_SCOPE_DAILY
}

export function isWeeklyExactRule(rule) {
  return getExactMembersRuleScope(rule) === EXACT_SCOPE_WEEKLY
}

/** @deprecated use isWeeklyExactRule */
export const isWeeklyMinRule = isWeeklyExactRule

export function getExactMembersRules(rules) {
  return (rules ?? []).filter((r) => {
    if (!r.enabled || r.type !== 'group_exact_members') return false
    if (isWeeklyExactRule(r)) return !!r.params?.taskId
    return !!r.params?.groupId
  })
}

export function getDailyExactMembersRules(rules) {
  return getExactMembersRules(rules).filter((r) => !isWeeklyExactRule(r))
}

export function getWeeklyExactMembersRules(rules) {
  return getExactMembersRules(rules).filter(isWeeklyExactRule)
}

export function getExactCountForGroupResolved(config, rules, groupId) {
  const rule = getDailyExactMembersRules(rules).find((r) => {
    const resolved = resolveDailyGroup(config, r.params.groupId)
    return resolved?.id === groupId
  })
  if (!rule) return 0
  return getExactCountFromParams(rule.params)
}

export function getExactCountForWeeklyTask(config, rules, taskId) {
  const rule = getWeeklyExactMembersRules(rules).find((r) => {
    const resolved = resolveWeeklyTask(config, r.params.taskId)
    return resolved?.id === taskId
  })
  if (!rule) return 0
  return getExactCountFromParams(rule.params)
}

export function countFilledSlots(slots) {
  return (slots ?? []).filter((s) => s?.personId).length
}

export function countFilledWeekly(task) {
  return (task.personIds ?? []).filter(Boolean).length
}

function padWeeklyPersonIds(task, columnCount) {
  if (!task.personIds) task.personIds = []
  while (task.personIds.length < columnCount) task.personIds.push(null)
  if (task.personIds.length > columnCount) {
    task.personIds = task.personIds.slice(0, columnCount)
  }
}

function clearDailySlot(config, state, dayId, groupId, slotIndex) {
  const slots = config.assignments[dayId]?.[groupId]
  const personId = slots?.[slotIndex]?.personId
  if (!personId) return
  unregisterDailyAssignment(state, dayId, groupId, personId)
  slots[slotIndex] = emptySevaSlot()
}

function trimDailyGroupToExact(config, state, dayId, groupId, exact) {
  const slots = config.assignments[dayId]?.[groupId]
  if (!slots) return

  while (slots.length > exact) {
    const i = slots.length - 1
    clearDailySlot(config, state, dayId, groupId, i)
    slots.pop()
  }

  let filled = countFilledSlots(slots)
  while (filled > exact) {
    let cleared = false
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots[i].personId) {
        clearDailySlot(config, state, dayId, groupId, i)
        filled--
        cleared = true
        break
      }
    }
    if (!cleared) break
  }
}

/** Set slot count to exact for groups with an exact-member rule */
export function applyExactMemberSlotCapacity(config, rules) {
  const exactByGroup = new Map()

  for (const rule of getDailyExactMembersRules(rules)) {
    const group = resolveDailyGroup(config, rule.params.groupId)
    if (!group) continue
    const exact = getExactCountFromParams(rule.params)
    exactByGroup.set(group.id, exact)
    group.slotCount = exact
  }

  for (const day of config.weekDays) {
    if (!config.assignments[day.id]) config.assignments[day.id] = {}
    for (const [groupId, exact] of exactByGroup) {
      const slots = config.assignments[day.id][groupId] ?? []
      while (slots.length < exact) slots.push(emptySevaSlot())
      config.assignments[day.id][groupId] = slots.slice(0, exact)
    }
  }
}

export function applyWeeklyExactSlotCapacity(config, rules) {
  let neededCols = getWeeklyColumnCount(config)
  for (const rule of getWeeklyExactMembersRules(rules)) {
    neededCols = Math.max(neededCols, getExactCountFromParams(rule.params))
  }
  if (neededCols > (config.weeklyColumnCount ?? 0)) {
    config.weeklyColumnCount = neededCols
  }
  const colCount = Math.max(getWeeklyColumnCount(config), neededCols)
  for (const task of config.weeklyTasks) {
    padWeeklyPersonIds(task, colCount)
  }
}

export function countExactMemberViolations(config, rules) {
  let violations = 0

  for (const rule of getDailyExactMembersRules(rules)) {
    const group = resolveDailyGroup(config, rule.params.groupId)
    if (!group) continue
    const exact = getExactCountFromParams(rule.params)
    for (const day of config.weekDays) {
      const slots = config.assignments[day.id]?.[group.id] ?? []
      violations += Math.abs(countFilledSlots(slots) - exact)
    }
  }

  for (const rule of getWeeklyExactMembersRules(rules)) {
    const task = resolveWeeklyTask(config, rule.params.taskId)
    if (!task) continue
    const exact = getExactCountFromParams(rule.params)
    violations += Math.abs(countFilledWeekly(task) - exact)
  }

  return violations
}

export function wouldBreakWeeklyExactOnRemove(config, rules, taskId, personId) {
  const exact = getExactCountForWeeklyTask(config, rules, taskId)
  if (!exact) return false
  const task = config.weeklyTasks.find((t) => t.id === taskId)
  if (!task?.personIds?.includes(personId)) return false
  return countFilledWeekly(task) <= exact
}

export function wouldBreakGroupExactOnRemove(
  config,
  rules,
  dayId,
  groupId,
  personId,
) {
  const exact = getExactCountForGroupResolved(config, rules, groupId)
  if (!exact) return false
  const slots = config.assignments[dayId]?.[groupId] ?? []
  if (!slots.some((s) => s.personId === personId)) return false
  return countFilledSlots(slots) <= exact
}

export function isDailySlotBeyondExact(config, rules, groupId, slotIndex) {
  const exact = getExactCountForGroupResolved(config, rules, groupId)
  if (!exact) return false
  return slotIndex >= exact
}

export function mustFillSlotForExact(
  config,
  rules,
  slotList,
  index,
  dayId,
  groupId,
) {
  const exact = getExactCountForGroupResolved(config, rules, groupId)
  if (!exact) return false
  if (isDailySlotBeyondExact(config, rules, groupId, slotList[index]?.slotIndex)) {
    return false
  }

  const slots = config.assignments[dayId]?.[groupId] ?? []
  const filled = countFilledSlots(slots)

  let remainingInGroup = 0
  for (let i = index; i < slotList.length; i++) {
    const s = slotList[i]
    if (s.dayId === dayId && s.groupId === groupId && s.slotIndex < exact) {
      remainingInGroup++
    }
  }

  const stillNeeded = exact - filled
  return stillNeeded > 0 && stillNeeded >= remainingInGroup
}

export function mustLeaveDailySlotEmpty(config, rules, dayId, groupId, slotIndex) {
  return isDailySlotBeyondExact(config, rules, groupId, slotIndex)
}

export function isWeeklyColumnBeyondExact(config, rules, taskId, colIdx) {
  const exact = getExactCountForWeeklyTask(config, rules, taskId)
  if (!exact) return false
  return colIdx >= exact
}

export function mustFillWeeklySlotForExact(config, rules, taskId, colIdx) {
  const exact = getExactCountForWeeklyTask(config, rules, taskId)
  if (!exact || isWeeklyColumnBeyondExact(config, rules, taskId, colIdx)) {
    return false
  }

  const task = config.weeklyTasks.find((t) => t.id === taskId)
  if (!task) return false

  const colCount = getWeeklyColumnCount(config)
  padWeeklyPersonIds(task, colCount)
  const filled = countFilledWeekly(task)
  let remaining = 0
  for (let c = colIdx; c < exact; c++) {
    if (!task.personIds[c]) remaining++
  }
  const stillNeeded = exact - filled
  return stillNeeded > 0 && stillNeeded >= remaining
}

export function mustLeaveWeeklySlotEmpty(config, rules, taskId, colIdx) {
  return isWeeklyColumnBeyondExact(config, rules, taskId, colIdx)
}

export function tryAssignToSlot(config, state, rules, dayId, groupId, slotIndex) {
  if (mustLeaveDailySlotEmpty(config, rules, dayId, groupId, slotIndex)) {
    return false
  }
  const exact = getExactCountForGroupResolved(config, rules, groupId)
  const slots = config.assignments[dayId][groupId]
  if (exact && countFilledSlots(slots) >= exact) return false

  const meta = buildDailySlotMeta(config, dayId, groupId)
  const taken = new Set(slots.filter((s) => s.personId).map((s) => s.personId))

  for (const person of config.people) {
    if (taken.has(person.id)) continue
    if (!canAssign(state, rules, person.id, meta, false)) continue
    if (!canAssignWithinLoadSpread(state, config, person.id)) continue
    slots[slotIndex] = { personId: person.id, note: '' }
    registerDailyAssignment(state, dayId, groupId, person.id)
    return true
  }
  return false
}

export function tryAssignToWeeklySlot(config, state, rules, taskId, colIdx) {
  if (mustLeaveWeeklySlotEmpty(config, rules, taskId, colIdx)) return false

  const task = config.weeklyTasks.find((t) => t.id === taskId)
  if (!task) return false

  const exact = getExactCountForWeeklyTask(config, rules, taskId)
  const colCount = getWeeklyColumnCount(config)
  padWeeklyPersonIds(task, colCount)
  if (exact && countFilledWeekly(task) >= exact) return false

  const meta = buildWeeklySlotMeta(taskId)
  const taken = new Set(task.personIds.filter(Boolean))

  for (const person of config.people) {
    if (taken.has(person.id)) continue
    if (!canAssign(state, rules, person.id, meta, taken.has(person.id))) continue
    if (!canAssignWithinLoadSpread(state, config, person.id)) continue
    task.personIds[colIdx] = person.id
    registerWeeklyAssignment(state, taskId, person.id)
    return true
  }
  return false
}

export function enforceGroupExactMembers(config, state, rules, warnings) {
  for (const rule of getDailyExactMembersRules(rules)) {
    const group = resolveDailyGroup(config, rule.params.groupId)
    const exact = getExactCountFromParams(rule.params)
    if (!group) {
      warnings.push(`Seva group not found: ${rule.params.groupId}`)
      continue
    }

    const groupId = group.id
    group.slotCount = exact

    for (const day of config.weekDays) {
      if (!config.assignments[day.id]) config.assignments[day.id] = {}
      let slots = config.assignments[day.id][groupId]
      if (!slots) {
        slots = Array.from({ length: exact }, () => emptySevaSlot())
        config.assignments[day.id][groupId] = slots
      }
      while (slots.length < exact) slots.push(emptySevaSlot())
      if (slots.length > exact) {
        for (let i = exact; i < slots.length; i++) {
          clearDailySlot(config, state, day.id, groupId, i)
        }
        slots.length = exact
      }

      trimDailyGroupToExact(config, state, day.id, groupId, exact)

      let filled = countFilledSlots(slots)
      let guard = 0
      while (filled < exact && guard < config.people.length + 5) {
        guard++
        const emptyIdx = slots.findIndex((s, i) => i < exact && !s.personId)
        if (emptyIdx < 0) break
        if (tryAssignToSlot(config, state, rules, day.id, groupId, emptyIdx)) {
          filled++
        } else {
          warnings.push(
            `${day.label} ${group.code}: need exactly ${exact} members — only ${filled} filled`,
          )
          break
        }
      }

      trimDailyGroupToExact(config, state, day.id, groupId, exact)
      filled = countFilledSlots(slots)
      if (filled !== exact) {
        warnings.push(
          `${day.label} ${group.code}: need exactly ${exact} members — currently ${filled}`,
        )
      }
    }
  }
}

export function enforceWeeklyTaskExactMembers(config, state, rules, warnings) {
  applyWeeklyExactSlotCapacity(config, rules)

  for (const rule of getWeeklyExactMembersRules(rules)) {
    const task = resolveWeeklyTask(config, rule.params.taskId)
    const exact = getExactCountFromParams(rule.params)
    if (!task) {
      warnings.push(`Weekly task not found: ${rule.params.taskId}`)
      continue
    }

    const colCount = getWeeklyColumnCount(config)
    padWeeklyPersonIds(task, colCount)

    for (let i = exact; i < task.personIds.length; i++) {
      const pid = task.personIds[i]
      if (pid) {
        unregisterWeeklyAssignment(state, task.id, pid)
        task.personIds[i] = null
      }
    }

    let filled = countFilledWeekly(task)
    while (filled > exact) {
      let cleared = false
      for (let i = task.personIds.length - 1; i >= 0; i--) {
        const pid = task.personIds[i]
        if (pid) {
          unregisterWeeklyAssignment(state, task.id, pid)
          task.personIds[i] = null
          filled--
          cleared = true
          break
        }
      }
      if (!cleared) break
    }

    let guard = 0
    while (filled < exact && guard < config.people.length + 5) {
      guard++
      const emptyIdx = task.personIds.findIndex((id, i) => i < exact && !id)
      if (emptyIdx < 0) break
      if (tryAssignToWeeklySlot(config, state, rules, task.id, emptyIdx)) {
        filled++
      } else {
        warnings.push(
          `S5 ${task.title}: need exactly ${exact} members — only ${filled} filled`,
        )
        break
      }
    }

    filled = countFilledWeekly(task)
    if (filled !== exact) {
      warnings.push(`S5 ${task.title}: need exactly ${exact} members — currently ${filled}`)
    }
  }
}

/** @deprecated use getExactMembersRuleScope */
export const getMinMembersRuleScope = getExactMembersRuleScope
