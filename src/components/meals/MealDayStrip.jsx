import { useEffect, useRef } from 'react'
import { CalendarDays } from 'lucide-react'
import { formatDisplayDateGu } from '../../utils/mealDateUtils'

function parseDateId(dateId) {
  const [y, m, d] = dateId.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function chipLabel(dateId) {
  const date = parseDateId(dateId)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const day = date.getDate()
  return { weekday, day }
}

/**
 * Horizontal scrollable date chips for mobile My Meals.
 * Shows today + future planned dates; optional calendar opens full month picker.
 */
export function MealDayStrip({
  plannedDateIds = [],
  selectedDate,
  today,
  dateStatus = {},
  onSelect,
  onOpenCalendar,
}) {
  const stripRef = useRef(null)
  const chipRefs = useRef({})

  useEffect(() => {
    if (!selectedDate) return
    const el = chipRefs.current[selectedDate]
    if (el) {
      el.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedDate, plannedDateIds.length])

  if (plannedDateIds.length === 0) {
    return (
      <div className="meal-day-strip-wrap">
        <button
          type="button"
          className="meal-day-chip meal-day-chip-today-only is-selected"
          aria-pressed
        >
          <span className="meal-day-chip-weekday-row">
            <span className="meal-day-chip-weekday">
              {parseDateId(today).toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
            <span className="meal-day-chip-today-pill">Today</span>
          </span>
          <span className="meal-day-chip-day">{parseDateId(today).getDate()}</span>
          <span className="meal-day-chip-dot-row" aria-hidden />
        </button>
        {onOpenCalendar && (
          <button
            type="button"
            className="meal-day-calendar-btn"
            onClick={onOpenCalendar}
            aria-label="Open calendar"
          >
            <CalendarDays size={18} />
            <span>Calendar</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="meal-day-strip-wrap">
      <div
        ref={stripRef}
        className="meal-day-strip"
        role="tablist"
        aria-label="Planned meal dates"
      >
        {plannedDateIds.map((dateId) => {
          const isSelected = dateId === selectedDate
          const isToday = dateId === today
          const status = dateStatus[dateId]
          const { weekday, day } = chipLabel(dateId)

          return (
            <button
              key={dateId}
              ref={(node) => {
                if (node) chipRefs.current[dateId] = node
              }}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={`${formatDisplayDateGu(dateId)}${isToday ? ', today' : ''}${status ? `, ${status}` : ''}`}
              className={[
                'meal-day-chip',
                isSelected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(dateId)}
            >
              <span className="meal-day-chip-weekday-row">
                <span className="meal-day-chip-weekday">{weekday}</span>
                {isToday && (
                  <span className="meal-day-chip-today-pill">Today</span>
                )}
              </span>
              <span className="meal-day-chip-day">{day}</span>
              <span className="meal-day-chip-dot-row" aria-hidden>
                {status ? (
                  <span className={`meal-day-chip-dot cal-dot-${status}`} />
                ) : (
                  <span className="meal-day-chip-dot is-empty" />
                )}
              </span>
            </button>
          )
        })}
      </div>
      {onOpenCalendar && (
        <button
          type="button"
          className="meal-day-calendar-btn"
          onClick={onOpenCalendar}
          aria-label="Open calendar"
        >
          <CalendarDays size={18} />
          <span>Calendar</span>
        </button>
      )}
    </div>
  )
}
