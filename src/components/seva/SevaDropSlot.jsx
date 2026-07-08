import { useState } from 'react'
import { displayPersonName, getPersonById } from '../../utils/sevaLoadUtils'
import { SevaPersonChipFromId } from './SevaPersonChip'
import { SevaPersonPicker } from './SevaPersonPicker'

export function SevaDropSlot({
  slot,
  people,
  editable,
  dragPayload,
  onDropPerson,
  onSelectPerson,
  onClear,
  onEditNote,
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleDragOver = (e) => {
    if (!editable) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e) => {
    if (!editable) return
    e.preventDefault()
    setPickerOpen(false)
    const raw = e.dataTransfer.getData('application/seva-drag')
    if (!raw) return
    try {
      const payload = JSON.parse(raw)
      onDropPerson(payload)
    } catch {
      /* ignore */
    }
  }

  const filled = !!(slot.personId || slot.note)
  const person = getPersonById(people, slot.personId)
  const printLabel = person
    ? displayPersonName(person, slot.note)
    : slot.note || '—'

  return (
    <td
      className={`seva-slot-cell ${editable ? 'seva-slot-droppable' : ''} ${pickerOpen ? 'seva-slot-picker-open' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {!editable ? (
        <span className="seva-print-text">{printLabel}</span>
      ) : filled ? (
        <SevaPersonChipFromId
          people={people}
          personId={slot.personId}
          note={slot.note}
          editable={editable}
          dragPayload={dragPayload}
          onRemove={onClear}
        />
      ) : (
        <button
          type="button"
          className="seva-chip seva-chip-empty seva-slot-add"
          onClick={() => setPickerOpen(true)}
        >
          + Add
        </button>
      )}
      {editable && pickerOpen && (
        <SevaPersonPicker
          people={people}
          onSelect={(personId) => {
            onSelectPerson(personId)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {editable && slot.personId && (
        <input
          type="text"
          className="seva-slot-note"
          placeholder="Note (e.g. outside)"
          value={slot.note ?? ''}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onEditNote(e.target.value)}
        />
      )}
    </td>
  )
}
