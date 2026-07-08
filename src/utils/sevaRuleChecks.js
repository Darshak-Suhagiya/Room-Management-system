import {
  personDailyCount,
  personHasLoadKeyOnDay,
  personWeeklyCount,
} from './sevaPrefillState'

function parseLoadKeys(params) {
  const raw = params.loadKeys
  if (Array.isArray(raw)) return raw.map((k) => String(k).trim()).filter(Boolean)
  if (typeof raw === 'string') {
    return raw.split(',').map((k) => k.trim()).filter(Boolean)
  }
  return []
}

export function violatesRule(state, rule, personId, slot) {
  if (!rule.enabled) return false
  const p = state.byPerson[personId]
  if (!p) return true
  const { params } = rule

  switch (rule.type) {
    case 'mutex_load_keys_same_day': {
      if (slot.kind !== 'daily' || !slot.loadKey) return false
      const keys = parseLoadKeys(params)
      if (keys.length < 2 || !keys.includes(slot.loadKey)) return false
      for (const otherKey of keys) {
        if (otherKey === slot.loadKey) continue
        if (personHasLoadKeyOnDay(state, personId, slot.dayId, otherKey)) {
          return true
        }
      }
      return false
    }
    case 'max_works_per_day': {
      if (slot.kind !== 'daily') return false
      const max = Number(params.max) || 2
      return personDailyCount(state, personId, slot.dayId) >= max
    }
    case 'max_works_per_week': {
      if (slot.kind !== 'daily') return false
      const max = Number(params.max) || 12
      return p.dailyWeekTotal >= max
    }
    case 'max_load_key_total': {
      if (slot.kind !== 'daily' || !slot.loadKey) return false
      const loadKey = params.loadKey || slot.loadKey
      if (params.personId && params.personId !== personId) return false
      const max = Number(params.max) || 1
      return (p.loadKeyWeek[loadKey] ?? 0) >= max
    }
    case 'max_s5_per_person': {
      if (slot.kind !== 'weekly') return false
      const max = Number(params.max) || 1
      return personWeeklyCount(state, personId) >= max
    }
    case 'exclude_day': {
      if (slot.kind !== 'daily') return false
      if (params.personId !== personId) return false
      return params.dayId === slot.dayId
    }
    case 'exclude_load_key_on_day': {
      if (slot.kind !== 'daily' || !slot.loadKey) return false
      const loadKey = params.loadKey
      if (loadKey && slot.loadKey !== loadKey) return false
      if (params.personId && params.personId !== personId) return false
      return params.dayId === slot.dayId
    }
    case 'exclude_group_on_day': {
      if (slot.kind !== 'daily') return false
      return (
        params.personId === personId &&
        params.groupId === slot.groupId &&
        params.dayId === slot.dayId
      )
    }
    case 'require_weekly_task':
    case 'group_exact_members':
      return false
  }

  // Legacy (migrated to group_exact_members on load)
  if (rule.type === 'group_min_members' || rule.type === 'group_max_members') {
    return false
  }

  return false
}

export function canAssign(state, rules, personId, slot, alreadyInSlot) {
  if (!personId) return false
  if (alreadyInSlot) return false
  const sorted = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority)
  for (const rule of sorted) {
    if (violatesRule(state, rule, personId, slot)) return false
  }
  return true
}

export function buildDailySlotMeta(config, dayId, groupId) {
  const group = config.dailyGroups.find((g) => g.id === groupId)
  return {
    kind: 'daily',
    dayId,
    groupId,
    loadKey: group?.loadKey ?? null,
  }
}

export function buildWeeklySlotMeta(taskId) {
  return { kind: 'weekly', taskId }
}
