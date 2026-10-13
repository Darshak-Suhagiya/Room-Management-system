import { Modal } from '../ui/Modal'
import { REPORT_EVENT_TYPE, REPORT_EVENT_TYPE_LABELS } from '../../config/constants'
import {
  formatReportDate,
  formatWeekdaysLabel,
  groupNotesByPerson,
  loggedByName,
} from '../../utils/reportAttendance'

export function NotesLibrarySheet({
  open,
  notes,
  actorId,
  isAdmin,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}) {
  const groups = groupNotesByPerson(
    isAdmin ? notes : notes.filter((note) => note.createdBy === actorId),
  )
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Person notes"
      subtitle="Written by you. Private to you and people who can see everyone's records."
      artKey="reports"
      className="reports-sheet"
    >
      <div className="reports-form">
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          Add person note
        </button>
        {groups.length === 0 ? (
          <p className="muted">No notes yet.</p>
        ) : (
          groups.map((group) => (
            <article key={group.userId} className="rail-card reports-card">
              <h3>{group.displayName}</h3>
              <ul className="reports-note-list">
                {group.notes.map((note) => (
                  <li key={note.id} className="reports-note-item">
                    <p className="reports-note-text">{note.text}</p>
                    <p className="reports-note-meta">
                      {formatReportDate(note.date)}
                      {' · Written by '}
                      {loggedByName(note)}
                      {' · Private to you and people who can see everyone’s records'}
                    </p>
                    {isAdmin || note.createdBy === actorId ? (
                      <div className="reports-card-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(note)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onDelete(note)}>
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </div>
    </Modal>
  )
}

function onceDates(event) {
  return [...new Set(
    [event.startDate, event.date, ...(Array.isArray(event.dates) ? event.dates : [])]
      .filter(Boolean),
  )].sort()
}

function eventGroups(events) {
  const groups = []
  const onceByName = new Map()
  for (const event of events) {
    const type = event.type || REPORT_EVENT_TYPE.ONCE
    if (type !== REPORT_EVENT_TYPE.ONCE) {
      groups.push({
        key: event.id,
        title: event.title,
        type,
        events: [event],
        dates: [event.startDate],
      })
      continue
    }
    const name = event.title.trim().toLowerCase()
    if (!onceByName.has(name)) {
      const group = {
        key: name,
        title: event.title,
        type,
        events: [],
        dates: [],
      }
      onceByName.set(name, group)
      groups.push(group)
    }
    const group = onceByName.get(name)
    group.events.push(event)
    group.dates = [...new Set([...group.dates, ...onceDates(event)])].sort()
  }
  return groups
}

export function EventsLibrarySheet({ open, events, onClose, onAdd, onEdit, onDelete }) {
  const groups = eventGroups(events)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Events"
      subtitle="Reuse a once, weekly, or monthly name to add another date on top of it."
      artKey="reports"
      className="reports-sheet"
    >
      <div className="reports-form">
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          Add event
        </button>
        {groups.length === 0 ? (
          <p className="muted">No events yet.</p>
        ) : (
          groups.map((group) => {
            const primary = [...group.events].sort(
              (a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
            )[0]
            return (
              <article key={group.key} className="rail-card reports-card">
                <h3>{group.title}</h3>
                <p className="reports-card-meta">
                  {REPORT_EVENT_TYPE_LABELS[group.type] || 'Once'}
                  {group.type === REPORT_EVENT_TYPE.ONCE
                    ? ` · ${group.dates.map((date) => formatReportDate(date)).join(', ')}`
                    : ` · ${formatReportDate(primary.startDate)}${
                        primary.endDate && primary.endDate !== primary.startDate
                          ? ` – ${formatReportDate(primary.endDate)}`
                          : ''
                      }${
                        group.type === REPORT_EVENT_TYPE.WEEKLY && primary.weekdays?.length
                          ? ` · ${formatWeekdaysLabel(primary.weekdays)}`
                          : ''
                      }${
                        Array.isArray(primary.exceptionDates) && primary.exceptionDates.length
                          ? ` · ${primary.exceptionDates.length} cancelled day${
                              primary.exceptionDates.length === 1 ? '' : 's'
                            }`
                          : ''
                      }`}
                </p>
                <div className="reports-card-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(primary)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onDelete(primary)}>
                    Delete
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>
    </Modal>
  )
}
