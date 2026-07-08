import { emptySevaSlot } from '../config/defaultSevaSeed'
import {
  getDefaultPrefillRules,
  normalizePrefillRules,
} from '../config/prefillRuleTypes'
import { getWeeklyColumnCount } from './sevaMutations'
import {
  buildDailySlotMeta,
  buildWeeklySlotMeta,
  canAssign,
} from './sevaRuleChecks'
import {
  applyExactMemberSlotCapacity,
  applyWeeklyExactSlotCapacity,
  countExactMemberViolations,
  enforceGroupExactMembers,
  enforceWeeklyTaskExactMembers,
  getDailyExactMembersRules,
  getWeeklyExactMembersRules,
  mustFillSlotForExact,
  mustFillWeeklySlotForExact,
  mustLeaveDailySlotEmpty,
  mustLeaveWeeklySlotEmpty,
  resolveDailyGroup,
  resolveWeeklyTask,
  wouldBreakGroupExactOnRemove,
  wouldBreakWeeklyExactOnRemove,
} from './sevaPrefillExactMembers'
import {
  MAX_LOAD_SPREAD,
  canAssignWithinLoadSpread,
  clearAllAssignments,
  collectDailySlots,
  createAssignmentState,
  getLoadSpread,
  getPersonTotalLoad,
  isLoadSpreadBalanced,
  registerDailyAssignment,
  registerWeeklyAssignment,
  shuffleArray,
  unregisterDailyAssignment,
  unregisterWeeklyAssignment,
} from './sevaPrefillState'

const MAX_ATTEMPTS = 40
const BALANCE_ITERATIONS = 200

function scoreCandidate(state, rules, personId, slot, alreadyInSlot) {
  if (alreadyInSlot) return Infinity
  if (!canAssign(state, rules, personId, slot, false)) return Infinity
  if (!canAssignWithinLoadSpread(state, state.config, personId)) return Infinity

  const p = state.byPerson[personId]
  let score = getPersonTotalLoad(state, personId) * 100

  if (slot.kind === 'daily') {
    if (slot.loadKey) {
      score += (p.loadKeyWeek[slot.loadKey] ?? 0) * 120
    }
    score += (p.groupIdWeek[slot.groupId] ?? 0) * 60
  }

  if (slot.kind === 'weekly') {
    score += p.weeklyTaskIds.length * 150
  }

  score += Math.random() * 8
  return score
}

function rankCandidates(state, rules, slot, people, takenIds) {
  return people
    .filter((p) => !takenIds.has(p.id))
    .map((p) => ({
      id: p.id,
      score: scoreCandidate(state, rules, p.id, slot, false),
    }))
    .filter((c) => c.score < Infinity)
    .sort((a, b) => a.score - b.score)
}

function applyRequiredWeekly(config, state, rules) {
  const warnings = []
  const required = rules.filter(
    (r) => r.enabled && r.type === 'require_weekly_task',
  )
  const colCount = getWeeklyColumnCount(config)

  for (const rule of required) {
    const { personId, taskId } = rule.params
    if (!personId || !taskId) continue
    const task = config.weeklyTasks.find((t) => t.id === taskId)
    if (!task) {
      warnings.push(`Weekly task not found: ${taskId}`)
      continue
    }
    if (!task.personIds) task.personIds = Array(colCount).fill(null)
    if (task.personIds.includes(personId)) {
      registerWeeklyAssignment(state, taskId, personId)
      continue
    }
    const emptyIdx = task.personIds.findIndex((id) => !id)
    if (emptyIdx === -1) {
      warnings.push(`${task.title}: no slot — ${personId}`)
      continue
    }
    task.personIds[emptyIdx] = personId
    registerWeeklyAssignment(state, taskId, personId)
  }
  return warnings
}

function fillDailyBacktrack(config, state, rules, slotList, index, warnings) {
  if (index >= slotList.length) return true

  const { dayId, groupId, slotIndex } = slotList[index]
  const meta = buildDailySlotMeta(config, dayId, groupId)
  const daySlots = config.assignments[dayId][groupId]
  const taken = new Set(daySlots.filter((s) => s.personId).map((s) => s.personId))

  const candidates = rankCandidates(
    state,
    rules,
    meta,
    config.people,
    taken,
  )

  if (mustLeaveDailySlotEmpty(config, rules, dayId, groupId, slotIndex)) {
    daySlots[slotIndex] = emptySevaSlot()
    return fillDailyBacktrack(config, state, rules, slotList, index + 1, warnings)
  }

  const requiredForExact = mustFillSlotForExact(
    config,
    rules,
    slotList,
    index,
    dayId,
    groupId,
  )

  for (const { id } of candidates) {
    daySlots[slotIndex] = { personId: id, note: '' }
    registerDailyAssignment(state, dayId, groupId, id)

    if (fillDailyBacktrack(config, state, rules, slotList, index + 1, warnings)) {
      return true
    }

    unregisterDailyAssignment(state, dayId, groupId, id)
    daySlots[slotIndex] = emptySevaSlot()
  }

  if (requiredForExact) {
    return false
  }

  const group = config.dailyGroups.find((g) => g.id === groupId)
  daySlots[slotIndex] = emptySevaSlot()
  warnings.push(
    `Empty: ${dayId} / ${group?.code ?? groupId} slot ${slotIndex + 1}`,
  )
  return fillDailyBacktrack(config, state, rules, slotList, index + 1, warnings)
}

function fillWeeklyBacktrack(config, state, rules, tasks, taskIdx, colIdx, warnings) {
  if (taskIdx >= tasks.length) return true

  const task = tasks[taskIdx]
  const colCount = getWeeklyColumnCount(config)
  if (!task.personIds) task.personIds = Array(colCount).fill(null)

  if (colIdx >= colCount) {
    return fillWeeklyBacktrack(config, state, rules, tasks, taskIdx + 1, 0, warnings)
  }

  if (task.personIds[colIdx]) {
    registerWeeklyAssignment(state, task.id, task.personIds[colIdx])
    return fillWeeklyBacktrack(
      config,
      state,
      rules,
      tasks,
      taskIdx,
      colIdx + 1,
      warnings,
    )
  }

  if (mustLeaveWeeklySlotEmpty(config, rules, task.id, colIdx)) {
    return fillWeeklyBacktrack(
      config,
      state,
      rules,
      tasks,
      taskIdx,
      colIdx + 1,
      warnings,
    )
  }

  const meta = buildWeeklySlotMeta(task.id)
  const taken = new Set(task.personIds.filter(Boolean))
  const candidates = rankCandidates(
    state,
    rules,
    meta,
    config.people,
    taken,
  )

  for (const { id } of candidates) {
    task.personIds[colIdx] = id
    registerWeeklyAssignment(state, task.id, id)

    if (
      fillWeeklyBacktrack(config, state, rules, tasks, taskIdx, colIdx + 1, warnings)
    ) {
      return true
    }

    unregisterWeeklyAssignment(state, task.id, id)
    task.personIds[colIdx] = null
  }

  const requiredForExact = mustFillWeeklySlotForExact(
    config,
    rules,
    task.id,
    colIdx,
  )
  if (requiredForExact) {
    return false
  }

  warnings.push(`S5 empty: ${task.title} slot ${colIdx + 1}`)
  return fillWeeklyBacktrack(config, state, rules, tasks, taskIdx, colIdx + 1, warnings)
}

function trySwapWeekly(config, state, rules, fromPersonId, toPersonId) {
  const colCount = getWeeklyColumnCount(config)
  for (const task of config.weeklyTasks) {
    if (!task.personIds) continue
    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      if (task.personIds[colIdx] !== fromPersonId) continue

      if (wouldBreakWeeklyExactOnRemove(config, rules, task.id, fromPersonId)) {
        continue
      }

      const meta = buildWeeklySlotMeta(task.id)
      const taken = new Set(
        task.personIds.filter((id) => id && id !== fromPersonId),
      )

      if (!canAssign(state, rules, toPersonId, meta, taken.has(toPersonId))) {
        continue
      }

      unregisterWeeklyAssignment(state, task.id, fromPersonId)
      task.personIds[colIdx] = null
      task.personIds[colIdx] = toPersonId
      registerWeeklyAssignment(state, task.id, toPersonId)
      return true
    }
  }
  return false
}

function trySwapDaily(config, state, rules, fromPersonId, toPersonId) {
  for (const day of config.weekDays) {
    for (const group of config.dailyGroups) {
      if (group.optional && group.id === 'extra') continue
      const slots = config.assignments[day.id]?.[group.id] ?? []
      const fromIdx = slots.findIndex((s) => s.personId === fromPersonId)
      if (fromIdx < 0) continue

      if (
        wouldBreakGroupExactOnRemove(config, rules, day.id, group.id, fromPersonId)
      ) {
        continue
      }

      const meta = buildDailySlotMeta(config, day.id, group.id)
      const taken = new Set(
        slots
          .filter((s) => s.personId && s.personId !== fromPersonId)
          .map((s) => s.personId),
      )

      if (!canAssign(state, rules, toPersonId, meta, taken.has(toPersonId))) {
        continue
      }

      unregisterDailyAssignment(state, day.id, group.id, fromPersonId)
      slots[fromIdx] = emptySevaSlot()

      slots[fromIdx] = { personId: toPersonId, note: '' }
      registerDailyAssignment(state, day.id, group.id, toPersonId)
      return true
    }
  }
  return false
}

function balanceLoad(config, state, rules) {
  for (let n = 0; n < BALANCE_ITERATIONS; n++) {
    if (isLoadSpreadBalanced(state, config)) break

    const ranked = config.people
      .map((p) => ({ id: p.id, load: getPersonTotalLoad(state, p.id) }))
      .sort((a, b) => a.load - b.load)

    let moved = false
    for (let hi = ranked.length - 1; hi >= 0 && !moved; hi--) {
      for (let lo = 0; lo < hi && !moved; lo++) {
        const high = ranked[hi]
        const low = ranked[lo]
        if (!high || !low || high.load - low.load <= MAX_LOAD_SPREAD) continue
        if (
          trySwapDaily(config, state, rules, high.id, low.id) ||
          trySwapWeekly(config, state, rules, high.id, low.id)
        ) {
          moved = true
        }
      }
    }
    if (!moved) break
  }
}

function scoreSolution(warnings, state, config, rules) {
  const spread = getLoadSpread(state, config)
  const emptyPenalty = warnings.length * 50
  const exactPenalty = countExactMemberViolations(config, rules) * 500
  const spreadPenalty =
    spread <= MAX_LOAD_SPREAD ? spread * 20 : 5000 + (spread - MAX_LOAD_SPREAD) * 1000
  return spreadPenalty + emptyPenalty + exactPenalty
}

function orderWeeklyTasksForFill(config, rules, tasks) {
  const exactTaskIds = new Set(
    getWeeklyExactMembersRules(rules)
      .map((r) => resolveWeeklyTask(config, r.params.taskId)?.id)
      .filter(Boolean),
  )

  return [...tasks].sort((a, b) => {
    const hasExactA = exactTaskIds.has(a.id) ? 1 : 0
    const hasExactB = exactTaskIds.has(b.id) ? 1 : 0
    if (hasExactA !== hasExactB) return hasExactB - hasExactA
    return a.title.localeCompare(b.title)
  })
}

function orderSlotsForFill(config, rules, slots) {
  const exactGroupIds = new Set(
    getDailyExactMembersRules(rules)
      .map((r) => resolveDailyGroup(config, r.params.groupId)?.id)
      .filter(Boolean),
  )

  return [...slots].sort((a, b) => {
    const hasExactA = exactGroupIds.has(a.groupId) ? 1 : 0
    const hasExactB = exactGroupIds.has(b.groupId) ? 1 : 0
    if (hasExactA !== hasExactB) return hasExactB - hasExactA
    if (a.dayId !== b.dayId) return a.dayId.localeCompare(b.dayId)
    const ga = config.dailyGroups.find((g) => g.id === a.groupId)
    const gb = config.dailyGroups.find((g) => g.id === b.groupId)
    return (ga?.sortOrder ?? 0) - (gb?.sortOrder ?? 0)
  })
}

function runSingleAttempt(config, rules) {
  const next = clearAllAssignments(config)
  applyExactMemberSlotCapacity(next, rules)
  applyWeeklyExactSlotCapacity(next, rules)

  const state = createAssignmentState(next)
  const warnings = []

  warnings.push(...applyRequiredWeekly(next, state, rules))

  const dailySlots = shuffleArray(
    orderSlotsForFill(next, rules, collectDailySlots(next)),
  )

  const backtrackOk = fillDailyBacktrack(next, state, rules, dailySlots, 0, warnings)
  if (!backtrackOk) {
    warnings.push(
      'Could not fully fill with all rules — applying exact-member rules',
    )
  }

  enforceGroupExactMembers(next, state, rules, warnings)

  const weeklyTasks = shuffleArray(orderWeeklyTasksForFill(next, rules, next.weeklyTasks))
  fillWeeklyBacktrack(next, state, rules, weeklyTasks, 0, 0, warnings)

  enforceWeeklyTaskExactMembers(next, state, rules, warnings)

  balanceLoad(next, state, rules)

  enforceGroupExactMembers(next, state, rules, warnings)
  enforceWeeklyTaskExactMembers(next, state, rules, warnings)

  balanceLoad(next, state, rules)

  const spread = getLoadSpread(state, next)
  if (spread > MAX_LOAD_SPREAD) {
    warnings.push(
      `Load spread is ${spread} (max ${MAX_LOAD_SPREAD}): keep seva load balanced across everyone`,
    )
  }

  return {
    config: next,
    state,
    warnings,
    spread,
    exactViolations: countExactMemberViolations(next, rules),
  }
}

export function runSevaPrefill(config, rulesInput) {
  const rules = normalizePrefillRules(
    rulesInput?.length > 0 ? rulesInput : getDefaultPrefillRules(),
  )

  let best = null
  let bestWarnings = []
  let bestScore = Infinity

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = runSingleAttempt(config, rules)
    const s = scoreSolution(result.warnings, result.state, result.config, rules)

    if (s < bestScore) {
      best = result.config
      bestWarnings = result.warnings
      bestScore = s
    }
    if (
      result.exactViolations === 0 &&
      result.warnings.length === 0 &&
      result.spread <= 1
    ) {
      break
    }
  }

  return {
    config: best ?? clearAllAssignments(config),
    warnings: bestWarnings,
    rulesUsed: rules,
  }
}
