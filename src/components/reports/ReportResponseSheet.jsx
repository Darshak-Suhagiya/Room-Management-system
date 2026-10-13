import { Modal } from '../ui/Modal'
import { formatReportDate, formatReportTime } from '../../utils/reportAttendance'
import { InlineReportAnswer } from './InlineReportAnswer'

export function ReportResponseSheet({
  open,
  onClose,
  event,
  date,
  userId,
  displayName,
  answer,
  saving,
  readOnly = false,
  onSave,
  onClear,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event?.title || 'Report'}
      subtitle={date ? formatReportDate(date) : ''}
      busy={saving}
      artKey="reports"
      className="reports-sheet"
    >
      {open && event && date && userId ? (
        <div className="reports-form">
          <p className="reports-person-name">{displayName}</p>
          {event.note ? <p className="reports-card-note">{event.note}</p> : null}
          {formatReportTime(event.time) ? (
            <p className="reports-card-meta">Event time {formatReportTime(event.time)}</p>
          ) : null}
          {readOnly ? (
            <p className="muted">View only</p>
          ) : (
            <InlineReportAnswer
              key={`${event.id}-${date}-${userId}`}
              event={event}
              answer={answer}
              saving={saving}
              onSave={(patch) => onSave({
                eventId: event.id,
                date,
                userId,
                displayName,
                answerType: event.answerType,
                ...patch,
              })}
              onClear={() => onClear?.({ eventId: event.id, date, userId })}
            />
          )}
          <div className="reports-card-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
