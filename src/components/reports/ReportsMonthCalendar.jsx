import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateId } from '../../utils/mealDateUtils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOT_ORDER = ['filled', 'empty', 'no', 'away']

export function ReportsMonthCalendar({
  year,
  month,
  onPrev,
  onNext,
  selectedDate,
  today,
  onSelect,
  dotsByDate,
}) {
  const monthLabel = useMemo(
    () =>
      new Date(year, month, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [year, month],
  )

  const cells = useMemo(() => {
    const lead = new Date(year, month, 1).getDay()
    const days = new Date(year, month + 1, 0).getDate()
    const count = lead + days
    const total = count + ((7 - (count % 7)) % 7)
    const start = new Date(year, month, 1 - lead)
    const out = []
    for (let i = 0; i < total; i += 1) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      out.push({
        dateId: formatDateId(date),
        outside: date.getMonth() !== month,
      })
    }
    return out
  }, [year, month])

  return (
    <div className="reports-cal rail-card">
      <div className="reports-cal-head">
        <button type="button" className="btn btn-icon btn-ghost" onClick={onPrev} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <span className="reports-cal-title">{monthLabel}</span>
        <button type="button" className="btn btn-icon btn-ghost" onClick={onNext} aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="reports-cal-weekdays">
        {WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="reports-cal-grid">
        {cells.map((cell) => {
          const dots = (dotsByDate[cell.dateId] || [])
            .slice()
            .sort((a, b) => DOT_ORDER.indexOf(a) - DOT_ORDER.indexOf(b))
            .slice(0, 4)
          const selected = cell.dateId === selectedDate
          const isToday = cell.dateId === today
          return (
            <button
              key={cell.dateId}
              type="button"
              className={`reports-cal-cell${selected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}${cell.outside ? ' is-outside' : ''}`}
              onClick={() => onSelect(cell.dateId)}
            >
              <span>{Number(cell.dateId.slice(8))}</span>
              <span className="reports-cal-dots" aria-hidden>
                {dots.map((kind) => (
                  <i key={kind} className={`reports-cal-dot is-${kind}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
      <div className="reports-cal-legend">
        <span><i className="reports-cal-dot is-filled" /> Filled</span>
        <span><i className="reports-cal-dot is-empty" /> Not filled</span>
        <span><i className="reports-cal-dot is-no" /> No</span>
        <span><i className="reports-cal-dot is-away" /> Out of city</span>
      </div>
    </div>
  )
}
