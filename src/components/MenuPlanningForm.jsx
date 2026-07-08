import { useEffect, useState } from 'react'
import { MEAL_SLOTS, emptyMealSlot } from '../config/menuItems'
import { useToast } from '../contexts/ToastContext'
import { validateMenuPlan } from '../utils/validateMenuPlan'

function CategoryPicker({ category, items, selected, onChange }) {
  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id]
    onChange(next)
  }

  if (items.length === 0) return null

  return (
    <fieldset className="category-picker">
      <legend>{category.labelGu}</legend>
      <div className="checkbox-grid">
        {items.map((item) => (
          <label key={item.id} className="checkbox-chip">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
            />
            <span>{item.gu}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function SlotEditor({ slotKey, catalog, value, note, onChange, onNoteChange }) {
  const slot = MEAL_SLOTS[slotKey]
  return (
    <section className="slot-editor">
      <h3>{slot.labelEn}</h3>
      <label className="menu-slot-note-field">
        Note for everyone (optional)
        <textarea
          rows={2}
          value={note}
          placeholder={`Message shown on ${slot.labelEn.toLowerCase()} menu…`}
          onChange={(e) => onNoteChange(e.target.value)}
        />
      </label>
      {catalog.categories.map((cat) => (
        <CategoryPicker
          key={cat.id}
          category={cat}
          items={catalog.itemsByCategory[cat.id] ?? []}
          selected={value[cat.id] ?? []}
          onChange={(ids) => onChange({ ...value, [cat.id]: ids })}
        />
      ))}
    </section>
  )
}

export function MenuPlanningForm({
  dateId,
  initialMenu,
  catalog,
  categoryIds,
  onSave,
  saving,
}) {
  const toast = useToast()
  const [hasMorning, setHasMorning] = useState(false)
  const [hasEvening, setHasEvening] = useState(false)
  const [morning, setMorning] = useState(() => emptyMealSlot(categoryIds))
  const [evening, setEvening] = useState(() => emptyMealSlot(categoryIds))
  const [morningNote, setMorningNote] = useState('')
  const [eveningNote, setEveningNote] = useState('')

  useEffect(() => {
    setHasMorning(initialMenu?.hasMorning ?? false)
    setHasEvening(initialMenu?.hasEvening ?? false)
    setMorning(initialMenu?.morning ?? emptyMealSlot(categoryIds))
    setEvening(initialMenu?.evening ?? emptyMealSlot(categoryIds))
    setMorningNote(initialMenu?.morningNote ?? '')
    setEveningNote(initialMenu?.eveningNote ?? '')
  }, [initialMenu, dateId, categoryIds])

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationError = validateMenuPlan({
      hasMorning,
      hasEvening,
      morning,
      evening,
      categoryIds,
    })
    if (validationError) {
      toast.error(validationError)
      return
    }
    onSave({
      hasMorning,
      hasEvening,
      morning,
      evening,
      morningNote,
      eveningNote,
    })
  }

  return (
    <form className="menu-form" onSubmit={handleSubmit}>
      <div className="slot-toggles">
        <label className="slot-toggle">
          <input
            type="checkbox"
            checked={hasMorning}
            onChange={(e) => setHasMorning(e.target.checked)}
          />
          <span>Morning</span>
        </label>
        <label className="slot-toggle">
          <input
            type="checkbox"
            checked={hasEvening}
            onChange={(e) => setHasEvening(e.target.checked)}
          />
          <span>Evening</span>
        </label>
      </div>

      {!hasMorning && !hasEvening && (
        <p className="muted">Select morning and/or evening for this date.</p>
      )}

      {hasMorning && (
        <SlotEditor
          slotKey="morning"
          catalog={catalog}
          value={morning}
          note={morningNote}
          onChange={setMorning}
          onNoteChange={setMorningNote}
        />
      )}

      {hasEvening && (
        <SlotEditor
          slotKey="evening"
          catalog={catalog}
          value={evening}
          note={eveningNote}
          onChange={setEvening}
          onNoteChange={setEveningNote}
        />
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving || (!hasMorning && !hasEvening)}
        >
          {saving ? 'Saving…' : 'Save plan'}
        </button>
      </div>
    </form>
  )
}
