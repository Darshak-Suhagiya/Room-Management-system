import { useMemo, useState } from 'react'
import { Calendar, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { REPORT_EVENT_TYPE, REPORT_EVENT_TYPE_LABELS } from '../../config/constants'
import { formatDateId } from '../../utils/mealDateUtils'
import { addDaysToDateId } from '../../utils/menuReviewUtils'
import {
  answerDotKind,
  answerFor,
  cancelledOccurrenceDates,
  formatAnswerLabel,
  formatReportDate,
  formatReportTime,
  formatWeekdaysLabel,
  isRecurringReportEvent,
  normalizeReportEvent,
  occurrenceDates,
  personLabel,
} from '../../utils/reportAttendance'
import { ReportsMonthCalendar } from './ReportsMonthCalendar'
import { InlineReportAnswer } from './InlineReportAnswer'

function visibleBounds(year, month) {
  const lead = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const count = lead + days
  const trail = (7 - (count % 7)) % 7
  const start = new Date(year, month, 1 - lead)
  const end = new Date(year, month, days + trail)
  return { start: formatDateId(start), end: formatDateId(end) }
}

function answerSummary(answer) {
  if (!answer) return 'Not filled yet'
  return formatAnswerLabel(answer) || 'Not filled yet'
}

const DOT_ORDER = ['filled', 'empty', 'no', 'away']

function dotKind(answer) {
  return answerDotKind(answer)
}

function shiftMonth(year, month, delta) {
  const next = new Date(year, month + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

function eventWhen(event) {
  const time = formatReportTime(event.time)
  const type = REPORT_EVENT_TYPE_LABELS[event.type] || 'Once'
  const days = event.type === REPORT_EVENT_TYPE.WEEKLY && event.weekdays?.length
    ? formatWeekdaysLabel(event.weekdays)
    : ''
  const label = days ? `${type} · ${days}` : type
  return time ? `${time} · ${label}` : label
}

function StatusPill({ answer }) {
  const kind = dotKind(answer)
  if (kind === 'away') return <span className="reports-answer-pill is-away">Out of city</span>
  if (kind === 'no') return <span className="reports-answer-pill is-no">No</span>
  if (kind !== 'filled') return <span className="reports-answer-pill is-empty">Not filled yet</span>
  return (
    <span className="reports-answer-pill is-filled">
      <Check size={14} aria-hidden />
      <span>{formatAnswerLabel(answer) || 'Filled'}</span>
    </span>
  )
}

function EventRowHeader({ title, meta, note, status, expanded, onToggle }) {
  return (
    <button
      type="button"
      className="reports-open-hit"
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <span className="reports-event-icon" aria-hidden>
        <Calendar size={16} />
      </span>
      <span className="reports-event-copy">
        <strong>{title}</strong>
        {meta ? <span className="reports-card-meta">{meta}</span> : null}
        {note ? <span className="reports-card-note">{note}</span> : null}
      </span>
      <span className="reports-event-side">
        {status}
        <ChevronRight className={`reports-event-chevron${expanded ? ' is-open' : ''}`} size={16} aria-hidden />
      </span>
    </button>
  )
}

function DayCancelActions({ row, isAdmin, saving, onSetCancelled }) {
  if (!isAdmin || !isRecurringReportEvent(row.event) || !onSetCancelled) return null
  return (
    <div className="reports-card-actions reports-day-cancel">
      {row.cancelled ? (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={saving}
          onClick={() => onSetCancelled(row.event.id, row.date, false)}
        >
          Restore this day
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={saving}
          onClick={() => onSetCancelled(row.event.id, row.date, true)}
        >
          Cancel this day
        </button>
      )}
    </div>
  )
}

function EveryoneEvent({ row, roster, responseMap, isAdmin, onFillPerson, saving, onSetCancelled }) {
  const [expanded, setExpanded] = useState(false)
  const people = roster.map((person) => ({
    person,
    answer: answerFor(row.event.id, row.date, person.id, responseMap),
  }))
  const answered = people.filter((item) => item.answer)

  return (
    <article className={`rail-card reports-event-row${expanded ? ' is-open' : ''}${row.cancelled ? ' is-cancelled' : ''}`}>
      <EventRowHeader
        title={row.event.title}
        meta={eventWhen(row.event)}
        note={row.event.note}
        status={
          row.cancelled
            ? <span className="reports-answer-pill is-cancelled">Cancelled</span>
            : <span className="reports-answer-pill is-empty">{answered.length} of {people.length} filled</span>
        }
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
      {expanded ? (
        <div className="reports-event-body">
          <DayCancelActions
            row={row}
            isAdmin={isAdmin}
            saving={saving}
            onSetCancelled={onSetCancelled}
          />
          {row.cancelled ? (
            <p className="muted">This day is cancelled. Members do not need to fill it.</p>
          ) : (
            <>
              {!isAdmin ? <p className="muted">View only</p> : null}
              <ul className="reports-everyone-list">
                {people.map(({ person, answer }) => {
                  const label = answerSummary(answer)
                  if (!isAdmin) {
                    return (
                      <li key={person.id} className="reports-everyone-person is-readonly">
                        <span>{personLabel(person)}</span>
                        <span className="muted">{label}</span>
                      </li>
                    )
                  }
                  return (
                    <li key={person.id}>
                      <button
                        type="button"
                        className="reports-everyone-person"
                        onClick={() =>
                          onFillPerson({
                            event: row.event,
                            date: row.date,
                            userId: person.id,
                            displayName: personLabel(person),
                            answer,
                          })
                        }
                      >
                        <span>{personLabel(person)}</span>
                        <span className="muted">{label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </article>
  )
}

function MineEvent({ row, expanded, onToggle, saving, onSave, onClear, isAdmin, onSetCancelled, canWriteReports = true }) {
  return (
    <article className={`rail-card reports-event-row${expanded ? ' is-open' : ''}${row.cancelled ? ' is-cancelled' : ''}`}>
      <EventRowHeader
        title={row.event.title}
        meta={eventWhen(row.event)}
        note={row.event.note}
        status={
          row.cancelled
            ? <span className="reports-answer-pill is-cancelled">Cancelled</span>
            : <StatusPill answer={row.answer} />
        }
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded ? (
        <div className="reports-event-body">
          <DayCancelActions
            row={row}
            isAdmin={isAdmin}
            saving={saving}
            onSetCancelled={onSetCancelled}
          />
          {row.cancelled ? (
            <p className="muted">This day is cancelled. You do not need to fill it.</p>
          ) : canWriteReports ? (
            <InlineReportAnswer
              key={`${row.event.id}-${row.date}-${row.answer?.updatedAt || ''}`}
              answer={row.answer}
              event={row.event}
              saving={saving}
              onSave={onSave}
              onClear={row.answer && !row.answer.legacy ? () => onClear(row) : null}
            />
          ) : (
            <p className="muted">{answerSummary(row.answer)}</p>
          )}
        </div>
      ) : null}
    </article>
  )
}

export function ReportsHome({
  scope,
  onScope,
  canViewOthers,
  events,
  roster,
  responseMap,
  actorId,
  today,
  isAdmin,
  canWriteReports = true,
  saving,
  onSaveResponse,
  onClearResponse,
  onFillPerson,
  onSetEventDayCancelled,
  focusDate,
  focusEventId,
}) {
  const everyone = scope === 'everyone'
  const [selectedDate, setSelectedDate] = useState(focusDate || today)
  const [view, setView] = useState(() => {
    const [year, month] = (focusDate || today).split('-').map(Number)
    return { year, month: month - 1 }
  })
  const [expandedKey, setExpandedKey] = useState(
    focusEventId && focusDate ? `${focusEventId}_${focusDate}` : '',
  )
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  const bounds = visibleBounds(view.year, view.month)
  const horizon = addDaysToDateId(selectedDate, 45)

  const monthRows = useMemo(() => {
    const rows = []
    for (const raw of events ?? []) {
      const event = normalizeReportEvent(raw)
      for (const date of occurrenceDates(event, { from: bounds.start, to: bounds.end })) {
        rows.push({
          event,
          date,
          answer: !everyone && actorId ? answerFor(event.id, date, actorId, responseMap) : null,
        })
      }
    }
    return rows
  }, [events, bounds.start, bounds.end, everyone, actorId, responseMap])

  const upcomingRows = useMemo(() => {
    const rows = []
    const from = addDaysToDateId(selectedDate, 1)
    for (const raw of events ?? []) {
      const event = normalizeReportEvent(raw)
      for (const date of occurrenceDates(event, { from, to: horizon })) {
        rows.push({
          event,
          date,
          answer: !everyone && actorId ? answerFor(event.id, date, actorId, responseMap) : null,
        })
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || String(a.event.time).localeCompare(String(b.event.time)))
    return rows
  }, [events, selectedDate, horizon, everyone, actorId, responseMap])

  const dotsByDate = useMemo(() => {
    const map = {}
    const bucket = (date, kind) => {
      if (!map[date]) map[date] = new Set()
      map[date].add(kind)
    }
    if (!everyone) {
      for (const row of monthRows) bucket(row.date, dotKind(row.answer))
    } else {
      for (const row of monthRows) {
        let empty = false
        for (const person of roster) {
          const answer = answerFor(row.event.id, row.date, person.id, responseMap)
          const kind = dotKind(answer)
          if (kind === 'empty') empty = true
          else bucket(row.date, kind)
        }
        if (empty) bucket(row.date, 'empty')
      }
    }
    return Object.fromEntries(
      Object.entries(map).map(([date, kinds]) => [
        date,
        DOT_ORDER.filter((kind) => kinds.has(kind)),
      ]),
    )
  }, [monthRows, everyone, roster, responseMap])

  const dayRows = useMemo(() => {
    const active = monthRows
      .filter((row) => row.date === selectedDate)
      .map((row) => ({ ...row, cancelled: false }))
    if (!isAdmin) {
      return active.sort((a, b) => String(a.event.time).localeCompare(String(b.event.time)))
    }
    const cancelled = []
    for (const raw of events ?? []) {
      const event = normalizeReportEvent(raw)
      if (!isRecurringReportEvent(event)) continue
      for (const date of cancelledOccurrenceDates(event, {
        from: selectedDate,
        to: selectedDate,
      })) {
        cancelled.push({
          event,
          date,
          answer: !everyone && actorId ? answerFor(event.id, date, actorId, responseMap) : null,
          cancelled: true,
        })
      }
    }
    return [...active, ...cancelled].sort((a, b) => {
      if (a.cancelled !== b.cancelled) return a.cancelled ? 1 : -1
      return String(a.event.time).localeCompare(String(b.event.time))
    })
  }, [monthRows, selectedDate, isAdmin, events, everyone, actorId, responseMap])
  const upcoming = showAllUpcoming ? upcomingRows : upcomingRows.slice(0, 4)

  const selectDate = (dateId, expandKey = '') => {
    setSelectedDate(dateId)
    setExpandedKey(expandKey)
    const [year, month] = dateId.split('-').map(Number)
    setView((current) => (
      current.year === year && current.month === month - 1
        ? current
        : { year, month: month - 1 }
    ))
  }

  const saveRow = async (row, patch) => {
    await onSaveResponse({
      eventId: row.event.id,
      date: row.date,
      userId: actorId,
      answerType: row.event.answerType,
      status: patch.status,
      time: patch.time,
      reason: patch.reason,
      numberValue: patch.numberValue,
      note: patch.note,
      selected: patch.selected,
      customText: patch.customText,
    })
  }

  const dayPanel = (
    <div className="reports-day">
      <div className="reports-day-head">
        <h3>
          {formatReportDate(selectedDate)}
          {selectedDate === today ? <span className="reports-today-chip">Today</span> : null}
        </h3>
        <div className="reports-day-nav">
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            aria-label="Previous day"
            onClick={() => selectDate(addDaysToDateId(selectedDate, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            aria-label="Next day"
            onClick={() => selectDate(addDaysToDateId(selectedDate, 1))}
          >
            <ChevronRight size={18} />
          </button>
          {selectedDate !== today ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => selectDate(today)}>
              <Calendar size={14} aria-hidden />
              Go to today
            </button>
          ) : null}
        </div>
      </div>

      {dayRows.length === 0 ? (
        <p className="muted">No events on this day.</p>
      ) : everyone ? (
        <div className="reports-stack">
          <p className="reports-section-label reports-day-count">All events on {formatReportDate(selectedDate)} · {dayRows.length}</p>
          {dayRows.map((row) => (
            <EveryoneEvent
              key={`${row.event.id}-${row.date}`}
              row={row}
              roster={roster}
              responseMap={responseMap}
              isAdmin={isAdmin}
              onFillPerson={onFillPerson}
              saving={saving}
              onSetCancelled={onSetEventDayCancelled}
            />
          ))}
        </div>
      ) : (
        <div className="reports-stack">
          <p className="reports-section-label reports-day-count">
            All events on {formatReportDate(selectedDate)} · {dayRows.length}
          </p>
          {dayRows.map((row) => {
            const key = `${row.event.id}_${row.date}`
            return (
              <MineEvent
                key={`${row.event.id}-${row.date}`}
                row={row}
                expanded={expandedKey === key}
                onToggle={() => setExpandedKey((current) => (current === key ? '' : key))}
                saving={saving}
                onSave={(patch) => saveRow(row, patch)}
                onClear={() => onClearResponse(row)}
                isAdmin={isAdmin}
                onSetCancelled={onSetEventDayCancelled}
                canWriteReports={canWriteReports}
              />
            )
          })}
        </div>
      )}
    </div>
  )

  const calendarColumn = (
    <div className="reports-cal-column">
      {canViewOthers && canWriteReports ? (
        <div className="mobile-segmented reports-scope" role="group" aria-label="Whose reports">
          <button
            type="button"
            className={`mobile-segmented-btn${scope === 'self' ? ' is-active' : ''}`}
            aria-pressed={scope === 'self'}
            onClick={() => onScope('self')}
          >
            Mine
          </button>
          <button
            type="button"
            className={`mobile-segmented-btn${scope === 'everyone' ? ' is-active' : ''}`}
            aria-pressed={scope === 'everyone'}
            onClick={() => onScope('everyone')}
          >
            Everyone
          </button>
        </div>
      ) : null}
      <ReportsMonthCalendar
        year={view.year}
        month={view.month}
        onPrev={() => setView((current) => shiftMonth(current.year, current.month, -1))}
        onNext={() => setView((current) => shiftMonth(current.year, current.month, 1))}
        selectedDate={selectedDate}
        today={today}
        onSelect={selectDate}
        dotsByDate={dotsByDate}
      />
      <section className="reports-upcoming">
        <div className="reports-section-head">
          <h3>Upcoming events</h3>
          {upcomingRows.length > 4 ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAllUpcoming((value) => !value)}>
              {showAllUpcoming ? 'Show less' : 'View all'}
            </button>
          ) : null}
        </div>
        {upcoming.length === 0 ? (
          <p className="muted">Nothing scheduled after this day.</p>
        ) : (
          <ul className="reports-upcoming-list">
            {upcoming.map((row) => {
              let status = <StatusPill answer={row.answer} />
              if (everyone) {
                let filled = 0
                for (const person of roster) {
                  if (answerFor(row.event.id, row.date, person.id, responseMap)) filled += 1
                }
                status = <span className="reports-answer-pill is-empty">{filled} of {roster.length} filled</span>
              }
              return (
                <li key={`${row.event.id}-${row.date}`}>
                  <button
                    type="button"
                    className="rail-card reports-event-row"
                    onClick={() => selectDate(
                      row.date,
                      everyone ? '' : `${row.event.id}_${row.date}`,
                    )}
                  >
                    <span className="reports-event-icon" aria-hidden>
                      <Calendar size={16} />
                    </span>
                    <span className="reports-event-copy">
                      <strong>{formatReportDate(row.date)}</strong>
                      <span>{row.event.title}</span>
                      <span className="reports-card-meta">{eventWhen(row.event)}</span>
                    </span>
                    <span className="reports-event-side">
                      {status}
                      <ChevronRight size={16} aria-hidden />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )

  return (
    <div className="reports-cal-layout">
      {calendarColumn}
      {dayPanel}
    </div>
  )
}
