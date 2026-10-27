import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { DEFAULT_MEAL_MODE } from '../../config/constants'
import { formatDateId, formatDisplayDateGu } from '../../utils/mealDateUtils'
import { addDaysToDateId } from '../../utils/menuReviewUtils'
import { triggerSelectionHaptic } from '../../utils/haptics'
import './defaults.css'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MAX_RANGE_DAYS = 92

function expandRange(from, to) {
  if (!from) return []
  const end = to || from
  const [start, last] = from <= end ? [from, end] : [end, from]
  const out = []
  let cursor = start
  while (cursor <= last && out.length <= MAX_RANGE_DAYS) {
    out.push(cursor)
    cursor = addDaysToDateId(cursor, 1)
  }
  return out
}

/**
 * Month calendar for "Eating / Not eating" overrides.
 * Pick several dates, or a date range, then apply Eating / Not eating / Clear.
 * `variant` only changes density: the desktop rail card or the mobile sheet.
 */
export function DefaultOverrideCalendar({
  overrides = {},
  plannedDates,
  today = formatDateId(new Date()),
  busy = false,
  variant = 'desktop',
  onApply,
}) {
  const [year, setYear] = useState(() => Number(today.slice(0, 4)))
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)) - 1)
  const [pickMode, setPickMode] = useState('dates')
  const [picked, setPicked] = useState(() => new Set())
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [error, setError] = useState('')

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

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
      out.push({ dateId: formatDateId(date), outside: date.getMonth() !== month })
    }
    return out
  }, [year, month])

  const rangeIds = useMemo(
    () => (pickMode === 'range' ? expandRange(rangeFrom, rangeTo) : []),
    [pickMode, rangeFrom, rangeTo],
  )
  const selectedIds = useMemo(() => {
    const raw = pickMode === 'dates' ? [...picked] : rangeIds
    return raw.filter((id) => id >= today).sort((a, b) => a.localeCompare(b))
  }, [pickMode, picked, rangeIds, today])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const upcomingOverrides = useMemo(
    () =>
      Object.entries(overrides)
        .filter(([dateId]) => dateId >= today)
        .sort(([a], [b]) => a.localeCompare(b)),
    [overrides, today],
  )

  const shiftMonth = (delta) => {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  const clearSelection = () => {
    setPicked(new Set())
    setRangeFrom('')
    setRangeTo('')
    setError('')
  }

  const changePickMode = (next) => {
    triggerSelectionHaptic()
    setPickMode(next)
    clearSelection()
  }

  const onCellClick = (dateId) => {
    if (dateId < today || busy) return
    triggerSelectionHaptic()
    setError('')
    if (pickMode === 'dates') {
      setPicked((prev) => {
        const next = new Set(prev)
        if (next.has(dateId)) next.delete(dateId)
        else next.add(dateId)
        return next
      })
      return
    }
    if (!rangeFrom || rangeTo) {
      setRangeFrom(dateId)
      setRangeTo('')
      return
    }
    if (dateId < rangeFrom) {
      setRangeTo(rangeFrom)
      setRangeFrom(dateId)
    } else {
      setRangeTo(dateId)
    }
    const span = expandRange(
      dateId < rangeFrom ? dateId : rangeFrom,
      dateId < rangeFrom ? rangeFrom : dateId,
    )
    if (span.length > MAX_RANGE_DAYS) {
      setError(`Pick at most ${MAX_RANGE_DAYS} days at a time.`)
    }
  }

  const apply = async (value) => {
    if (selectedIds.length === 0 || selectedIds.length > MAX_RANGE_DAYS) return
    triggerSelectionHaptic()
    try {
      await onApply?.(selectedIds, value)
      clearSelection()
    } catch {
      /* parent shows the error toast */
    }
  }

  const rangeFirst = rangeFrom && rangeTo ? (rangeFrom <= rangeTo ? rangeFrom : rangeTo) : rangeFrom
  const rangeLast = rangeFrom && rangeTo ? (rangeFrom <= rangeTo ? rangeTo : rangeFrom) : ''

  const summary =
    selectedIds.length === 0
      ? pickMode === 'range'
        ? rangeFrom && !rangeTo
          ? 'Now pick the last day'
          : 'Pick the first and last day'
        : 'Tap dates to select'
      : `${selectedIds.length} ${selectedIds.length === 1 ? 'date' : 'dates'} selected`

  return (
    <div className={`default-cal default-cal-${variant}`}>
      <div
        className="default-cal-mode mobile-segmented"
        role="group"
        aria-label="Selection mode"
      >
        <button
          type="button"
          className={`mobile-segmented-btn${pickMode === 'dates' ? ' is-active' : ''}`}
          aria-pressed={pickMode === 'dates'}
          onClick={() => changePickMode('dates')}
        >
          Pick dates
        </button>
        <button
          type="button"
          className={`mobile-segmented-btn${pickMode === 'range' ? ' is-active' : ''}`}
          aria-pressed={pickMode === 'range'}
          onClick={() => changePickMode('range')}
        >
          Date range
        </button>
      </div>

      <div className="default-cal-nav">
        <button
          type="button"
          className="default-cal-nav-btn"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="default-cal-month">{monthLabel}</span>
        <button
          type="button"
          className="default-cal-nav-btn"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="default-cal-weekdays" aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>

      <div className="default-cal-grid" role="grid">
        {cells.map(({ dateId, outside }) => {
          const past = dateId < today
          const override = overrides[dateId]
          const inRange =
            pickMode === 'range' && rangeFirst
              ? dateId >= rangeFirst && dateId <= (rangeLast || rangeFirst)
              : false
          const classes = [
            'default-cal-cell',
            outside ? 'is-outside' : '',
            past ? 'is-past' : '',
            dateId === today ? 'is-today' : '',
            plannedDates?.has(dateId) ? 'is-planned' : '',
            override === DEFAULT_MEAL_MODE.EATING ? 'is-eating' : '',
            override === DEFAULT_MEAL_MODE.NOT_EATING ? 'is-not-eating' : '',
            selectedSet.has(dateId) || inRange ? 'is-selected' : '',
            inRange && dateId === rangeFirst ? 'is-range-start' : '',
            inRange && dateId === (rangeLast || rangeFirst) ? 'is-range-end' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={dateId}
              type="button"
              role="gridcell"
              className={classes}
              disabled={past || busy}
              aria-label={`${formatDisplayDateGu(dateId)}${override ? `, ${override === DEFAULT_MEAL_MODE.EATING ? 'eating' : 'not eating'}` : ''}`}
              aria-pressed={selectedSet.has(dateId)}
              onClick={() => onCellClick(dateId)}
            >
              <span>{Number(dateId.slice(8))}</span>
            </button>
          )
        })}
      </div>

      <ul className="default-cal-legend" aria-label="Legend">
        <li>
          <span className="default-cal-swatch is-eating" /> Eating
        </li>
        <li>
          <span className="default-cal-swatch is-not-eating" /> Not eating
        </li>
        <li>
          <span className="default-cal-swatch is-default" /> Uses default
        </li>
      </ul>

      <p className="default-cal-summary" aria-live="polite">
        {summary}
      </p>
      {error && <p className="form-error">{error}</p>}

      <div className="default-cal-actions">
        <button
          type="button"
          className="btn btn-sm default-cal-btn is-eating"
          disabled={busy || selectedIds.length === 0 || Boolean(error)}
          onClick={() => apply(DEFAULT_MEAL_MODE.EATING)}
        >
          Eating
        </button>
        <button
          type="button"
          className="btn btn-sm default-cal-btn is-not-eating"
          disabled={busy || selectedIds.length === 0 || Boolean(error)}
          onClick={() => apply(DEFAULT_MEAL_MODE.NOT_EATING)}
        >
          Not eating
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy || selectedIds.length === 0 || Boolean(error)}
          onClick={() => apply(null)}
        >
          Use default
        </button>
      </div>

      {upcomingOverrides.length > 0 && (
        <div className="default-cal-list">
          <p className="default-cal-list-title">Your overrides</p>
          <ul>
            {upcomingOverrides.map(([dateId, mode]) => (
              <li key={dateId}>
                <span
                  className={`default-cal-list-dot ${mode === DEFAULT_MEAL_MODE.EATING ? 'is-eating' : 'is-not-eating'}`}
                  aria-hidden
                />
                <span className="default-cal-list-date">
                  {formatDisplayDateGu(dateId)}
                </span>
                <span className="default-cal-list-mode">
                  {mode === DEFAULT_MEAL_MODE.EATING ? 'Eating' : 'Not eating'}
                </span>
                <button
                  type="button"
                  className="default-cal-list-remove"
                  disabled={busy}
                  aria-label={`Remove override for ${formatDisplayDateGu(dateId)}`}
                  onClick={() => onApply?.([dateId], null)}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
