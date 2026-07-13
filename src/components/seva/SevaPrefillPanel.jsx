import { useState } from 'react'
import {
  PREFILL_RULE_TYPES,
  createEmptyRule,
} from '../../config/prefillRuleTypes'
import { runSevaPrefill } from '../../utils/sevaPrefillEngine'
import {
  EXACT_SCOPE_DAILY,
  EXACT_SCOPE_WEEKLY,
  WEEKLY_EXACT_TARGET,
  getExactCountFromParams,
  getExactMembersRuleScope,
  isWeeklyExactRule,
} from '../../utils/sevaPrefillExactMembers'

function ruleSummary(rule, config) {
  const def = PREFILL_RULE_TYPES[rule.type]
  if (!def) return rule.type
  const p = rule.params
  switch (rule.type) {
    case 'mutex_load_keys_same_day':
      return `No ${(p.loadKeys || []).join('+')} same day`
    case 'max_works_per_day':
      return `Max ${p.max} per day`
    case 'max_works_per_week':
      return `Max ${p.max} per week`
    case 'max_load_key_total': {
      const name = p.personId
        ? config.people.find((x) => x.id === p.personId)?.name
        : 'everyone'
      return `${name}: ${p.loadKey} max ${p.max}`
    }
    case 'exclude_day': {
      const name = config.people.find((x) => x.id === p.personId)?.name
      const day = config.weekDays.find((d) => d.id === p.dayId)?.label
      return `${name} — not on ${day}`
    }
    case 'exclude_group_on_day': {
      const name = config.people.find((x) => x.id === p.personId)?.name
      const day = config.weekDays.find((d) => d.id === p.dayId)?.label
      const g = config.dailyGroups.find((x) => x.id === p.groupId)?.code
      return `${name} — no ${g} on ${day}`
    }
    case 'require_weekly_task': {
      const name = config.people.find((x) => x.id === p.personId)?.name
      const t = config.weeklyTasks.find((x) => x.id === p.taskId)?.title
      return `${name} → ${t}`
    }
    case 'max_s5_per_person':
      return `Max S5 per person: ${p.max ?? 1}`
    case 'exclude_load_key_on_day': {
      const day = config.weekDays.find((d) => d.id === p.dayId)?.label
      return `${day}: no ${p.loadKey}`
    }
    case 'group_exact_members': {
      const exact = getExactCountFromParams(p)
      if (isWeeklyExactRule(rule)) {
        const t = config.weeklyTasks.find((x) => x.id === p.taskId)?.title
        return `S5 ${t ?? p.taskId}: exactly ${exact} members`
      }
      const g =
        config.dailyGroups.find((x) => x.id === p.groupId)?.code ?? p.groupId
      return `${g}: exactly ${exact} members`
    }
    default:
      return def.labelGu
  }
}

function ExactMembersRuleFields({ rule, config, onParamsChange }) {
  const scope = getExactMembersRuleScope(rule)
  const exact = getExactCountFromParams(rule.params)
  const target =
    scope === EXACT_SCOPE_WEEKLY
      ? WEEKLY_EXACT_TARGET
      : (rule.params.groupId ?? '')

  const pickTarget = (value) => {
    if (value === WEEKLY_EXACT_TARGET) {
      const firstTask = config.weeklyTasks[0]?.id ?? ''
      onParamsChange({
        scope: EXACT_SCOPE_WEEKLY,
        groupId: '',
        taskId: rule.params.taskId || firstTask,
        exact,
      })
    } else {
      onParamsChange({
        scope: EXACT_SCOPE_DAILY,
        groupId: value,
        taskId: '',
        exact,
      })
    }
  }

  return (
    <>
      <label>
        Seva (S1–S5)
        <select value={target} onChange={(e) => pickTarget(e.target.value)}>
          <option value="">Select…</option>
          {config.dailyGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.code}
            </option>
          ))}
          <option value={WEEKLY_EXACT_TARGET}>S5 — weekly task</option>
        </select>
      </label>
      {scope === EXACT_SCOPE_WEEKLY && (
        <label>
          Weekly task
          <select
            value={rule.params.taskId ?? ''}
            onChange={(e) =>
              onParamsChange({
                scope: EXACT_SCOPE_WEEKLY,
                groupId: '',
                taskId: e.target.value,
                exact,
              })
            }
          >
            <option value="">Select…</option>
            {config.weeklyTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Exact members
        <input
          type="number"
          min={1}
          value={exact}
          onChange={(e) =>
            onParamsChange({
              scope,
              groupId: rule.params.groupId ?? '',
              taskId: rule.params.taskId ?? '',
              exact: Number(e.target.value) || 1,
            })
          }
        />
      </label>
    </>
  )
}

function FieldEditor({ field, value, onChange, config }) {
  if (field.type === 'person') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {!field.optional && <option value="">Select…</option>}
        {field.optional && <option value="">All</option>}
        {config.people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === 'day') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {config.weekDays.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === 'group') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {config.dailyGroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.code}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === 'weeklyTask') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {config.weeklyTasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === 'number') {
    return (
      <input
        type="number"
        min={0}
        value={value ?? field.default ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    )
  }
  if (field.key === 'loadKeys') {
    const str = Array.isArray(value) ? value.join(',') : value ?? ''
    return (
      <input
        type="text"
        value={str}
        placeholder="S1,S2"
        onChange={(e) =>
          onChange(
            e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
          )
        }
      />
    )
  }
  return (
    <input
      type="text"
      value={value ?? ''}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function SevaPrefillPanel({ config, onRulesChange, onPrefillResult }) {
  const rules = config.prefillRules ?? []
  const [newRuleType, setNewRuleType] = useState('max_works_per_day')
  const [lastWarnings, setLastWarnings] = useState([])
  const [running, setRunning] = useState(false)

  const updateRules = (next) => onRulesChange(next)

  const updateRule = (id, patch) => {
    updateRules(
      rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
  }

  const updateRuleParams = (id, key, value) => {
    updateRules(
      rules.map((r) =>
        r.id === id ? { ...r, params: { ...r.params, [key]: value } } : r,
      ),
    )
  }

  const removeRule = (id) => updateRules(rules.filter((r) => r.id !== id))

  const moveRule = (id, dir) => {
    const idx = rules.findIndex((r) => r.id === id)
    if (idx < 0) return
    const next = [...rules]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    updateRules(
      next.map((r, i) => ({ ...r, priority: (i + 1) * 10 })),
    )
  }

  const addRule = () => {
    const rule = createEmptyRule(newRuleType)
    rule.priority = (rules.length + 1) * 10
    updateRules([...rules, rule])
  }

  const handlePrefill = () => {
    if (
      !window.confirm(
        'Current assignments will be cleared and refilled by rules. Continue?',
      )
    ) {
      return
    }
    setRunning(true)
    try {
      const result = runSevaPrefill(config, rules)
      setLastWarnings(result.warnings)
      onPrefillResult(result.config, result.warnings)
    } finally {
      setRunning(false)
    }
  }

  const sorted = [...rules].sort((a, b) => a.priority - b.priority)

  return (
    <section className="seva-section seva-prefill-panel seva-no-print">
      <h3 className="seva-section-title">Auto-fill rules</h3>
      <p className="muted seva-prefill-hint">
        Rules are saved below. Run fill to reset assignments and apply rules. Lower load
        and tasks not done recently are preferred. Total seva load per person must stay
        within 0 or 1 of each other.
      </p>

      <div className="seva-prefill-add">
        <select value={newRuleType} onChange={(e) => setNewRuleType(e.target.value)}>
          {Object.values(PREFILL_RULE_TYPES).map((t) => (
            <option key={t.id} value={t.id}>
              {t.labelGu}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary btn-sm" onClick={addRule}>
          + Rule
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={running}
          onClick={handlePrefill}
        >
          {running ? 'Filling…' : 'Fill and assign'}
        </button>
      </div>

      {lastWarnings.length > 0 && (
        <div className="seva-prefill-warnings">
          <strong>Note:</strong>
          <ul>
            {lastWarnings.slice(0, 8).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {lastWarnings.length > 8 && (
              <li>…and {lastWarnings.length - 8} more</li>
            )}
          </ul>
        </div>
      )}

      <div className="seva-prefill-rules-list">
        {sorted.length === 0 ? (
          <p className="muted">No rules — add above or save to use defaults.</p>
        ) : (
          sorted.map((rule, index) => {
            const def = PREFILL_RULE_TYPES[rule.type]
            return (
              <article key={rule.id} className="seva-prefill-rule-card">
                <div className="seva-prefill-rule-head">
                  <div className="seva-prefill-rule-title-block">
                    <h4 className="seva-prefill-rule-title">
                      {def?.labelGu ?? rule.type}
                    </h4>
                    <span className="seva-prefill-rule-summary">
                      {ruleSummary(rule, config)}
                    </span>
                  </div>
                  <label className="seva-prefill-enable">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) =>
                        updateRule(rule.id, { enabled: e.target.checked })
                      }
                    />
                    Enabled
                  </label>
                  <label>
                    Priority
                    <input
                      type="number"
                      className="seva-priority-input"
                      value={rule.priority}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          priority: Number(e.target.value) || 10,
                        })
                      }
                    />
                  </label>
                  <div className="seva-prefill-rule-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={index === 0}
                      onClick={() => moveRule(rule.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={index === sorted.length - 1}
                      onClick={() => moveRule(rule.id, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeRule(rule.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {def && rule.type === 'group_exact_members' && (
                  <div className="seva-prefill-rule-fields">
                    <ExactMembersRuleFields
                      rule={rule}
                      config={config}
                      onParamsChange={(params) =>
                        updateRule(rule.id, { params })
                      }
                    />
                  </div>
                )}
                {def && rule.type !== 'group_exact_members' && (
                  <div className="seva-prefill-rule-fields">
                    {def.fields.map((field) => (
                      <label key={field.key}>
                        {field.label}
                        <FieldEditor
                          field={field}
                          value={rule.params[field.key]}
                          config={config}
                          onChange={(v) =>
                            updateRuleParams(rule.id, field.key, v)
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
