import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { MealCalendar } from '../components/MealCalendar'
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

export function LeaveCalendarPage() {
  const { user, profile, canManageLeaves, isApproved } = useAuth()
  const [maharajs, setMaharajs] = useState([])
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [viewMonth, setViewMonth] = useState(currentMonthView)
  const [selectedDate, setSelectedDate] = useState(() => formatDateId(new Date()))
  const [personId, setPersonId] = useState('')
  const [period, setPeriod] = useState(LEAVE_PERIODS.FULL)
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState(false)

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
  }

  const canCreateOnDay = isApproved && dayLeaves.length === 0

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!selectedMaharaj || !user) return
    setSaving(true)
    setError('')
    try {
      await createLeave({
        personId: selectedMaharaj.id,
        personName: selectedMaharaj.displayName || selectedMaharaj.email || 'Maharaj',
        date: selectedDate,
        period,
        reason,
        recordedBy: user.uid,
        recordedByName: profile?.displayName || profile?.email || 'User',
      })
      setReason('')
      await loadLeaves()
    } catch (err) {
      setError(err.message || 'Could not save leave.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!canManageLeaves || !selectedMaharaj || !user) return
    setSaving(true)
    setError('')
    try {
      await updateLeave({
        personId: selectedMaharaj.id,
        personName: selectedMaharaj.displayName || selectedMaharaj.email || 'Maharaj',
        date: selectedDate,
        period,
        reason,
        updatedBy: user.uid,
        existingLeaves: dayLeaves.filter((l) => l.personId === selectedMaharaj.id),
      })
      setEditing(false)
      await loadLeaves()
    } catch (err) {
      setError(err.message || 'Could not update leave.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDay = async () => {
    if (!canManageLeaves || !selectedMaharaj) return
    if (!window.confirm('Delete all leave entries for this day?')) return
    setSaving(true)
    setError('')
    try {
      await deleteLeavesForPersonDate(selectedMaharaj.id, selectedDate)
      setEditing(false)
      setReason('')
      await loadLeaves()
    } catch (err) {
      setError(err.message || 'Could not delete leave.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOne = async (docId) => {
    if (!canManageLeaves) return
    if (!window.confirm('Delete this leave entry?')) return
    setSaving(true)
    setError('')
    try {
      await deleteLeave(docId)
      setEditing(false)
      await loadLeaves()
    } catch (err) {
      setError(err.message || 'Could not delete leave.')
    } finally {
      setSaving(false)
    }
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

  return (
    <div className="page leave-calendar-page">
      <header className="page-header page-header-icon">
        <span className="page-header-icon-wrap" aria-hidden>
          <CalendarOff size={22} />
        </span>
        <div>
          <h2>Leave calendar</h2>
          <p>Maharaj leave schedule — morning, evening, or full day.</p>
        </div>
      </header>

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
              legend={
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
              }
            />
            {loading && <p className="muted leave-loading">Loading leave…</p>}
          </div>

          <aside className="leave-day-panel rail-card">
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
                Only an admin, kitchen leader, or room leader can change or
                delete leave.
              </p>
            )}

            {canCreateOnDay && (
              <form className="leave-form" onSubmit={handleCreate}>
                <p className="leave-form-title">Record leave</p>
                <fieldset className="leave-period-fieldset">
                  <legend>Period</legend>
                  {Object.values(LEAVE_PERIODS).map((p) => (
                    <label key={p} className="leave-period-option">
                      <input
                        type="radio"
                        name="period"
                        value={p}
                        checked={period === p}
                        onChange={() => setPeriod(p)}
                      />
                      {LEAVE_PERIOD_LABELS[p]}
                    </label>
                  ))}
                </fieldset>
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
                <fieldset className="leave-period-fieldset">
                  <legend>Period</legend>
                  {Object.values(LEAVE_PERIODS).map((p) => (
                    <label key={p} className="leave-period-option">
                      <input
                        type="radio"
                        name="period-manage"
                        value={p}
                        checked={period === p}
                        onChange={() => setPeriod(p)}
                      />
                      {LEAVE_PERIOD_LABELS[p]}
                    </label>
                  ))}
                </fieldset>
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
        </div>
      )}
    </div>
  )
}
