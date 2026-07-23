import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, CalendarOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { MealCalendar } from '../components/MealCalendar'
import { MealCalendarSheet } from '../components/meals/MealCalendarSheet'
import { MobileDayStrip, MobilePageHeader, MobilePageSkeleton } from '../components/mobile'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { useSaveMutation } from '../hooks/useSaveMutation'
import {
  LEAVE_PERIOD_LABELS,
  LEAVE_PERIODS,
} from '../config/constants'
import { listMaharajUsers } from '../services/userService'
import {
  createLeave,
  deleteLeave,
  deleteLeavesForPersonDate,
  listLeavesForMonth,
  summarizeLeaves,
  updateLeave,
} from '../services/leaveService'
import { formatDateId } from '../utils/mealDateUtils'

function currentMonthView() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

function periodStatusForDay(leaves) {
  if (!leaves?.length) return null
  if (leaves.some((l) => l.period === LEAVE_PERIODS.FULL)) return 'full'
  const hasMorning = leaves.some((l) => l.period === LEAVE_PERIODS.MORNING)
  const hasEvening = leaves.some((l) => l.period === LEAVE_PERIODS.EVENING)
  if (hasMorning && hasEvening) return 'full'
  if (hasMorning) return 'morning'
  if (hasEvening) return 'evening'
  return null
}

function LeavePeriodOptions({ period, setPeriod, name, isMobile }) {
  if (isMobile) {
    return (
      <div className="mobile-segmented" role="group" aria-label="Period">
        {Object.values(LEAVE_PERIODS).map((p) => (
          <button
            key={p}
            type="button"
            className={`mobile-segmented-btn${period === p ? ' is-active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {LEAVE_PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
    )
  }

  return (
    <fieldset className="leave-period-fieldset">
      <legend>Period</legend>
      {Object.values(LEAVE_PERIODS).map((p) => (
        <label key={p} className="leave-period-option">
          <input
            type="radio"
            name={name}
            value={p}
            checked={period === p}
            onChange={() => setPeriod(p)}
          />
          {LEAVE_PERIOD_LABELS[p]}
        </label>
      ))}
    </fieldset>
  )
}

function LeaveDayPanel({
  selectedLabel,
  maharajs,
  personId,
  setPersonId,
  setEditing,
  dayLeaves,
  canManageLeaves,
  saving,
  canCreateOnDay,
  period,
  setPeriod,
  reason,
  setReason,
  editing,
  handleCreate,
  handleUpdate,
  handleDeleteDay,
  handleDeleteOne,
  isMobile = false,
  className = '',
}) {
  return (
    <aside className={`leave-day-panel rail-card ${className}`.trim()}>
      <h3 className="rail-card-title">{selectedLabel}</h3>

      {maharajs.length > 1 && (
        <label className="field-stack">
          <span className="field-stack-label">Maharaj</span>
          <select
            value={personId}
            onChange={(e) => {
              setPersonId(e.target.value)
              setEditing(false)
            }}
          >
            {maharajs.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName || m.email}
              </option>
            ))}
          </select>
        </label>
      )}

      {dayLeaves.length > 0 && (
        <ul className="leave-entry-list">
          {dayLeaves.map((leave) => (
            <li key={leave.id} className="leave-entry-item">
              <div className="leave-entry-head">
                <span className={`leave-period-badge leave-period-${leave.period}`}>
                  {LEAVE_PERIOD_LABELS[leave.period] ?? leave.period}
                </span>
                {leave.personName && maharajs.length > 1 && (
                  <span className="leave-entry-person">{leave.personName}</span>
                )}
              </div>
              <p className="leave-entry-reason">{leave.reason}</p>
              <p className="leave-entry-meta muted">
                Recorded by {leave.recordedByName || 'Unknown'}
              </p>
              {canManageLeaves && (
                <div className="leave-entry-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={saving}
                    onClick={() => {
                      setPersonId(leave.personId)
                      setPeriod(leave.period)
                      setReason(leave.reason ?? '')
                      setEditing(true)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={saving}
                    onClick={() => handleDeleteOne(leave.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {dayLeaves.length > 0 && !canManageLeaves && (
        <p className="muted leave-readonly-hint">
          Only an admin, kitchen leader, or room leader can change or delete leave.
        </p>
      )}

      {canCreateOnDay && (
        <form className="leave-form" onSubmit={handleCreate}>
          <p className="leave-form-title">Record leave</p>
          <LeavePeriodOptions
            period={period}
            setPeriod={setPeriod}
            name="period"
            isMobile={isMobile}
          />
          <label className="field-stack">
            <span className="field-stack-label">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Why is Maharaj on leave?"
            />
          </label>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !reason.trim()}
          >
            {saving ? 'Saving…' : 'Save leave'}
          </button>
        </form>
      )}

      {canManageLeaves && editing && (
        <form className="leave-form" onSubmit={handleUpdate}>
          <p className="leave-form-title">Update leave</p>
          <LeavePeriodOptions
            period={period}
            setPeriod={setPeriod}
            name="period-manage"
            isMobile={isMobile}
          />
          <label className="field-stack">
            <span className="field-stack-label">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Why is Maharaj on leave?"
            />
          </label>
          <div className="leave-form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !reason.trim()}
            >
              {saving ? 'Saving…' : 'Update'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={handleDeleteDay}
            >
              Delete day
            </button>
          </div>
        </form>
      )}
    </aside>
  )
}

function renderLeaveDayChip(item) {
  const date = new Date(`${item.id}T12:00:00`)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const day = date.getDate()

  return (
    <>
      <span className="leave-day-chip-weekday">{weekday}</span>
      <span className="leave-day-chip-day">{day}</span>
      {item.status ? (
        <span className={`leave-day-chip-dot cal-dot-${item.status}`} aria-hidden />
      ) : null}
    </>
  )
}

export function LeaveCalendarPage() {
  const { user, profile, canManageLeaves, isApproved } = useAuth()
  const [maharajs, setMaharajs] = useState([])
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const { busy: saving, run: runSave } = useSaveMutation()
  const [error, setError] = useState('')
  const [viewMonth, setViewMonth] = useState(currentMonthView)
  const [selectedDate, setSelectedDate] = useState(() => formatDateId(new Date()))
  const [personId, setPersonId] = useState('')
  const [period, setPeriod] = useState(LEAVE_PERIODS.FULL)
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState(false)
  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false)
  const initialLoadDone = useRef(false)

  const today = formatDateId(new Date())

  const loadMaharajs = useCallback(async () => {
    try {
      const list = await listMaharajUsers()
      setMaharajs(list)
      setPersonId((prev) => prev || list[0]?.id || '')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not load Maharaj profiles.')
    }
  }, [])

  const loadLeaves = useCallback(async () => {
    if (maharajs.length === 0) {
      setLeaves([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const rows = await listLeavesForMonth(
        maharajs.map((m) => m.id),
        viewMonth.year,
        viewMonth.month,
      )
      setLeaves(rows)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not load leave entries.')
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }, [maharajs, viewMonth.year, viewMonth.month])

  useEffect(() => {
    loadMaharajs()
  }, [loadMaharajs])

  useEffect(() => {
    loadLeaves()
  }, [loadLeaves])

  const leavesByDate = useMemo(() => {
    const map = {}
    for (const leave of leaves) {
      if (!map[leave.date]) map[leave.date] = []
      map[leave.date].push(leave)
    }
    return map
  }, [leaves])

  const plannedDates = useMemo(
    () => new Set(Object.keys(leavesByDate)),
    [leavesByDate],
  )

  const dateStatus = useMemo(() => {
    const status = {}
    for (const [dateId, dayLeaves] of Object.entries(leavesByDate)) {
      status[dateId] = periodStatusForDay(dayLeaves)
    }
    return status
  }, [leavesByDate])

  const summary = useMemo(() => summarizeLeaves(leaves), [leaves])

  const monthDayItems = useMemo(() => {
    const { year, month } = viewMonth
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const items = []
    for (let d = 1; d <= daysInMonth; d += 1) {
      const dateId = formatDateId(new Date(year, month, d))
      items.push({
        id: dateId,
        isToday: dateId === today,
        status: dateStatus[dateId] ?? null,
      })
    }
    return items
  }, [viewMonth, today, dateStatus])

  const dayLeaves = useMemo(() => {
    const all = leavesByDate[selectedDate] ?? []
    if (!personId || maharajs.length <= 1) return all
    return all.filter((l) => l.personId === personId)
  }, [leavesByDate, selectedDate, personId, maharajs.length])

  const selectedMaharaj =
    maharajs.find((m) => m.id === personId) ?? maharajs[0] ?? null

  useEffect(() => {
    if (editing) return
    if (dayLeaves.length > 0) {
      setPeriod(dayLeaves[0].period)
      setReason(dayLeaves[0].reason ?? '')
    } else {
      setPeriod(LEAVE_PERIODS.FULL)
      setReason('')
    }
  }, [selectedDate, leaves, editing, personId])

  const handleViewMonthChange = (next) => {
    setViewMonth(next)
    setEditing(false)
  }

  const handleSelectDate = (dateId) => {
    setSelectedDate(dateId)
    setEditing(false)
    const [y, m] = dateId.split('-').map(Number)
    if (y !== viewMonth.year || m - 1 !== viewMonth.month) {
      setViewMonth({ year: y, month: m - 1 })
    }
  }

  const canCreateOnDay = isApproved && dayLeaves.length === 0

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!selectedMaharaj || !user) return
    setError('')
    const { ok, error: err, stale } = await runSave(() =>
      createLeave({
        personId: selectedMaharaj.id,
        personName: selectedMaharaj.displayName || selectedMaharaj.email || 'Maharaj',
        date: selectedDate,
        period,
        reason,
        recordedBy: user.uid,
        recordedByName: profile?.displayName || profile?.email || 'User',
      }),
    )
    if (!ok) {
      if (!stale) setError(err.message || 'Could not save leave.')
      return
    }
    if (stale) return
    setReason('')
    await loadLeaves()
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!canManageLeaves || !selectedMaharaj || !user) return
    setError('')
    const { ok, error: err, stale } = await runSave(() =>
      updateLeave({
        personId: selectedMaharaj.id,
        personName: selectedMaharaj.displayName || selectedMaharaj.email || 'Maharaj',
        date: selectedDate,
        period,
        reason,
        updatedBy: user.uid,
        existingLeaves: dayLeaves.filter((l) => l.personId === selectedMaharaj.id),
      }),
    )
    if (!ok) {
      if (!stale) setError(err.message || 'Could not update leave.')
      return
    }
    if (stale) return
    setEditing(false)
    await loadLeaves()
  }

  const handleDeleteDay = async () => {
    if (!canManageLeaves || !selectedMaharaj) return
    if (!window.confirm('Delete all leave entries for this day?')) return
    setError('')
    const { ok, error: err, stale } = await runSave(() =>
      deleteLeavesForPersonDate(selectedMaharaj.id, selectedDate),
    )
    if (!ok) {
      if (!stale) setError(err.message || 'Could not delete leave.')
      return
    }
    if (stale) return
    setEditing(false)
    setReason('')
    await loadLeaves()
  }

  const handleDeleteOne = async (docId) => {
    if (!canManageLeaves) return
    if (!window.confirm('Delete this leave entry?')) return
    setError('')
    const { ok, error: err, stale } = await runSave(() => deleteLeave(docId))
    if (!ok) {
      if (!stale) setError(err.message || 'Could not delete leave.')
      return
    }
    if (stale) return
    setEditing(false)
    await loadLeaves()
  }

  const selectedLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  const leaveDaysLabel =
    Number.isInteger(summary.leaveDays)
      ? String(summary.leaveDays)
      : summary.leaveDays.toFixed(1)

  const leaveStats = (
    <div className="leave-stats" aria-live="polite">
      <div className="leave-stat-card">
        <span className="leave-stat-value">{leaveDaysLabel}</span>
        <span className="leave-stat-label">Leave days this month</span>
      </div>
      <div className="leave-stat-card">
        <span className="leave-stat-value">{summary.entries}</span>
        <span className="leave-stat-label">Entries</span>
      </div>
      <div className="leave-stat-card leave-stat-breakdown">
        <span className="leave-stat-label">Breakdown</span>
        <span className="leave-stat-meta">
          Full {summary.full} · Morning {summary.morning} · Evening{' '}
          {summary.evening}
        </span>
      </div>
    </div>
  )

  const calendarLegend = (
    <div className="cal-legend">
      <span className="cal-legend-item">
        <span className="cal-cell-dot cal-dot-full" aria-hidden />
        Full day
      </span>
      <span className="cal-legend-item">
        <span className="cal-cell-dot cal-dot-morning" aria-hidden />
        Morning
      </span>
      <span className="cal-legend-item">
        <span className="cal-cell-dot cal-dot-evening" aria-hidden />
        Evening
      </span>
    </div>
  )

  const dayPanelProps = {
    selectedLabel,
    maharajs,
    personId,
    setPersonId,
    setEditing,
    dayLeaves,
    canManageLeaves,
    saving,
    canCreateOnDay,
    period,
    setPeriod,
    reason,
    setReason,
    editing,
    handleCreate,
    handleUpdate,
    handleDeleteDay,
    handleDeleteOne,
  }

  const showInitialLoad = loading && !initialLoadDone.current
  const showLoadSkeleton = useDelayedLoading(showInitialLoad)
  if (showInitialLoad && showLoadSkeleton) {
    return <MobilePageSkeleton />
  }
  if (showInitialLoad) {
    return null
  }

  return (
    <div className="page leave-calendar-page">
      <div className="layout-desktop">
        <header className="page-header page-header-icon">
          <span className="page-header-icon-wrap" aria-hidden>
            <CalendarOff size={22} />
          </span>
          <div>
            <h2>Leave calendar</h2>
            <p>Maharaj leave schedule — morning, evening, or full day.</p>
          </div>
        </header>

        {leaveStats}

        {error && <p className="form-error">{error}</p>}

        {maharajs.length === 0 && !loading ? (
          <p className="muted">No approved Maharaj profile found.</p>
        ) : (
          <div className="leave-dashboard">
            <div className="leave-calendar-col">
              <MealCalendar
                plannedDates={plannedDates}
                selectedDate={selectedDate}
                today={today}
                onSelect={handleSelectDate}
                allowAllDates
                dateStatus={dateStatus}
                viewMonth={viewMonth}
                onViewMonthChange={handleViewMonthChange}
                showDotWhenEmpty
                legend={calendarLegend}
              />
              {loading && <p className="muted leave-loading">Loading leave…</p>}
            </div>

            <LeaveDayPanel {...dayPanelProps} />
          </div>
        )}
      </div>

      <div className="layout-mobile leave-mobile mobile-section-gap">
        <MobilePageHeader
          icon={CalendarOff}
          title="Leave calendar"
          description="Maharaj leave — morning, evening, or full day."
        />

        {leaveStats}

        {error && <p className="form-error">{error}</p>}

        {maharajs.length === 0 && !loading ? (
          <p className="muted">No approved Maharaj profile found.</p>
        ) : (
          <>
            <MobileDayStrip
              items={monthDayItems}
              selectedId={selectedDate}
              onSelect={handleSelectDate}
              ariaLabel="Days in month"
              renderChip={renderLeaveDayChip}
              trailing={
                <button
                  type="button"
                  className="meal-day-calendar-btn"
                  onClick={() => setCalendarSheetOpen(true)}
                  aria-label="Open calendar"
                >
                  <CalendarDays size={18} />
                  <span>Calendar</span>
                </button>
              }
            />

            {loading && <p className="muted leave-loading">Loading leave…</p>}

            <LeaveDayPanel
              {...dayPanelProps}
              isMobile
              className="leave-day-panel-mobile"
            />

            <MealCalendarSheet
              open={calendarSheetOpen}
              onClose={() => setCalendarSheetOpen(false)}
              plannedDates={plannedDates}
              selectedDate={selectedDate}
              today={today}
              onSelect={handleSelectDate}
              allowAllDates
              dateStatus={dateStatus}
              viewMonth={viewMonth}
              onViewMonthChange={handleViewMonthChange}
              showDotWhenEmpty
              legend={calendarLegend}
            />
          </>
        )}
      </div>
    </div>
  )
}
