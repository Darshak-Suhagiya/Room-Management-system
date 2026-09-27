import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDaysToDateId } from '../../utils/menuReviewUtils'
import { formatDateId } from '../../utils/mealDateUtils'
import { formatReportDate } from '../../utils/reportAttendance'

export function ReportDateBar({ dateId, onChange }) {
  const today = formatDateId(new Date())

  return (
    <div className="reports-date-bar">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-label="Previous day"
        onClick={() => onChange(addDaysToDateId(dateId, -1))}
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <label className="reports-date-field">
        <input
          type="date"
          className="app-input"
          aria-label="Report date"
          value={dateId}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value)
          }}
        />
      </label>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-label="Next day"
        onClick={() => onChange(addDaysToDateId(dateId, 1))}
      >
        <ChevronRight size={18} aria-hidden />
      </button>
      {dateId !== today && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onChange(today)}
        >
          Today
        </button>
      )}
      <p className="reports-date-label">{formatReportDate(dateId)}</p>
    </div>
  )
}
