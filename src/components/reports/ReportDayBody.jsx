import { Plus } from 'lucide-react'
import { AdminEmptyPanel } from '../admin/mobile'
import {
  attendanceCounts,
  countLine,
  formatLoggedAt,
  formatReportTime,
  groupNotesByPerson,
  loggedByName,
  splitAttendance,
} from '../../utils/reportAttendance'

function EventCard({ event, roster, onEdit, onDelete }) {
  const counts = attendanceCounts(splitAttendance(event.attendance, roster))
  return (
    <article className="rail-card reports-card">
      <h3>{event.title}</h3>
      <p className="reports-card-meta">
        {formatReportTime(event.time) || event.time}
        {' · '}
        Logged by {loggedByName(event)}
        {formatLoggedAt(event.updatedAt || event.createdAt)
          ? ` · ${formatLoggedAt(event.updatedAt || event.createdAt)}`
          : ''}
      </p>
      <p className="reports-count-line">{countLine(counts)}</p>
      {event.note ? <p className="reports-card-note">{event.note}</p> : null}
      <div className="reports-card-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(event)}>
          Edit
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(event)}>
          Delete
        </button>
      </div>
    </article>
  )
}

function NoteGroup({ group, onEdit, onDelete }) {
  return (
    <article className="rail-card reports-card">
      <h3 className="reports-note-title">{group.displayName}</h3>
      <ul className="reports-note-list">
        {group.notes.map((note) => (
          <li key={note.id} className="reports-note-item">
            <p className="reports-note-text">{note.text}</p>
            <p className="reports-note-meta">
              Logged by {loggedByName(note)}
              {formatLoggedAt(note.updatedAt || note.createdAt)
                ? ` · ${formatLoggedAt(note.updatedAt || note.createdAt)}`
                : ''}
            </p>
            <div className="reports-card-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onEdit(note)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => onDelete(note)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </article>
  )
}

export function ReportDayBody({
  events,
  notes,
  roster,
  dayLoading,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onAddNote,
  onEditNote,
  onDeleteNote,
}) {
  const noteGroups = groupNotesByPerson(notes)

  return (
    <div className={dayLoading ? 'reports-columns-wrap is-loading' : 'reports-columns-wrap'}>
      <section>
        <div className="reports-section-head">
          <h3>Events</h3>
          <button type="button" className="btn btn-primary btn-sm" onClick={onAddEvent}>
            <Plus size={16} aria-hidden />
            Event
          </button>
        </div>
        {dayLoading && events.length === 0 ? (
          <p className="muted">Loading this day…</p>
        ) : null}
        {!dayLoading && events.length === 0 ? (
          <AdminEmptyPanel
            title="No events this day"
            hint="Log who was present (with time) or not present (optional reason)."
          />
        ) : null}
        {events.length > 0 ? (
          <div className="reports-stack">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                roster={roster}
                onEdit={onEditEvent}
                onDelete={onDeleteEvent}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <div className="reports-section-head">
          <h3>Person notes</h3>
          <button type="button" className="btn btn-primary btn-sm" onClick={onAddNote}>
            <Plus size={16} aria-hidden />
            Note
          </button>
        </div>
        {dayLoading && notes.length === 0 ? (
          <p className="muted">Loading this day…</p>
        ) : null}
        {!dayLoading && notes.length === 0 ? (
          <AdminEmptyPanel
            title="No notes this day"
            hint="Select one person and write what should be remembered."
          />
        ) : null}
        {notes.length > 0 ? (
          <div className="reports-stack">
            {noteGroups.map((group) => (
              <NoteGroup
                key={group.userId}
                group={group}
                onEdit={onEditNote}
                onDelete={onDeleteNote}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
