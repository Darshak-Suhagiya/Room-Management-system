import { useEffect, useMemo, useState } from 'react'
import { saveCategoryPlanningGroups } from '../services/catalogService'
import { makePlanningGroupId } from '../utils/planningViewGroups'

/**
 * Optional planning-view groups for one category (Menu Editing).
 * Does not affect votes or stored menus — only how Menu Planning lists dishes.
 */
export function PlanningViewGroupsEditor({ category, items, onSaved, onError }) {
  const existingGroups = useMemo(
    () =>
      [...(category.planningGroups ?? [])]
        .map((g, index) => ({
          id: g.id,
          label: g.label ?? '',
          order: g.order ?? index,
        }))
        .sort((a, b) => a.order - b.order),
    [category.planningGroups],
  )

  const [enabled, setEnabled] = useState(existingGroups.length > 0)
  const [groups, setGroups] = useState(existingGroups)
  const [assignments, setAssignments] = useState(() => {
    const map = {}
    for (const item of items) {
      map[item.id] = item.planningGroupId ?? ''
    }
    return map
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const next = [...(category.planningGroups ?? [])]
      .map((g, index) => ({
        id: g.id,
        label: g.label ?? '',
        order: g.order ?? index,
      }))
      .sort((a, b) => a.order - b.order)
    setEnabled(next.length > 0)
    setGroups(next.length > 0 ? next : [])
    const map = {}
    for (const item of items) {
      map[item.id] = item.planningGroupId ?? ''
    }
    setAssignments(map)
  }, [category.id, category.planningGroups, items])

  const addGroup = () => {
    const index = groups.length
    setGroups((prev) => [
      ...prev,
      {
        id: makePlanningGroupId(`group-${index + 1}`, index),
        label: `Group ${index + 1}`,
        order: index,
      },
    ])
    setEnabled(true)
  }

  const removeGroup = (groupId) => {
    setGroups((prev) =>
      prev
        .filter((g) => g.id !== groupId)
        .map((g, index) => ({ ...g, order: index })),
    )
    setAssignments((prev) => {
      const next = { ...prev }
      for (const id of Object.keys(next)) {
        if (next[id] === groupId) next[id] = ''
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payloadGroups = enabled
        ? groups
            .map((g, index) => ({
              id: g.id || makePlanningGroupId(g.label, index),
              label: g.label.trim(),
              order: index,
            }))
            .filter((g) => g.label)
        : []

      if (enabled && payloadGroups.length === 0) {
        throw new Error('Add at least one group, or turn grouping off.')
      }

      await saveCategoryPlanningGroups(category.id, payloadGroups, assignments)
      onSaved?.(
        payloadGroups.length > 0
          ? 'Planning view groups saved.'
          : 'Planning view groups cleared — flat list in Menu Planning.',
      )
    } catch (err) {
      onError?.(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="planning-groups-editor">
      <div className="planning-groups-editor-head">
        <label className="planning-groups-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              const on = e.target.checked
              setEnabled(on)
              if (on && groups.length === 0) {
                setGroups([
                  {
                    id: makePlanningGroupId('group-1', 0),
                    label: 'Group 1',
                    order: 0,
                  },
                ])
              }
            }}
          />
          <span>
            Planning view groups (optional)
            <small className="muted">
              {' '}
              — only changes how this category looks in Menu Planning
            </small>
          </span>
        </label>
      </div>

      {enabled && (
        <>
          <ul className="planning-groups-list">
            {groups.map((g, index) => (
              <li key={g.id} className="planning-groups-row">
                <input
                  type="text"
                  value={g.label}
                  placeholder={`Group ${index + 1} name`}
                  onChange={(e) => {
                    const label = e.target.value
                    setGroups((prev) =>
                      prev.map((row) =>
                        row.id === g.id ? { ...row, label } : row,
                      ),
                    )
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeGroup(g.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={addGroup}
          >
            Add group
          </button>

          <p className="muted planning-groups-hint">
            Assign every item below to a group before saving.
          </p>
          <ul className="planning-groups-assign-list">
            {items.map((item) => (
              <li key={item.id} className="planning-groups-assign-row">
                <span className="planning-groups-assign-name">
                  {item.gu || item.en}
                </span>
                <select
                  value={assignments[item.id] ?? ''}
                  onChange={(e) =>
                    setAssignments((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                >
                  <option value="">Choose group…</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label || g.id}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="planning-groups-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save planning groups'}
        </button>
      </div>
    </div>
  )
}
