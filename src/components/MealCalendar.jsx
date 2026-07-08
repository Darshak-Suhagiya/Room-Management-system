import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateId } from '../utils/mealDateUtils'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function startOfMonth(year, month) {
  return new Date(year, month, 1)
}

function monthFromDateId(dateId, fallbackId) {
  const base = dateId || fallbackId
  if (!base) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }
  const [y, m] = base.split('-').map(Number)
  return { year: y, month: m - 1 }
}

/**
 * Month-grid day picker. Marks planned dates, highlights today + selected.
 * Only planned dates are selectable (unless allowAllDates).
 */
export function MealCalendar({
  plannedDates,
  selectedDate,
  today,
  onSelect,
  allowAllDates = false,
  dateStatus,
}) {
  const [view, setView] = useState(() => monthFromDateId(selectedDate, today))

  // Keep the visible month on the selected/current day (including async defaults)
  useEffect(() => {
    setView(monthFromDateId(selectedDate, today))
  }, [selectedDate, today])

  const monthLabel = useMemo(
    () =>
      startOfMonth(view.year, view.month).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [view],
  )

  const cells = useMemo(() => {
    const first = startOfMonth(view.year, view.month)
    const leadBlanks = first.getDay()
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
    const out = []
    for (let i = 0; i < leadBlanks; i += 1) out.push(null)
    for (let d = 1; d <= daysInMonth; d += 1) {
      out.push(new Date(view.year, view.month, d))
    }
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [view])

  const goPrevMonth = () =>
    setView((v) =>
      v.month === 0
        ? { year: v.year - 1, month: 11 }
        : { year: v.year, month: v.month - 1 },
    )
  const goNextMonth = () =>
    setView((v) =>
      v.month === 11
        ? { year: v.year + 1, month: 0 }
        : { year: v.year, month: v.month + 1 },
    )

  return (
    <div className={`meal-calendar rail-card${allowAllDates ? ' allow-all' : ''}`}>
      <div className="cal-head">
        <span className="cal-title">{monthLabel}</span>
        <div className="cal-nav">
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={goPrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={goNextMonth}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="cal-weekdays">
        {WEEKDAYS.map((wd, i) => (
          <span key={`${wd}-${i}`} className="cal-weekday">
            {wd}
          </span>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((date, idx) => {
          if (!date) {
            return <span key={`blank-${idx}`} className="cal-cell is-blank" />
          }
          const id = formatDateId(date)
          const hasMenu = plannedDates.has(id)
          const selectable = allowAllDates || hasMenu
          const isSelected = id === selectedDate
          const isToday = id === today
          const cls = [
            'cal-cell',
            hasMenu ? 'has-menu' : 'is-empty',
            isSelected ? 'is-selected' : '',
            isToday ? 'is-today' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={id}
              type="button"
              className={cls}
              disabled={!selectable}
              onClick={() => selectable && onSelect(id)}
              aria-pressed={isSelected}
            >
              <span className="cal-cell-num">{date.getDate()}</span>
              {hasMenu && (
                <span
                  className={`cal-cell-dot${
                    dateStatus?.[id] ? ` cal-dot-${dateStatus[id]}` : ''
                  }`}
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>

      {dateStatus && (
        <div className="cal-legend">
          <span className="cal-legend-item">
            <span className="cal-cell-dot cal-dot-voted" aria-hidden />
            Voted
          </span>
          <span className="cal-legend-item">
            <span className="cal-cell-dot cal-dot-partial" aria-hidden />
            Partial
          </span>
          <span className="cal-legend-item">
            <span className="cal-cell-dot cal-dot-none" aria-hidden />
            Not voted
          </span>
        </div>
      )}
    </div>
  )
}
