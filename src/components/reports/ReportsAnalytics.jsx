import { useMemo, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hash,
  LayoutGrid,
  LayoutList,
  Sun,
  Users,
  X,
} from 'lucide-react'
import {
  REPORT_ANSWER_TYPE,
  REPORT_ANSWER_TYPE_LABELS,
  REPORT_EVENT_TYPE_LABELS,
} from '../../config/constants'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { normalizeReportEvent, personLabel } from '../../utils/reportAttendance'
import { AnalyticsDayDetail } from './AnalyticsDayDetail'
import { AnalyticsRangePicker } from './AnalyticsRangePicker'
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

function typeTone(answerType) {
  if (answerType === REPORT_ANSWER_TYPE.NUMBER) return 'number'
  if (answerType === REPORT_ANSWER_TYPE.YES_NO) return 'yesno'
  if (answerType === REPORT_ANSWER_TYPE.SINGLE || answerType === REPORT_ANSWER_TYPE.MULTI) return 'choice'
  return 'attendance'
}

function ShareBar({ chips }) {
  const parts = chips.filter((chip) => !chip.skipBar && chip.value > 0)
  const total = parts.reduce((sum, chip) => sum + Number(chip.value), 0)
  if (!total) return null
  return (
    <div className="reports-analytics-bar" aria-hidden>
      {parts.map((chip) => (
        <span
          key={chip.label}
          className={`is-${chip.tone || 'empty'}`}
          style={{ width: `${(Number(chip.value) / total) * 100}%` }}
        />
      ))}
    </div>
  )
}

function CountBlock({ chips, total }) {
  const shown = chips.map((chip) => ({
    ...chip,
    percent: !chip.skipBar && total ? Math.round((Number(chip.value) / total) * 100) : null,
  }))
  const legend = shown.filter((chip) => chip.percent != null)
  return (
    <>
      <div className="reports-analytics-stats">
        {shown.map((chip) => (
          <div key={chip.label} className={`reports-analytics-stat is-${chip.tone || 'empty'}`}>
            <strong>{chip.value}</strong>
            <span>{chip.label}</span>
            {chip.percent != null ? <small>{chip.percent}%</small> : null}
          </div>
        ))}
        <div className="reports-analytics-stat is-total">
          <strong>{total}</strong>
          <span>Total</span>
        </div>
      </div>
      <ShareBar chips={shown} />
      {legend.length > 0 ? (
        <p className="reports-analytics-legend">{legend.map((chip) => `${chip.percent}%`).join(' / ')}</p>
      ) : null}
    </>
  )
}

function WeekNav({ range, today, onChange, onOpenPicker }) {
  const thisWeek = defaultAnalyticsRange(today)
  const span = rangeSpanDays(range.from, range.to)
  const onThisWeek = thisWeek.from !== range.from || thisWeek.to !== range.to
  return (
    <div className="reports-analytics-week">
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        aria-label="Previous range"
        onClick={() => onChange(shiftAnalyticsRange(range, -span))}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        className="reports-analytics-range-label"
        aria-label="Choose date range"
        onClick={onOpenPicker}
      >
        <Calendar size={14} aria-hidden />
        {rangeLabel(range.from, range.to)}
      </button>
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        aria-label="Next range"
        onClick={() => onChange(shiftAnalyticsRange(range, span))}
      >
        <ChevronRight size={18} />
      </button>
      {onThisWeek ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(thisWeek)}>
          This week
        </button>
      ) : null}
    </div>
  )
}

export function EventMark({ answerType }) {
  const tone = typeTone(answerType)
  return (
    <span className={`reports-analytics-mark is-${tone}`} aria-hidden>
      {tone === 'number' ? <Hash size={16} /> : null}
      {tone === 'yesno' ? <Sun size={16} /> : null}
      {tone === 'choice' ? <Clock size={16} /> : null}
      {tone === 'attendance' ? <Users size={16} /> : null}
    </span>
  )
}

function WeekStrip({ range, rows, onSelect }) {
  const byDate = new Map(rows.map((row) => [row.date, row]))
  const dates = rangeDays(range.from, range.to).filter((date) => byDate.has(date))
  if (dates.length === 0) {
    return <p className="muted reports-analytics-nodates">No dates in this range.</p>
  }
  return (
    <div className="reports-analytics-weekstrip">
      {dates.map((date) => {
        const row = byDate.get(date)
        return (
          <button
            key={date}
            type="button"
            className={`reports-analytics-day is-${row.tone || 'empty'}`}
            onClick={() => onSelect?.(row)}
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

export function ReportsAnalytics({
  events,
  roster,
  responseMap,
  actorId,
  canViewOthers,
  today,
}) {
  const isDesktop = useMediaQuery('(min-width: 900px)')
  const [range, setRange] = useState(() => defaultAnalyticsRange(today))
  const [rangePickerOpen, setRangePickerOpen] = useState(false)
  const [personId, setPersonId] = useState('')
  const [layout, setLayout] = useState('list')
  const [mode, setMode] = useState('event')
  const [eventKey, setEventKey] = useState('auto')
  const [personFocus, setPersonFocus] = useState('auto')
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
      if (!map.has(key)) {
        map.set(key, { key, title, answerType, types: new Set(), events: [] })
      }
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

  const shownEventKey = mode !== 'event'
    ? ''
    : eventKey === 'auto'
      ? (isDesktop ? eventCards[0]?.key || '' : '')
      : eventKey
  const selectedEvent = groups.find((group) => group.key === shownEventKey) || null
  const detailRows = selectedEvent
    ? rowsForWeek(selectedEvent, rangeFrom, rangeTo, chosen, responseMap)
    : []
  const detailPeople = [...new Map(detailRows.map((row) => [row.person.id, row.person])).values()]
    .filter((person) => personLabel(person).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => personLabel(a).localeCompare(personLabel(b)))

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

  const shownPersonId = mode !== 'person'
    ? ''
    : personFocus === 'auto'
      ? (isDesktop ? memberCards[0]?.person.id || '' : '')
      : personFocus
  const focusedMember = memberCards.find((card) => card.person.id === shownPersonId)
    || (mode === 'person' && shownPersonId
      ? people
        .filter((person) => person.id === shownPersonId)
        .map((person) => ({ person, items: [], rows: [], chips: [] }))[0]
      : null)
  const showEventDetail = Boolean(selectedEvent)
  const showPersonDetail = mode === 'person' && Boolean(focusedMember)

  return (
    <div className={`reports-analytics-split${(showEventDetail || showPersonDetail) ? ' has-detail' : ''}`}>
      <div className="reports-analytics-list-pane">
        <div className="rail-card reports-analytics-toolbar">
          <WeekNav
            range={range}
            today={today}
            onChange={setRange}
            onOpenPicker={() => setRangePickerOpen(true)}
          />
          <div className="reports-analytics-toolbar-row">
            {canViewOthers && mode === 'event' ? (
              <label className="field-stack">
                <span className="field-stack-label">Person</span>
                <select className="app-input" value={personId} onChange={(input) => setPersonId(input.target.value)}>
                  <option value="">All people</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>{personLabel(person)}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="reports-analytics-toggles">
              <div className="reports-analytics-switch" role="group" aria-label="How to group">
                <button type="button" className={mode === 'event' ? 'is-active' : ''} onClick={() => { setMode('event'); setPersonFocus('') }}>
                  Event wise
                </button>
                <button type="button" className={mode === 'person' ? 'is-active' : ''} onClick={() => { setMode('person'); setEventKey(''); setPersonFocus('auto'); setQuery('') }}>
                  Person wise
                </button>
              </div>
              <div className="reports-analytics-switch" role="group" aria-label="Layout">
                <button type="button" className={layout === 'list' ? 'is-active' : ''} aria-label="List" onClick={() => setLayout('list')}>
                  <LayoutList size={16} aria-hidden /> List
                </button>
                <button type="button" className={layout === 'grid' ? 'is-active' : ''} aria-label="Grid" onClick={() => setLayout('grid')}>
                  <LayoutGrid size={16} aria-hidden /> Grid
                </button>
              </div>
            </div>
          </div>
        </div>

        {mode === 'event' ? (
          eventCards.length === 0 ? <p className="muted">No events this week.</p> : (
            <div className={`reports-analytics-events${layout === 'grid' ? ' is-grid' : ''}`}>
              {eventCards.map((card) => (
                <article key={card.key} className={`rail-card reports-analytics-event${shownEventKey === card.key ? ' is-current' : ''}`}>
                  <button type="button" className="reports-open-hit" onClick={() => setEventKey(card.key)}>
                    <EventMark answerType={card.answerType} />
                    <span className="reports-analytics-event-copy">
                      <strong>{card.title}</strong>
                      <span className="muted">
                        {card.typeLabel}
                        {' · '}
                        {REPORT_ANSWER_TYPE_LABELS[card.answerType] || 'Attendance'}
                        {' · '}
                        {card.dateCount} {card.dateCount === 1 ? 'date' : 'dates'} ({rangeLabel(range.from, range.to)})
                      </span>
                    </span>
                    <span className="reports-analytics-date-badge">
                      <Calendar size={12} aria-hidden />
                      {card.dateCount} {card.dateCount === 1 ? 'date' : 'dates'}
                    </span>
                    <ChevronRight size={16} aria-hidden />
                  </button>
                  <CountBlock chips={card.chips} total={card.rows.length} />
                </article>
              ))}
            </div>
          )
        ) : memberCards.length === 0 ? <p className="muted">No answers this week.</p> : (
          <div className={`reports-analytics-events${layout === 'grid' ? ' is-grid' : ''}`}>
            {memberCards.map((card) => (
              <article key={card.person.id} className={`rail-card reports-analytics-event${shownPersonId === card.person.id ? ' is-current' : ''}`}>
                <button type="button" className="reports-open-hit" onClick={() => setPersonFocus(card.person.id)}>
                  <span className="reports-analytics-avatar">{initialOf(personLabel(card.person))}</span>
                  <span className="reports-analytics-event-copy">
                    <strong>{personLabel(card.person)}</strong>
                    <span className="muted">
                      {card.items.length} {card.items.length === 1 ? 'event' : 'events'} ({rangeLabel(range.from, range.to)})
                    </span>
                  </span>
                  <span className="reports-analytics-date-badge">
                    <Calendar size={12} aria-hidden />
                    {card.items.length} {card.items.length === 1 ? 'event' : 'events'}
                  </span>
                  <ChevronRight size={16} aria-hidden />
                </button>
                <CountBlock chips={card.chips} total={card.rows.length} />
              </article>
            ))}
          </div>
        )}
      </div>

      {showEventDetail ? (
        <div className="reports-analytics-detail-pane">
          <div className="reports-analytics-detail-bar">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEventKey('')}>
              <ChevronLeft size={16} aria-hidden />
              Back to reports
            </button>
            <button type="button" className="btn btn-icon btn-ghost" aria-label="Close" onClick={() => setEventKey('')}>
              <X size={18} />
            </button>
          </div>
          <div className="rail-card reports-analytics-event">
            <div className="reports-analytics-detail-top">
              <div className="reports-analytics-detail-head">
                <EventMark answerType={selectedEvent.answerType} />
                <span className="reports-analytics-event-copy">
                  <strong>{selectedEvent.title}</strong>
                  <span className="muted">
                    {[...selectedEvent.types].join(' · ')}
                    {' · '}
                    {REPORT_ANSWER_TYPE_LABELS[selectedEvent.answerType] || 'Attendance'}
                    {' · '}
                    {new Set(detailRows.map((row) => row.date)).size} dates ({rangeLabel(range.from, range.to)})
                  </span>
                </span>
              </div>
              <WeekNav
                range={range}
                today={today}
                onChange={setRange}
                onOpenPicker={() => setRangePickerOpen(true)}
              />
            </div>
            {detailRows.length === 0 ? <p className="muted">No date this week.</p> : (
              <CountBlock chips={summarize(selectedEvent.answerType, detailRows)} total={detailRows.length} />
            )}
          </div>
          {detailRows.length > 0 ? (
            <section className="reports-analytics-people-block">
              <div className="reports-analytics-people-head">
                <h3>People & Their Answers</h3>
                <input
                  className="app-input"
                  value={query}
                  placeholder="Search person"
                  onChange={(input) => setQuery(input.target.value)}
                />
                {canViewOthers ? (
                  <select className="app-input" value={personId} onChange={(input) => setPersonId(input.target.value)}>
                    <option value="">All people</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>{personLabel(person)}</option>
                    ))}
                  </select>
                ) : null}
              </div>
              <div className="reports-analytics-people-cards">
                {detailPeople.map((person) => {
                  const mine = detailRows.filter((row) => row.person.id === person.id)
                  return (
                    <article key={person.id} className="rail-card reports-analytics-person">
                      <div className="reports-analytics-person-id">
                        <span className="reports-analytics-avatar">{initialOf(personLabel(person))}</span>
                        <span>
                          <strong>{personLabel(person)}</strong>
                          <span className="muted">{mine.length} {mine.length === 1 ? 'date' : 'dates'}</span>
                        </span>
                      </div>
                      <WeekStrip range={range} rows={mine} onSelect={setDayDetail} />
                      <button
                        type="button"
                        className="btn btn-icon btn-ghost"
                        aria-label={`Open ${personLabel(person)}`}
                        onClick={() => {
                          setMode('person')
                          setPersonFocus(person.id)
                          setEventKey('')
                        }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {showPersonDetail ? (
        <div className="reports-analytics-detail-pane">
          <div className="reports-analytics-detail-bar">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPersonFocus('')}>
              <ChevronLeft size={16} aria-hidden />
              Back to reports
            </button>
            <button type="button" className="btn btn-icon btn-ghost" aria-label="Close" onClick={() => setPersonFocus('')}>
              <X size={18} />
            </button>
          </div>
          <div className="rail-card reports-analytics-event">
            <div className="reports-analytics-detail-top">
              <div className="reports-analytics-detail-head">
                <span className="reports-analytics-avatar">{initialOf(personLabel(focusedMember.person))}</span>
                <span className="reports-analytics-event-copy">
                  <strong>{personLabel(focusedMember.person)}</strong>
                  <span className="muted">
                    {focusedMember.items.length} {focusedMember.items.length === 1 ? 'event' : 'events'} ({rangeLabel(range.from, range.to)})
                  </span>
                </span>
              </div>
              <WeekNav
                range={range}
                today={today}
                onChange={setRange}
                onOpenPicker={() => setRangePickerOpen(true)}
              />
            </div>
            {focusedMember.rows.length === 0 ? <p className="muted">No date this week.</p> : (
              <CountBlock chips={focusedMember.chips} total={focusedMember.rows.length} />
            )}
          </div>
          {focusedMember.items.length > 0 ? (
            <section className="reports-analytics-people-block">
              <div className="reports-analytics-people-head">
                <h3>Events & Answers</h3>
              </div>
              <div className="reports-analytics-people-cards">
                {focusedMember.items.map((item) => (
                  <article key={item.group.key} className="rail-card reports-analytics-person">
                    <div className="reports-analytics-person-id">
                      <EventMark answerType={item.group.answerType} />
                      <span>
                        <strong>{item.group.title}</strong>
                        <span className="muted">
                          {[...item.group.types].join(' · ')}
                          {' · '}
                          {REPORT_ANSWER_TYPE_LABELS[item.group.answerType] || 'Attendance'}
                        </span>
                      </span>
                    </div>
                    <WeekStrip range={range} rows={item.rows} onSelect={setDayDetail} />
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost"
                      aria-label={`Open ${item.group.title}`}
                      onClick={() => {
                        setMode('event')
                        setEventKey(item.group.key)
                        setPersonFocus('')
                        setPersonId(focusedMember.person.id)
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

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
