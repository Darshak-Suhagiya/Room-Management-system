import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { formatDateId } from '../../utils/mealDateUtils'
import { addDaysToDateId } from '../../utils/menuReviewUtils'
import {
  defaultAnalyticsRange,
  MAX_ANALYTICS_RANGE_DAYS,
  rangeLabel,
  rangeSpanDays,
} from './reportsAnalyticsShared'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function normalizedDraft(from, to) {
  if (!from) return { from: '', to: '' }
  if (!to) return { from, to: '' }
  if (to < from) return { from: to, to: from }
  return { from, to }
}

function cellRangeClass(dateId, from, to) {
  const { from: start, to: end } = normalizedDraft(from, to)
  if (!start) return ''
  if (!end) {
    return dateId === start ? ' is-pending' : ''
  }
  if (dateId < start || dateId > end) return ''
  const classes = [' is-in-range']
  if (dateId === start) classes.push(' is-range-start')
  if (dateId === end) classes.push(' is-range-end')
  return classes.join('')
}

export function AnalyticsRangePicker({ open, onClose, value, onApply, today }) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDraftFrom(value?.from || '')
    setDraftTo(value?.to || '')
    setError('')
    const anchor = value?.from || today
    const [y, m] = anchor.split('-').map(Number)
    setYear(y)
    setMonth(m - 1)
  }, [open, value?.from, value?.to, today])

  const monthLabel = useMemo(
    () =>
      new Date(year, month, 1).toLocaleDateString('en-IN', {
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

  const draftSummary = useMemo(() => {
    const { from, to } = normalizedDraft(draftFrom, draftTo)
    if (!from) return 'Tap a start date, then an end date.'
    if (!to) return `${rangeLabel(from, from)} — choose end date`
    const span = rangeSpanDays(from, to)
    return `${rangeLabel(from, to)} · ${span} ${span === 1 ? 'day' : 'days'}`
  }, [draftFrom, draftTo])

  const presets = useMemo(() => {
    const thisWeek = defaultAnalyticsRange(today)
    return [
      { id: 'week', label: 'This week', ...thisWeek },
      { id: '7', label: 'Last 7 days', from: addDaysToDateId(today, -6), to: today },
      { id: '14', label: 'Last 14 days', from: addDaysToDateId(today, -13), to: today },
      { id: '30', label: 'Last 30 days', from: addDaysToDateId(today, -29), to: today },
    ]
  }, [today])

  const pickPreset = (preset) => {
    setDraftFrom(preset.from)
    setDraftTo(preset.to)
    setError('')
    const [y, m] = preset.from.split('-').map(Number)
    setYear(y)
    setMonth(m - 1)
  }

  const pickDay = (dateId) => {
    setError('')
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(dateId)
      setDraftTo('')
      return
    }
    let from = draftFrom
    let to = dateId
    if (to < from) {
      from = dateId
      to = draftFrom
    }
    setDraftFrom(from)
    setDraftTo(to)
  }

  const goPrevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const goNextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const submit = () => {
    const { from, to: rawTo } = normalizedDraft(draftFrom, draftTo)
    const to = rawTo || from
    if (!from) {
      setError('Select at least one date.')
      return
    }
    const span = rangeSpanDays(from, to)
    if (span > MAX_ANALYTICS_RANGE_DAYS) {
      setError(`Maximum range is ${MAX_ANALYTICS_RANGE_DAYS} days (${span} selected).`)
      return
    }
    onApply?.({ from, to })
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Date range"
      subtitle={draftSummary}
      wide
      artKey="reports"
      className="reports-sheet"
    >
      <div className="reports-analytics-range-picker">
        {error ? <p className="form-error">{error}</p> : null}
        <div className="reports-analytics-range-presets" role="group" aria-label="Quick ranges">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => pickPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="reports-cal reports-analytics-range-cal rail-card">
          <div className="reports-cal-head">
            <button type="button" className="btn btn-icon btn-ghost" onClick={goPrevMonth} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <span className="reports-cal-title">{monthLabel}</span>
            <button type="button" className="btn btn-icon btn-ghost" onClick={goNextMonth} aria-label="Next month">
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
              const isToday = cell.dateId === today
              const rangeClass = cellRangeClass(cell.dateId, draftFrom, draftTo)
              return (
                <button
                  key={cell.dateId}
                  type="button"
                  className={`reports-cal-cell${rangeClass}${isToday ? ' is-today' : ''}${cell.outside ? ' is-outside' : ''}`}
                  onClick={() => pickDay(cell.dateId)}
                >
                  <span>{Number(cell.dateId.slice(8))}</span>
                </button>
              )
            })}
          </div>
          <p className="muted reports-analytics-range-hint">
            Select up to {MAX_ANALYTICS_RANGE_DAYS} days.
          </p>
        </div>
        <div className="reports-card-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            Apply
          </button>
        </div>
      </div>
    </Modal>
  )
}
