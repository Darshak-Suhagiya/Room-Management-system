import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { REPORT_ATTENDANCE_STATUS } from '../../config/constants'
import {
  attendanceCounts,
  buildAttendanceEditorRows,
  countLine,
  personLabel,
  REPORT_OUT_OF_CITY_REASON,
  splitAttendance,
} from '../../utils/reportAttendance'

const STATUS_OPTIONS = [
  { id: REPORT_ATTENDANCE_STATUS.PRESENT, label: 'Present', className: 'is-present' },
  { id: REPORT_ATTENDANCE_STATUS.ABSENT, label: 'Not present', className: 'is-absent' },
]

function createDraft(event, dateId, roster) {
  return {
    id: event?.id || null,
    date: event?.date || dateId,
    title: event?.title || '',
    time: event?.time || '',
    note: event?.note || '',
    rows: buildAttendanceEditorRows(event, roster),
  }
}

export function ReportEventForm({
  open,
  onClose,
  event,
  dateId,
  roster,
  saving,
  onSave,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Edit event' : 'New event'}
      subtitle="Mark who was present (with time) or not present (with a reason)."
      wide
      busy={saving}
      artKey="reports"
      className="reports-sheet"
    >
      {open ? (
        <EventFields
          key={event?.id || `new-${dateId}`}
          event={event}
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

function EventFields({ event, dateId, roster, saving, onClose, onSave }) {
  const [draft, setDraft] = useState(() => createDraft(event, dateId, roster))
  const [filter, setFilter] = useState('')
  const [formError, setFormError] = useState('')

  const counts = attendanceCounts(
    splitAttendance(
      draft.rows.filter((row) => row.status),
      roster,
    ),
  )
  const query = filter.trim().toLowerCase()
  const visibleRows = useMemo(
    () =>
      draft.rows.filter((row) =>
        row.displayName.toLowerCase().includes(query),
      ),
    [draft.rows, query],
  )

  const patchRow = (userId, patch) => {
    setDraft((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        row.userId === userId ? { ...row, ...patch } : row,
      ),
    }))
  }

  const setStatus = (userId, nextStatus) => {
    setDraft((current) => ({
      ...current,
      rows: current.rows.map((row) => {
        if (row.userId !== userId) return row
        if (row.status === nextStatus) {
          return { ...row, status: '', time: '', reason: '' }
        }
        if (nextStatus === REPORT_ATTENDANCE_STATUS.PRESENT) {
          return { ...row, status: nextStatus, reason: '' }
        }
        return { ...row, status: nextStatus, time: '' }
      }),
    }))
  }

  const submit = async (formEvent) => {
    formEvent.preventDefault()
    setFormError('')
    const missing = draft.rows.find(
      (row) =>
        row.status === REPORT_ATTENDANCE_STATUS.ABSENT &&
        !String(row.reason || '').trim(),
    )
    if (missing) {
      setFormError(`${missing.displayName} needs a reason for not being present.`)
      return
    }
    try {
      await onSave({
        id: draft.id,
        date: draft.date,
        title: draft.title,
        time: draft.time,
        note: draft.note,
        attendance: draft.rows,
      })
    } catch (err) {
      setFormError(err.message || 'Could not save the event.')
    }
  }

  return (
    <form className="reports-form" onSubmit={submit}>
      {formError ? <p className="form-error">{formError}</p> : null}
      <div className="reports-form-grid">
        <label className="field-stack">
          <span className="field-stack-label">Event name</span>
          <input
            className="app-input"
            value={draft.title}
            onChange={(input) =>
              setDraft((current) => ({ ...current, title: input.target.value }))
            }
            required
            maxLength={80}
            placeholder="Evening sabha"
          />
        </label>
        <label className="field-stack">
          <span className="field-stack-label">Event time</span>
          <input
            type="time"
            className="app-input"
            value={draft.time}
            onChange={(input) =>
              setDraft((current) => ({ ...current, time: input.target.value }))
            }
            required
          />
        </label>
      </div>
      <label className="field-stack">
        <span className="field-stack-label">Date</span>
        <input
          type="date"
          className="app-input"
          value={draft.date}
          onChange={(input) =>
            setDraft((current) => ({ ...current, date: input.target.value }))
          }
          required
        />
      </label>
      <label className="field-stack">
        <span className="field-stack-label">Event note</span>
        <textarea
          className="app-textarea"
          rows={2}
          value={draft.note}
          maxLength={1000}
          placeholder="Optional"
          onChange={(input) =>
            setDraft((current) => ({ ...current, note: input.target.value }))
          }
        />
      </label>
      <p className="reports-count-line">{countLine(counts)}</p>
      <label className="field-stack">
        <span className="field-stack-label">Find a person</span>
        <input
          className="app-input"
          value={filter}
          onChange={(input) => setFilter(input.target.value)}
          placeholder="Name"
        />
      </label>
      <div className="reports-person-list">
        {visibleRows.length === 0 ? (
          <p className="muted">No one matches.</p>
        ) : (
          visibleRows.map((row) => (
            <div key={row.userId} className="reports-person-row">
              <span className="reports-person-name">{personLabel(row)}</span>
              <div className="reports-status" role="group" aria-label={`Attendance for ${row.displayName}`}>
                {STATUS_OPTIONS.map((option) => {
                  const active = row.status === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`reports-status-btn ${option.className}${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => setStatus(row.userId, option.id)}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              {row.status === REPORT_ATTENDANCE_STATUS.PRESENT ? (
                <label className="field-stack reports-extra-field">
                  <span className="field-stack-label">Time for this person</span>
                  <input
                    type="time"
                    className="app-input"
                    value={row.time}
                    onChange={(input) => patchRow(row.userId, { time: input.target.value })}
                  />
                </label>
              ) : null}
              {row.status === REPORT_ATTENDANCE_STATUS.ABSENT ? (
                <div className="reports-extra-field reports-reason-row">
                  <button
                    type="button"
                    className={`btn btn-sm ${row.reason === REPORT_OUT_OF_CITY_REASON ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => patchRow(row.userId, { reason: REPORT_OUT_OF_CITY_REASON })}
                  >
                    Out of city
                  </button>
                  <input
                    className="app-input"
                    value={row.reason}
                    maxLength={120}
                    placeholder="Reason"
                    aria-label={`Reason ${row.displayName} was not present`}
                    onChange={(input) => patchRow(row.userId, { reason: input.target.value })}
                  />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
      <div className="reports-card-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : event ? 'Save event' : 'Add event'}
        </button>
      </div>
    </form>
  )
}
