import { REPORT_EVENT_TYPE_LABELS } from '../../config/constants'
import { formatReportDate } from '../../utils/reportAttendance'

const VISIBLE = 8

export function OverdueMealReportsNotice({ items, graceDays, onFill }) {
  if (!items?.length) return null
  const shown = items.slice(0, VISIBLE)
  const more = items.length - shown.length
  const dayLabel = graceDays === 1 ? '1 દિવસ' : `${graceDays} દિવસ`

  return (
    <section className="missing-reports is-blocking" aria-label="Overdue reports">
      <h3>પહેલા જૂના રિપોર્ટ ભરો</h3>
      <p>
        છેલ્લા {dayLabel} છોડીને, તે પહેલાંના બાકી રિપોર્ટ ભર્યા વગર ભોજનનો જવાબ આપી શકાશે નહીં.
      </p>
      <p className="muted">
        The last {graceDays === 1 ? 'day' : `${graceDays} days`} can wait. Fill older reports to vote on meals.
      </p>
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
      {more > 0 ? <p className="muted">{more} more overdue</p> : null}
    </section>
  )
}
