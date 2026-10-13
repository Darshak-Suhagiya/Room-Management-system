import { Modal } from '../ui/Modal'
import {
  formatReportDate,
  personLabel,
} from '../../utils/reportAttendance'
import { REPORT_ANSWER_TYPE_LABELS } from '../../config/constants'
import { answerDetailFields, weekdayShort } from './reportsAnalyticsShared'

export function AnalyticsDayDetail({ open, row, onClose }) {
  if (!row) {
    return (
      <Modal open={open} onClose={onClose} title="Answer" artKey="reports" className="reports-sheet">
        <p className="muted">No answer on this day.</p>
      </Modal>
    )
  }

  const detail = answerDetailFields(row)
  const title = row.event?.title || 'Event'
  const when = `${weekdayShort(row.date)}, ${formatReportDate(row.date)}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={when}
      artKey="reports"
      className="reports-sheet"
    >
      <div className="reports-form reports-analytics-day-detail">
        <p className="reports-person-name">{personLabel(row.person)}</p>
        <p className="reports-card-meta">
          {REPORT_ANSWER_TYPE_LABELS[row.event?.answerType] || 'Attendance'}
        </p>
        <div className={`reports-analytics-day-status is-${row.tone || 'empty'}`}>
          <strong>{detail.status}</strong>
        </div>
        {detail.fields.length > 0 ? (
          <dl className="reports-analytics-day-fields">
            {detail.fields.map((field) => (
              <div key={field.label}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="muted">
            {row.filled ? 'No extra time, reason, or note on this answer.' : 'This date is not filled yet.'}
          </p>
        )}
        <div className="reports-card-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
