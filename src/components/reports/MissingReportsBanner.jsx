import { Link } from 'react-router-dom'
import { REPORT_EVENT_TYPE_LABELS } from '../../config/constants'
import { formatReportDate } from '../../utils/reportAttendance'
import './reports.css'

const VISIBLE = 8

export function MissingReportsBanner({ items, onFill }) {
  if (!items?.length) return null
  const ordered = [...items].sort((a, b) => b.date.localeCompare(a.date) || a.event.title.localeCompare(b.event.title))
  const shown = ordered.slice(0, VISIBLE)
  const more = items.length - shown.length

  return (
    <section className="missing-reports" aria-label="Missing reports">
      <h3>You are missing a report</h3>
      <ul className="missing-reports-list">
        {shown.map((item) => (
          <li key={`${item.event.id}-${item.date}`}>
            <div>
              <strong>{item.event.title}</strong>
              <span>
                {formatReportDate(item.date)}
                {' · '}
                {REPORT_EVENT_TYPE_LABELS[item.event.type] || 'Once'}
              </span>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onFill?.(item)}>
              Fill
            </button>
          </li>
        ))}
      </ul>
      {more > 0 ? (
        <Link className="missing-reports-more" to="/reports">
          {more} more in Reports
        </Link>
      ) : null}
    </section>
  )
}
