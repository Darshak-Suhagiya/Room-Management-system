import { useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, LayoutGrid, LayoutList, MoreHorizontal } from 'lucide-react'
import { REPORT_ANSWER_TYPE, REPORT_ANSWER_TYPE_LABELS, REPORT_EVENT_TYPE_LABELS } from '../../config/constants'
import { normalizeReportEvent, personLabel } from '../../utils/reportAttendance'
import { MobilePageHeader } from '../mobile'
import { AnalyticsDayDetail } from './AnalyticsDayDetail'
import { AnalyticsRangePicker } from './AnalyticsRangePicker'
import { EventMark } from './ReportsAnalytics'
import {
  defaultAnalyticsRange,
  initialOf,
  rangeDays,
  rangeLabel,
  rangeSpanDays,
  rowsForWeek,
  shiftAnalyticsRange,
  summarize,
  weekdayShort,
} from './reportsAnalyticsShared'

function MobileHeaderActions({
  isAdmin,
  canWriteReports = true,
  grantedCount,
  onOpenAccess,
  onOpenExport,
  onAddEvent,
  onAddNote,
  onShowCalendar,
}) {
  return (
    <div className="reports-header-actions reports-m-actions">
      <div className="reports-header-tools">
        {isAdmin ? (
          <button type="button" className="btn btn-secondary btn-sm" aria-label="New event" onClick={onAddEvent}>
            <span className="reports-action-label">+ Event</span>
          </button>
        ) : null}
        {canWriteReports ? (
          <button type="button" className="btn btn-secondary btn-sm" aria-label="Person note" onClick={onAddNote}>
            <span className="reports-action-label">+ Person note</span>
          </button>
        ) : null}
        {isAdmin ? (
          <button type="button" className="btn btn-secondary btn-sm" aria-label="Who can see everyone's records" onClick={onOpenAccess}>
            <span className="reports-action-label">Viewers{grantedCount > 0 ? ` (${grantedCount})` : ''}</span>
          </button>
        ) : null}
        <button type="button" className="btn btn-secondary btn-sm" aria-label="Export PDF" onClick={onOpenExport}>
          <span className="reports-action-label">Export</span>
        </button>
      </div>
      <div className="reports-m-mode-row">
        <button type="button" className="btn btn-primary" aria-pressed="true">
          Analytics
        </button>
        <button type="button" className="btn btn-secondary" onClick={onShowCalendar}>
          Calendar
        </button>
      </div>
    </div>
  )
}

function MobileWeek({ range, today, onChange, onOpenPicker }) {
  const thisWeek = defaultAnalyticsRange(today)
  const span = rangeSpanDays(range.from, range.to)
  const showThisWeek = thisWeek.from !== range.from || thisWeek.to !== range.to
  return (
    <div className="reports-m-week">
      <button
        type="button"
        aria-label="Previous range"
        onClick={() => onChange(shiftAnalyticsRange(range, -span))}
      >
        <ChevronLeft size={18} />
      </button>
      <button type="button" className="reports-m-range-label" aria-label="Choose date range" onClick={onOpenPicker}>
        <Calendar size={14} aria-hidden />
        {rangeLabel(range.from, range.to)}
      </button>
      <button
        type="button"
        aria-label="Next range"
        onClick={() => onChange(shiftAnalyticsRange(range, span))}
      >
        <ChevronRight size={18} />
      </button>
      {showThisWeek ? (
        <button type="button" className="reports-m-thisweek" onClick={() => onChange(thisWeek)}>
          This week
        </button>
      ) : null}
    </div>
  )
}

function MobileCounts({ chips, total }) {
  const shown = chips.map((chip) => ({
    ...chip,
    percent: !chip.skipBar && total ? Math.round((Number(chip.value) / total) * 100) : null,
  }))
  return (
    <div className="reports-m-count">
      <div className="reports-m-chips">
        {shown.map((chip) => (
          <span key={chip.label} className={`reports-m-chip is-${chip.tone || 'empty'}`}>
            <strong>{chip.value}</strong>
            <span>{chip.label}</span>
            {chip.percent != null ? <small>{chip.percent}%</small> : null}
          </span>
        ))}
        <b className="reports-m-total">{total} total</b>
      </div>
      <div className="reports-analytics-bar" aria-hidden>
        {shown.filter((chip) => !chip.skipBar && chip.value > 0).map((chip) => {
          const barTotal = shown.filter((item) => !item.skipBar).reduce((sum, item) => sum + Number(item.value), 0)
          return (
            <span
              key={chip.label}
              className={`is-${chip.tone || 'empty'}`}
              style={{ width: `${barTotal ? (Number(chip.value) / barTotal) * 100 : 0}%` }}
            />
          )
        })}
      </div>
    </div>
  )
}

function DayPills({ range, rows, onSelect }) {
  const byDate = new Map(rows.map((row) => [row.date, row]))
  const dates = rangeDays(range.from, range.to).filter((date) => byDate.has(date))
  if (dates.length === 0) return null
  return (
    <div className="reports-m-days">
      {dates.map((date) => {
        const row = byDate.get(date)
        return (
          <button
            key={date}
            type="button"
            className={`reports-m-pill is-${row.tone || 'empty'}`}
            onClick={(event) => {
              event.stopPropagation()
              onSelect?.(row)
            }}
          >
            <span>{weekdayShort(date)}</span>
            <strong>{Number(date.slice(8))}</strong>
            <em>{row.label}</em>
          </button>
        )
      })}
    </div>
  )
}

function DateTiles({ rows, onSelect }) {
  return (
    <div className="reports-m-tiles">
      {rows.slice().sort((a, b) => a.date.localeCompare(b.date)).map((row) => (
        <button
          key={row.date}
          type="button"
          className={`reports-m-tile is-${row.tone || 'empty'}`}
          onClick={() => onSelect?.(row)}
        >
          <span>{weekdayShort(row.date)}</span>
          <strong>{Number(row.date.slice(8))}</strong>
          <em>{row.label}</em>
        </button>
      ))}
    </div>
  )
}

export function ReportsAnalyticsMobile({
  events,
  roster,
  responseMap,
  actorId,
  canViewOthers,
  today,
  isAdmin,
  canWriteReports = true,
  grantedCount,
  onOpenAccess,
  onOpenExport,
  onAddEvent,
  onAddNote,
  onShowCalendar,
}) {
  const [range, setRange] = useState(() => defaultAnalyticsRange(today))
  const [rangePickerOpen, setRangePickerOpen] = useState(false)
  const [personId, setPersonId] = useState('')
  const [layout, setLayout] = useState('list')
  const [mode, setMode] = useState('event')
  const [eventKey, setEventKey] = useState('')
  const [personFocus, setPersonFocus] = useState('')
  const [query, setQuery] = useState('')
  const [dayDetail, setDayDetail] = useState(null)

  const people = useMemo(() => {
    const self = (roster ?? []).find((person) => person.id === actorId) || {
      id: actorId,
      displayName: 'Member',
    }
    const source = canViewOthers ? (roster ?? []) : [self]
    return [...source].filter((person) => person?.id).sort((a, b) => personLabel(a).localeCompare(personLabel(b)))
  }, [roster, canViewOthers, actorId])

  const groups = useMemo(() => {
    const map = new Map()
    for (const raw of events ?? []) {
      const event = normalizeReportEvent(raw)
      const title = String(event.title || 'Event').trim() || 'Event'
      const answerType = event.answerType || REPORT_ANSWER_TYPE.ATTENDANCE
      const key = `${title.toLowerCase()}|${answerType}`
      if (!map.has(key)) map.set(key, { key, title, answerType, types: new Set(), events: [] })
      const group = map.get(key)
      group.types.add(REPORT_EVENT_TYPE_LABELS[event.type] || 'Once')
      group.events.push(event)
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title))
  }, [events])

  const chosen = people.filter((person) => !personId || person.id === personId)
  const { from: rangeFrom, to: rangeTo } = range
  const eventCards = groups
    .map((group) => {
      const rows = rowsForWeek(group, rangeFrom, rangeTo, chosen, responseMap)
      return {
        ...group,
        typeLabel: [...group.types].join(' · '),
        dateCount: new Set(rows.map((row) => row.date)).size,
        rows,
        chips: rows.length ? summarize(group.answerType, rows) : [],
      }
    })
    .filter((card) => card.rows.length > 0)

  const memberCards = people
    .map((person) => {
      const items = groups
        .map((group) => ({
          group,
          rows: rowsForWeek(group, rangeFrom, rangeTo, [person], responseMap),
        }))
        .filter((item) => item.rows.length)
      const rows = items.flatMap((item) => item.rows)
      const types = [...new Set(items.map((item) => item.group.answerType))]
      const chips = types.length === 1
        ? summarize(types[0], rows)
        : [
            { label: 'Filled', value: rows.filter((row) => row.filled).length, tone: 'yes' },
            { label: 'Not filled', value: rows.filter((row) => !row.filled).length, tone: 'empty' },
          ]
      return { person, items, rows, chips }
    })
    .filter((card) => card.items.length > 0 && (!personId || card.person.id === personId))

  const selectedEvent = groups.find((group) => group.key === eventKey) || null
  const detailRows = selectedEvent ? rowsForWeek(selectedEvent, rangeFrom, rangeTo, chosen, responseMap) : []
  const detailPeople = [...new Map(detailRows.map((row) => [row.person.id, row.person])).values()]
    .filter((person) => personLabel(person).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => personLabel(a).localeCompare(personLabel(b)))
  const focusedMember = memberCards.find((card) => card.person.id === personFocus) || null

  const headerActions = (
    <MobileHeaderActions
      isAdmin={isAdmin}
      canWriteReports={canWriteReports}
      grantedCount={grantedCount}
      onOpenAccess={onOpenAccess}
      onOpenExport={onOpenExport}
      onAddEvent={onAddEvent}
      onAddNote={onAddNote}
      onShowCalendar={onShowCalendar}
    />
  )

  if (mode === 'event' && selectedEvent) {
    return (
      <div className="reports-m-analytics">
        <header className="reports-m-screenhead">
          <button type="button" aria-label="Back" onClick={() => setEventKey('')}>
            <ChevronLeft size={20} />
          </button>
          <span>
            <strong>{selectedEvent.title}</strong>
            <small>
              {[...selectedEvent.types].join(' · ')}
              {' · '}
              {REPORT_ANSWER_TYPE_LABELS[selectedEvent.answerType] || 'Attendance'}
            </small>
          </span>
          <button type="button" aria-label="Close" onClick={() => setEventKey('')}>
            <MoreHorizontal size={18} />
          </button>
        </header>
        <MobileWeek
          range={range}
          today={today}
          onChange={setRange}
          onOpenPicker={() => setRangePickerOpen(true)}
        />
        {detailRows.length === 0 ? <p className="muted">No date this week.</p> : (
          <MobileCounts chips={summarize(selectedEvent.answerType, detailRows)} total={detailRows.length} />
        )}
        <div className="reports-m-people-head">
          <h3>People & Their Answers</h3>
          <div className="reports-m-people-tools">
            <input className="app-input" value={query} placeholder="Search person" onChange={(input) => setQuery(input.target.value)} />
            {canViewOthers ? (
              <select className="app-input" value={personId} onChange={(input) => setPersonId(input.target.value)}>
                <option value="">All people</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>{personLabel(person)}</option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
        <div className="reports-m-people">
          {detailPeople.map((person) => {
            const mine = detailRows.filter((row) => row.person.id === person.id)
            return (
              <button
                key={person.id}
                type="button"
                className="reports-m-person"
                onClick={() => {
                  setMode('person')
                  setPersonFocus(person.id)
                  setEventKey('')
                }}
              >
                <span className="reports-analytics-avatar">{initialOf(personLabel(person))}</span>
                <span className="reports-m-person-copy">
                  <strong>{personLabel(person)}</strong>
                  <small>{mine.length} {mine.length === 1 ? 'date' : 'dates'}</small>
                </span>
                <ChevronRight size={16} aria-hidden />
                <DayPills range={range} rows={mine} onSelect={setDayDetail} />
              </button>
            )
          })}
        </div>
        <AnalyticsDayDetail
          open={Boolean(dayDetail)}
          row={dayDetail}
          onClose={() => setDayDetail(null)}
        />
        <AnalyticsRangePicker
          open={rangePickerOpen}
          onClose={() => setRangePickerOpen(false)}
          value={range}
          today={today}
          onApply={setRange}
        />
      </div>
    )
  }

  if (mode === 'person' && focusedMember) {
    return (
      <div className="reports-m-analytics">
        <header className="reports-m-screenhead">
          <button type="button" aria-label="Back" onClick={() => setPersonFocus('')}>
            <ChevronLeft size={20} />
          </button>
          <span>
            <strong>{personLabel(focusedMember.person)}</strong>
            <small>{focusedMember.items.length} {focusedMember.items.length === 1 ? 'event' : 'events'}</small>
          </span>
          <button type="button" aria-label="Close" onClick={() => setPersonFocus('')}>
            <MoreHorizontal size={18} />
          </button>
        </header>
        <MobileWeek
          range={range}
          today={today}
          onChange={setRange}
          onOpenPicker={() => setRangePickerOpen(true)}
        />
        <div className="reports-m-cards">
          {focusedMember.items.map((item) => (
            <article key={item.group.key} className="reports-m-card">
              <button
                type="button"
                className="reports-m-card-hit"
                onClick={() => {
                  setMode('event')
                  setEventKey(item.group.key)
                  setPersonId(focusedMember.person.id)
                  setPersonFocus('')
                }}
              >
                <EventMark answerType={item.group.answerType} />
                <span>
                  <strong>{item.group.title}</strong>
                  <small>
                    {[...item.group.types].join(' · ')}
                    {' · '}
                    {REPORT_ANSWER_TYPE_LABELS[item.group.answerType] || 'Attendance'}
                    {' · '}
                    {new Set(item.rows.map((row) => row.date)).size} dates
                  </small>
                </span>
                <ChevronRight size={16} aria-hidden />
              </button>
              <DateTiles rows={item.rows} onSelect={setDayDetail} />
            </article>
          ))}
        </div>
        <AnalyticsDayDetail
          open={Boolean(dayDetail)}
          row={dayDetail}
          onClose={() => setDayDetail(null)}
        />
        <AnalyticsRangePicker
          open={rangePickerOpen}
          onClose={() => setRangePickerOpen(false)}
          value={range}
          today={today}
          onApply={setRange}
        />
      </div>
    )
  }

  return (
    <div className="reports-m-analytics">
      <MobilePageHeader
        artKey="reports"
        size="compact"
        title="Reports"
        description="View event analytics and manage records."
        action={headerActions}
      />
      <div className="reports-m-toolbar">
        <MobileWeek
          range={range}
          today={today}
          onChange={setRange}
          onOpenPicker={() => setRangePickerOpen(true)}
        />
        <div className="reports-m-filter-row">
          {canViewOthers ? (
            <select className="app-input" value={personId} onChange={(input) => setPersonId(input.target.value)}>
              <option value="">All people</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>{personLabel(person)}</option>
              ))}
            </select>
          ) : <span />}
          <div className="reports-m-layout" role="group" aria-label="Layout">
            <button type="button" className={layout === 'list' ? 'is-active' : ''} onClick={() => setLayout('list')}>
              <LayoutList size={14} aria-hidden /> List
            </button>
            <button type="button" className={layout === 'grid' ? 'is-active' : ''} onClick={() => setLayout('grid')}>
              <LayoutGrid size={14} aria-hidden /> Grid
            </button>
          </div>
        </div>
        <div className="reports-m-switch" role="group" aria-label="How to group">
          <button type="button" className={mode === 'event' ? 'is-active' : ''} onClick={() => { setMode('event'); setPersonFocus('') }}>
            Event wise
          </button>
          <button type="button" className={mode === 'person' ? 'is-active' : ''} onClick={() => { setMode('person'); setEventKey('') }}>
            Person wise
          </button>
        </div>
      </div>

      {mode === 'event' ? (
        eventCards.length === 0 ? <p className="muted">No events this week.</p> : (
          <div className={`reports-m-cards${layout === 'grid' ? ' is-grid' : ''}`}>
            {eventCards.map((card) => (
              <article key={card.key} className="reports-m-card">
                <button type="button" className="reports-m-card-hit" onClick={() => setEventKey(card.key)}>
                  <EventMark answerType={card.answerType} />
                  <span>
                    <strong>{card.title}</strong>
                    <small>
                      {card.typeLabel}
                      {' · '}
                      {REPORT_ANSWER_TYPE_LABELS[card.answerType] || 'Attendance'}
                      {' · '}
                      {card.dateCount} {card.dateCount === 1 ? 'date' : 'dates'}
                    </small>
                  </span>
                  <ChevronRight size={16} aria-hidden />
                </button>
                <MobileCounts chips={card.chips} total={card.rows.length} />
              </article>
            ))}
          </div>
        )
      ) : memberCards.length === 0 ? <p className="muted">No answers this week.</p> : (
        <div className={`reports-m-cards${layout === 'grid' ? ' is-grid' : ''}`}>
          {memberCards.map((card) => (
            <article key={card.person.id} className="reports-m-card">
              <button type="button" className="reports-m-card-hit" onClick={() => setPersonFocus(card.person.id)}>
                <span className="reports-analytics-avatar">{initialOf(personLabel(card.person))}</span>
                <span>
                  <strong>{personLabel(card.person)}</strong>
                  <small>{card.items.length} {card.items.length === 1 ? 'event' : 'events'}</small>
                </span>
                <ChevronRight size={16} aria-hidden />
              </button>
              <MobileCounts chips={card.chips} total={card.rows.length} />
            </article>
          ))}
        </div>
      )}
      <AnalyticsRangePicker
        open={rangePickerOpen}
        onClose={() => setRangePickerOpen(false)}
        value={range}
        today={today}
        onApply={setRange}
      />
    </div>
  )
}
