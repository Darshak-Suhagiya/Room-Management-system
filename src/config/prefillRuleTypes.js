/** Seva auto-prefill rule type definitions */

export const PREFILL_RULE_TYPES = {
  mutex_load_keys_same_day: {
    id: 'mutex_load_keys_same_day',
    labelGu: 'No two load keys same day (e.g. S1+S2)',
    fields: [
      {
        key: 'loadKeys',
        label: 'Load keys (comma)',
        type: 'text',
        placeholder: 'S1,S2',
      },
    ],
  },
  max_works_per_day: {
    id: 'max_works_per_day',
    labelGu: 'Max tasks per day',
    fields: [{ key: 'max', label: 'Maximum', type: 'number', default: 2 }],
  },
  max_works_per_week: {
    id: 'max_works_per_week',
    labelGu: 'Max daily tasks per week',
    fields: [{ key: 'max', label: 'Maximum', type: 'number', default: 12 }],
  },
  max_load_key_total: {
    id: 'max_load_key_total',
    labelGu: 'Max load key per person (e.g. S1 max 1)',
    fields: [
      { key: 'loadKey', label: 'Load key', type: 'text', placeholder: 'S1' },
      { key: 'max', label: 'Maximum', type: 'number', default: 1 },
      {
        key: 'personId',
        label: 'Person (empty = all)',
        type: 'person',
        optional: true,
      },
    ],
  },
  max_s5_per_person: {
    id: 'max_s5_per_person',
    labelGu: 'Max S5 per person (e.g. only 1)',
    fields: [{ key: 'max', label: 'Max S5', type: 'number', default: 1 }],
  },
  exclude_load_key_on_day: {
    id: 'exclude_load_key_on_day',
    labelGu: 'Exclude load key on day (e.g. no S4 on Friday)',
    fields: [
      { key: 'loadKey', label: 'Load key', type: 'text', placeholder: 'S4' },
      { key: 'dayId', label: 'Day', type: 'day' },
      {
        key: 'personId',
        label: 'Person (empty = all)',
        type: 'person',
        optional: true,
      },
    ],
  },
  exclude_day: {
    id: 'exclude_day',
    labelGu: 'Person cannot work on a specific day',
    fields: [
      { key: 'personId', label: 'Person', type: 'person' },
      { key: 'dayId', label: 'Day', type: 'day' },
    ],
  },
  exclude_group_on_day: {
    id: 'exclude_group_on_day',
    labelGu: 'Person cannot do a seva group on a day',
    fields: [
      { key: 'personId', label: 'Person', type: 'person' },
      { key: 'groupId', label: 'Seva group', type: 'group' },
      { key: 'dayId', label: 'Day', type: 'day' },
    ],
  },
  require_weekly_task: {
    id: 'require_weekly_task',
    labelGu: 'Required weekly task (S5)',
    fields: [
      { key: 'personId', label: 'Person', type: 'person' },
      { key: 'taskId', label: 'Weekly task', type: 'weeklyTask' },
    ],
  },
  group_exact_members: {
    id: 'group_exact_members',
    labelGu: 'Exact members in seva (S1–S5)',
    /** Custom editor in SevaPrefillPanel — S1–S4 group or S5 + weekly task */
    fields: [
      { key: 'scope', label: 'Seva', type: 'exactMembersScope' },
      { key: 'groupId', label: 'Daily seva', type: 'group' },
      { key: 'taskId', label: 'Weekly task (S5)', type: 'weeklyTask' },
      { key: 'exact', label: 'Exact count', type: 'number', default: 3 },
    ],
  },
}

export function createRuleId() {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyRule(type) {
  const def = PREFILL_RULE_TYPES[type]
  const params = {}
  for (const f of def?.fields ?? []) {
    if (f.type === 'number') params[f.key] = f.default ?? 1
    else if (f.key === 'loadKeys') params[f.key] = ['S1', 'S2']
    else if (f.key === 'scope') params[f.key] = 'daily'
    else params[f.key] = ''
  }
  if (type === 'group_exact_members') {
    params.scope = 'daily'
    params.groupId = 's1'
    params.taskId = ''
    params.exact = 3
  }
  return {
    id: createRuleId(),
    type,
    enabled: true,
    priority: 10,
    params,
  }
}

function normalizeExactMembersParams(params = {}) {
  const exact = Number(params.exact ?? params.min ?? params.max) || 1
  const hasWeekly =
    params.scope === 'weekly' ||
    (params.taskId &&
      (!params.groupId ||
        params.groupId === '__weekly__' ||
        String(params.groupId).toLowerCase() === 's5'))
  if (hasWeekly) {
    return {
      scope: 'weekly',
      groupId: '',
      taskId: params.taskId ?? '',
      exact,
    }
  }
  return {
    scope: 'daily',
    groupId: params.groupId ?? '',
    taskId: '',
    exact,
  }
}

const LEGACY_EXACT_RULE_TYPES = new Set([
  'group_min_members',
  'group_max_members',
  'group_exact_members',
])

export function normalizePrefillRules(rules) {
  if (!Array.isArray(rules)) return getDefaultPrefillRules()
  return rules.map((r) => {
    if (LEGACY_EXACT_RULE_TYPES.has(r.type)) {
      return {
        ...r,
        type: 'group_exact_members',
        params: normalizeExactMembersParams(r.params),
      }
    }
    return r
  })
}

export function getDefaultPrefillRules() {
  return [
    {
      id: 'rule_default_mutex_s1_s2',
      type: 'mutex_load_keys_same_day',
      enabled: true,
      priority: 1,
      params: { loadKeys: ['S1', 'S2'] },
    },
    {
      id: 'rule_default_max_day',
      type: 'max_works_per_day',
      enabled: true,
      priority: 2,
      params: { max: 2 },
    },
    {
      id: 'rule_default_max_s1',
      type: 'max_load_key_total',
      enabled: true,
      priority: 3,
      params: { loadKey: 'S1', max: 1 },
    },
    {
      id: 'rule_default_max_s5',
      type: 'max_s5_per_person',
      enabled: true,
      priority: 4,
      params: { max: 1 },
    },
    {
      id: 'rule_default_no_s4_friday',
      type: 'exclude_load_key_on_day',
      enabled: true,
      priority: 5,
      params: { loadKey: 'S4', dayId: 'friday' },
    },
  ]
}
