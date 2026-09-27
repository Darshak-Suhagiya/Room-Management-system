import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { personLabel } from '../../utils/reportAttendance'

function noteOptions(note, roster) {
  const options = (roster ?? []).map((person) => ({
    id: person.id,
    displayName: personLabel(person),
  }))
  if (note?.userId && !options.some((person) => person.id === note.userId)) {
    options.push({
      id: note.userId,
      displayName: note.displayName || 'Member',
    })
  }
  return options
}

export function ReportNoteForm({
  open,
  onClose,
  note,
  dateId,
  roster,
  saving,
  onSave,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={note ? 'Edit note' : 'New note'}
      subtitle="A note about one person on this day."
      busy={saving}
      artKey="reports"
      className="reports-sheet"
    >
      {open ? (
        <NoteFields
          key={note?.id || `new-${dateId}`}
          note={note}
          dateId={dateId}
          roster={roster}
          saving={saving}
          onClose={onClose}
          onSave={onSave}
        />
      ) : null}
    </Modal>
  )
}

function NoteFields({ note, dateId, roster, saving, onClose, onSave }) {
  const options = noteOptions(note, roster)
  const [date, setDate] = useState(note?.date || dateId)
  const [userId, setUserId] = useState(note?.userId || options[0]?.id || '')
  const [text, setText] = useState(note?.text || '')
  const [formError, setFormError] = useState('')

  const submit = async (formEvent) => {
    formEvent.preventDefault()
    setFormError('')
    const person = options.find((item) => item.id === userId)
    try {
      await onSave({
        id: note?.id || null,
        date,
        userId,
        displayName: person?.displayName || note?.displayName || 'Member',
        text,
      })
    } catch (err) {
      setFormError(err.message || 'Could not save the note.')
    }
  }

  return (
    <form className="reports-form" onSubmit={submit}>
      {formError ? <p className="form-error">{formError}</p> : null}
      <label className="field-stack">
        <span className="field-stack-label">Date</span>
        <input
          type="date"
          className="app-input"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </label>
      <label className="field-stack">
        <span className="field-stack-label">Person</span>
        <select
          className="app-input"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          required
        >
          <option value="" disabled>
            Choose a person
          </option>
          {options.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}
            </option>
          ))}
        </select>
      </label>
      {options.length === 0 ? (
        <p className="muted">No approved members to write about.</p>
      ) : null}
      <label className="field-stack">
        <span className="field-stack-label">Note</span>
        <textarea
          className="app-textarea"
          rows={5}
          value={text}
          maxLength={2000}
          required
          onChange={(event) => setText(event.target.value)}
          placeholder="What should be remembered about this person?"
        />
      </label>
      <div className="reports-card-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || !userId}>
          {saving ? 'Saving…' : note ? 'Save note' : 'Add note'}
        </button>
      </div>
    </form>
  )
}
