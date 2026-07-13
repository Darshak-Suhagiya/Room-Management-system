export function SevaDayStrip({ weekDays, selectedDayId, todayId, onSelect }) {
  return (
    <div className="seva-day-strip" role="tablist" aria-label="Week days">
      {weekDays.map((day) => {
        const isSelected = day.id === selectedDayId
        const isToday = day.id === todayId
        return (
          <button
            key={day.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={[
              'seva-day-chip',
              isSelected ? 'is-selected' : '',
              isToday ? 'is-today' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(day.id)}
          >
            <span className="seva-day-chip-label">{day.label}</span>
            {isToday && <span className="seva-day-chip-badge">Today</span>}
          </button>
        )
      })}
    </div>
  )
}
