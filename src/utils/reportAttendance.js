import {
  REPORT_ANSWER_TYPE,
  REPORT_ATTENDANCE_STATUS,
  REPORT_EVENT_TYPE,
  REPORT_OUT_OF_CITY_REASON,
} from '../config/constants'
import { formatDateId } from './mealDateUtils'
import { addDaysToDateId } from './menuReviewUtils'

const DATE_ID = /^(\d{4})-(\d{2})-(\d{2})$/
export const REPORT_RANGE_MAX_DAYS = 366

export function personLabel(person) {
  return String(person?.displayName || person?.email || 'Member').trim() || 'Member'
}

export function isDateId(value) {
  const match = DATE_ID.exec(String(value || '').trim())
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function assertReportFillDate(date, today = formatDateId(new Date())) {
  if (isDateId(date) && date > today) {
    throw new Error('You can only fill today or past days.')
  }
}

/** Collapse whitespace/newlines, then trim — empty after this means blank. */
export function cleanAnswerText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

/** HTML time inputs may include seconds. Store HH:mm. */
export function normalizeTime(value) {
  const match = cleanAnswerText(value).match(/^(\d{2}):(\d{2})/)
  if (!match) return ''
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return ''
  return `${match[1]}:${match[2]}`
}

export function formatReportTime(value) {
  const time = normalizeTime(value)
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

export function formatReportDate(dateId) {
  if (!isDateId(dateId)) return String(dateId || '')
  const [year, month, day] = dateId.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatLoggedAt(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function loggedByName(record) {
  return record?.updatedByName || record?.createdByName || 'Member'
}

export function normalizeDateRange(from, to) {
  const start = String(from || '').trim()
  const end = String(to || '').trim()
  if (!isDateId(start) || !isDateId(end)) {
    throw new Error('Choose a start date and an end date.')
  }
  const [rangeStart, rangeEnd] = start <= end ? [start, end] : [end, start]
  let days = 0
  let cursor = rangeStart
  while (cursor <= rangeEnd) {
    days += 1
    if (days > REPORT_RANGE_MAX_DAYS) {
      throw new Error('Choose a range of one year or less.')
    }
    cursor = addDaysToDateId(cursor, 1)
  }
  return { from: rangeStart, to: rangeEnd }
}

function byDisplayName(a, b) {
  return personLabel(a).localeCompare(personLabel(b))
}

/** Map legacy `unavailable` rows to absent + reason for the editor and PDF. */
export function coerceAttendanceStatus(row) {
  const status = String(row?.status || '').trim()
  if (status === REPORT_ATTENDANCE_STATUS.UNAVAILABLE) {
    return {
      ...row,
      status: REPORT_ATTENDANCE_STATUS.ABSENT,
      time: '',
      reason: String(row?.reason || '').trim() || REPORT_OUT_OF_CITY_REASON,
    }
  }
  return {
    ...row,
    status,
    time: row?.time || '',
    reason: row?.reason || '',
  }
}

export function formatAnswerLabel(row) {
  if (!row) return ''
  const type = row.answerType || REPORT_ANSWER_TYPE.ATTENDANCE
  if (type === REPORT_ANSWER_TYPE.NUMBER && row.numberValue != null && row.numberValue !== '') {
    const note = String(row.note || '').trim()
    return note ? `${row.numberValue} · ${note}` : String(row.numberValue)
  }
  if (type === REPORT_ANSWER_TYPE.YES_NO) {
    const label = row.status === REPORT_ATTENDANCE_STATUS.PRESENT
      ? 'Yes'
      : row.status === REPORT_ATTENDANCE_STATUS.ABSENT
        ? 'No'
        : ''
    const note = String(row.note || '').trim()
    if (!label) return ''
    return note ? `${label} · ${note}` : label
  }
  if (type === REPORT_ANSWER_TYPE.SINGLE || type === REPORT_ANSWER_TYPE.MULTI) {
    const picked = [
      ...(Array.isArray(row.selected) ? row.selected : []),
      String(row.customText || '').trim(),
    ].filter(Boolean)
    return picked.join(', ')
  }
  const coerced = coerceAttendanceStatus(row)
  if (coerced.status === REPORT_ATTENDANCE_STATUS.PRESENT) {
    return formatReportTime(coerced.time) ? `Yes · ${formatReportTime(coerced.time)}` : 'Yes'
  }
  if (coerced.status === REPORT_ATTENDANCE_STATUS.ABSENT) {
    return String(coerced.reason || '').trim() || 'No'
  }
  return ''
}

export function answerDotKind(answer) {
  if (!answer) return 'empty'
  const type = answer.answerType || REPORT_ANSWER_TYPE.ATTENDANCE
  if (type === REPORT_ANSWER_TYPE.NUMBER) {
    return answer.numberValue != null && answer.numberValue !== '' ? 'filled' : 'empty'
  }
  if (type === REPORT_ANSWER_TYPE.SINGLE || type === REPORT_ANSWER_TYPE.MULTI) {
    const picked = (answer.selected || []).length > 0 || String(answer.customText || '').trim()
    return picked ? 'filled' : 'empty'
  }
  if (type === REPORT_ANSWER_TYPE.YES_NO) {
    if (answer.status === REPORT_ATTENDANCE_STATUS.PRESENT) return 'filled'
    if (answer.status === REPORT_ATTENDANCE_STATUS.ABSENT) return 'no'
    return 'empty'
  }
  if (answer.status === REPORT_ATTENDANCE_STATUS.PRESENT) return 'filled'
  if (String(answer.reason || '').startsWith(REPORT_OUT_OF_CITY_REASON)) return 'away'
  if (answer.status === REPORT_ATTENDANCE_STATUS.ABSENT) return 'no'
  return 'empty'
}

export function attendanceStatusLabel(row) {
  return formatAnswerLabel(row)
}

/**
 * Saved rows omit unmarked people. The roster fills those back in as blank.
 * Legacy unavailable becomes Not present + reason.
 */
export function buildAttendanceEditorRows(event, roster) {
  const saved = new Map(
    (event?.attendance ?? []).map((row) => [row.userId, coerceAttendanceStatus(row)]),
  )
  const rosterIds = new Set((roster ?? []).map((person) => person.id))
  const rows = (roster ?? []).map((person) => {
    const savedRow = saved.get(person.id)
    return {
      userId: person.id,
      displayName: personLabel(person),
      status: savedRow?.status || '',
      time: savedRow?.time || '',
      reason: savedRow?.reason || '',
    }
  })

  for (const row of event?.attendance ?? []) {
    if (!row?.userId || rosterIds.has(row.userId)) continue
    const coerced = coerceAttendanceStatus(row)
    rows.push({
      userId: coerced.userId,
      displayName: coerced.displayName || 'Member',
      status: coerced.status || '',
      time: coerced.time || '',
      reason: coerced.reason || '',
    })
  }

  rows.sort(byDisplayName)
  return rows
}

export function splitAttendance(attendance, roster) {
  const present = []
  const absent = []
  const other = []
  const recorded = new Set()

  for (const row of attendance ?? []) {
    if (!row?.userId) continue
    const coerced = coerceAttendanceStatus(row)
    const choice = coerced.answerType === REPORT_ANSWER_TYPE.NUMBER
      || coerced.answerType === REPORT_ANSWER_TYPE.SINGLE
      || coerced.answerType === REPORT_ANSWER_TYPE.MULTI
    if (choice) {
      recorded.add(coerced.userId)
      other.push(coerced)
    } else if (coerced.status === REPORT_ATTENDANCE_STATUS.PRESENT) {
      recorded.add(coerced.userId)
      present.push(coerced)
    } else if (coerced.status === REPORT_ATTENDANCE_STATUS.ABSENT) {
      recorded.add(coerced.userId)
      absent.push(coerced)
    }
  }

  const notRecorded = (roster ?? [])
    .filter((person) => person?.id && !recorded.has(person.id))
    .map((person) => ({
      userId: person.id,
      displayName: personLabel(person),
    }))

  present.sort(byDisplayName)
  absent.sort(byDisplayName)
  other.sort(byDisplayName)
  notRecorded.sort(byDisplayName)

  return { present, absent, other, unavailable: [], notRecorded }
}

export function attendanceCounts(split) {
  return {
    present: split.present.length,
    absent: split.absent.length,
    unavailable: 0,
    notRecorded: split.notRecorded.length,
  }
}

export function compareEvents(a, b) {
  const byDate = String(a.date || '').localeCompare(String(b.date || ''))
  if (byDate) return byDate
  const byTime = String(a.time || '').localeCompare(String(b.time || ''))
  if (byTime) return byTime
  return String(a.title || '').localeCompare(String(b.title || ''))
}

export function compareNotes(a, b) {
  const byDate = String(a.date || '').localeCompare(String(b.date || ''))
  if (byDate) return byDate
  const byName = personLabel(a).localeCompare(personLabel(b))
  if (byName) return byName
  return String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
}

export function groupNotesByPerson(notes) {
  const groups = new Map()
  for (const note of [...(notes ?? [])].sort(compareNotes)) {
    const key = note.userId
    if (!groups.has(key)) {
      groups.set(key, {
        userId: key,
        displayName: note.displayName || 'Member',
        notes: [],
      })
    }
    groups.get(key).notes.push(note)
  }
  return [...groups.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  )
}

/** Days that have at least one event or note, oldest first. */
export function groupReportDays({ from, to, events, notes }) {
  const byDate = new Map()
  const bucket = (date) => {
    if (!byDate.has(date)) byDate.set(date, { date, events: [], notes: [] })
    return byDate.get(date)
  }

  for (const event of events ?? []) {
    if (!event?.date || event.date < from || event.date > to) continue
    bucket(event.date).events.push(event)
  }
  for (const note of notes ?? []) {
    if (!note?.date || note.date < from || note.date > to) continue
    bucket(note.date).notes.push(note)
  }

  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      ...day,
      events: [...day.events].sort(compareEvents),
      notes: [...day.notes].sort(compareNotes),
    }))
}

/** People who have attendance or notes in the range, for per-person PDF sections. */
export function groupReportByPerson({ from, to, events, notes, roster }) {
  const rosterNames = new Map(
    (roster ?? []).map((person) => [person.id, personLabel(person)]),
  )
  const byUser = new Map()

  const bucket = (userId, displayName) => {
    const key = String(userId || '').trim()
    if (!key) return null
    if (!byUser.has(key)) {
      byUser.set(key, {
        userId: key,
        displayName: rosterNames.get(key) || displayName || 'Member',
        attendance: [],
        notes: [],
      })
    }
    return byUser.get(key)
  }

  const sortedEvents = [...(events ?? [])]
    .filter((event) => event?.date && event.date >= from && event.date <= to)
    .sort(compareEvents)

  for (const event of sortedEvents) {
    for (const row of event.attendance ?? []) {
      const coerced = coerceAttendanceStatus(row)
      const typed = coerced.answerType && coerced.answerType !== REPORT_ANSWER_TYPE.ATTENDANCE
      const attendanceStatus = coerced.status === REPORT_ATTENDANCE_STATUS.PRESENT
        || coerced.status === REPORT_ATTENDANCE_STATUS.ABSENT
      if (!typed && !attendanceStatus) continue
      const group = bucket(coerced.userId, coerced.displayName)
      if (!group) continue
      group.attendance.push({
        date: event.date,
        eventTitle: event.title || 'Event',
        eventTime: event.time || '',
        ...coerced,
      })
    }
  }

  for (const note of [...(notes ?? [])].sort(compareNotes)) {
    if (!note?.date || note.date < from || note.date > to) continue
    const group = bucket(note.userId, note.displayName)
    if (!group) continue
    group.notes.push(note)
  }

  return [...byUser.values()]
    .filter((group) => group.attendance.length > 0 || group.notes.length > 0)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export function countLine(counts) {
  return `Yes ${counts.present} · No ${counts.absent} · Not recorded ${counts.notRecorded}`
}

const EVENT_TYPES = new Set(Object.values(REPORT_EVENT_TYPE))

/** Mon→Sun labels; value is JS getDay() (0=Sun … 6=Sat). */
export const REPORT_WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

export function weekdayOfDateId(dateId) {
  if (!isDateId(dateId)) return null
  const [year, month, day] = dateId.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

export function normalizeWeekdays(values, fallbackDateId = '') {
  const cleaned = [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
  )].sort((a, b) => a - b)
  if (cleaned.length > 0) return cleaned
  const fallback = weekdayOfDateId(fallbackDateId)
  return fallback == null ? [] : [fallback]
}

export function formatWeekdaysLabel(weekdays) {
  const set = new Set(weekdays || [])
  const labels = REPORT_WEEKDAY_OPTIONS
    .filter((item) => set.has(item.value))
    .map((item) => item.label)
  return labels.join(', ')
}

export function normalizeReportEvent(event) {
  const type = EVENT_TYPES.has(event?.type) ? event.type : REPORT_EVENT_TYPE.ONCE
  const startDate = isDateId(event?.startDate)
    ? event.startDate
    : isDateId(event?.date)
      ? event.date
      : ''
  const endDate = isDateId(event?.endDate) ? event.endDate : startDate
  const [rangeStart, rangeEnd] =
    startDate && endDate && startDate > endDate
      ? [endDate, startDate]
      : [startDate, endDate]
  return {
    ...event,
    type,
    startDate: rangeStart,
    endDate: rangeEnd,
    date: isDateId(event?.date) ? event.date : rangeStart,
    attendance: Array.isArray(event?.attendance) ? event.attendance : [],
    dates: Array.isArray(event?.dates) ? event.dates.filter((value) => isDateId(value)) : [],
    exceptionDates: Array.isArray(event?.exceptionDates)
      ? [...new Set(event.exceptionDates.filter((value) => isDateId(value)))].sort()
      : [],
    weekdays: type === REPORT_EVENT_TYPE.WEEKLY
      ? normalizeWeekdays(event?.weekdays, rangeStart)
      : [],
    requirePriorDays: clampRequirePriorDays(event?.requirePriorDays),
    answerType: Object.values(REPORT_ANSWER_TYPE).includes(event?.answerType)
      ? event.answerType
      : REPORT_ANSWER_TYPE.ATTENDANCE,
    options: Array.isArray(event?.options)
      ? event.options.map((value) => String(value || '').trim()).filter(Boolean)
      : [],
    allowCustom: Boolean(event?.allowCustom),
  }
}

export function isRecurringReportEvent(event) {
  const type = event?.type || REPORT_EVENT_TYPE.ONCE
  return (
    type === REPORT_EVENT_TYPE.DAILY
    || type === REPORT_EVENT_TYPE.WEEKLY
    || type === REPORT_EVENT_TYPE.MONTHLY
  )
}

export function isEventCancelledOn(event, dateId) {
  if (!isDateId(dateId) || !isRecurringReportEvent(event)) return false
  return (event?.exceptionDates || []).includes(dateId)
}

export const REQUIRE_PRIOR_DAYS_OPTIONS = [0, 1, 2, 3, 5, 7, 14, 30]

export function clampRequirePriorDays(value) {
  const days = Number(value)
  if (!Number.isFinite(days) || days <= 0) return 0
  return Math.min(30, Math.floor(days))
}

/** Largest grace window across events. 0 means meal voting is never locked. */
export function mealReportGraceDays(events) {
  let grace = 0
  for (const raw of events ?? []) {
    const item = normalizeReportEvent(raw)
    grace = Math.max(grace, clampRequirePriorDays(item.requirePriorDays))
  }
  return grace
}

/**
 * Unfilled reports older than the grace window.
 * Last N days before today do not block meals; everything before that does.
 */
export function findMealReportBlock({ events, responseMap, userId, today }) {
  const graceDays = mealReportGraceDays(events)
  if (!graceDays || !userId || !isDateId(today)) return null
  const cutoff = addDaysToDateId(today, -graceDays)
  const oldest = addDaysToDateId(cutoff, -1)
  if (!isDateId(oldest)) return null
  const missing = []
  for (const raw of events ?? []) {
    const item = normalizeReportEvent(raw)
    if (!item.startDate) continue
    for (const date of occurrenceDates(item, { to: oldest })) {
      if (answerFor(item.id, date, userId, responseMap)) continue
      missing.push({ event: item, date })
    }
  }
  if (missing.length === 0) return null
  missing.sort(
    (a, b) => b.date.localeCompare(a.date) || a.event.title.localeCompare(b.event.title),
  )
  return { graceDays, missing }
}

export function responseDocId(eventId, date, userId) {
  return `${eventId}_${date}_${userId}`
}

function monthId(year, month, day) {
  const last = new Date(year, month, 0).getDate()
  const clamped = Math.min(day, last)
  return `${year}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`
}

function clipToBounds(dates, bounds = {}) {
  const fromBound = isDateId(bounds.from) ? bounds.from : null
  const toBound = isDateId(bounds.to) ? bounds.to : null
  return dates.filter(
    (value) => (!fromBound || value >= fromBound) && (!toBound || value <= toBound),
  )
}

/** Schedule dates before exception cancellations. */
function scheduleDates(event, bounds = {}) {
  const normalized = event?.startDate ? event : normalizeReportEvent(event)
  const { startDate, endDate, type } = normalized
  if (!isDateId(startDate) || !isDateId(endDate)) return []

  if (type === REPORT_EVENT_TYPE.ONCE) {
    const all = [...new Set(
      [startDate, ...(Array.isArray(normalized.dates) ? normalized.dates : [])]
        .filter((value) => isDateId(value)),
    )].sort()
    return clipToBounds(all, bounds)
  }

  const from = isDateId(bounds.from) && bounds.from > startDate ? bounds.from : startDate
  const to = isDateId(bounds.to) && bounds.to < endDate ? bounds.to : endDate
  let base = []
  if (from <= to) {
    if (type === REPORT_EVENT_TYPE.DAILY) {
      let cursor = from
      while (cursor <= to) {
        base.push(cursor)
        cursor = addDaysToDateId(cursor, 1)
      }
    } else if (type === REPORT_EVENT_TYPE.WEEKLY) {
      const days = new Set(normalizeWeekdays(normalized.weekdays, startDate))
      if (days.size > 0) {
        let cursor = from
        while (cursor <= to) {
          if (days.has(weekdayOfDateId(cursor))) base.push(cursor)
          cursor = addDaysToDateId(cursor, 1)
        }
      }
    } else {
      const day = Number(startDate.slice(8, 10))
      let year = Number(from.slice(0, 4))
      let month = Number(from.slice(5, 7))
      const endYear = Number(to.slice(0, 4))
      const endMonth = Number(to.slice(5, 7))
      while (year < endYear || (year === endYear && month <= endMonth)) {
        const id = monthId(year, month, day)
        if (id >= startDate && id <= endDate && id >= from && id <= to) base.push(id)
        month += 1
        if (month > 12) {
          month = 1
          year += 1
        }
      }
    }
  }

  const extras = clipToBounds(
    (Array.isArray(normalized.dates) ? normalized.dates : []).filter((value) => isDateId(value)),
    bounds,
  )
  return [...new Set([...base, ...extras])].sort()
}

/** Dates this event occurs, optionally clipped to a window (skips cancelled days). */
export function occurrenceDates(event, bounds = {}) {
  const normalized = event?.startDate ? event : normalizeReportEvent(event)
  const cancelled = new Set(normalized.exceptionDates || [])
  return scheduleDates(normalized, bounds).filter((date) => !cancelled.has(date))
}

/** Cancelled recurrence days inside a window (admin restore list). */
export function cancelledOccurrenceDates(event, bounds = {}) {
  const normalized = event?.startDate ? event : normalizeReportEvent(event)
  if (!isRecurringReportEvent(normalized)) return []
  const cancelled = new Set(normalized.exceptionDates || [])
  if (cancelled.size === 0) return []
  return scheduleDates(normalized, bounds).filter((date) => cancelled.has(date))
}

export function indexResponses(events, responses) {
  const map = new Map()
  for (const response of responses ?? []) {
    if (!response?.eventId || !response?.date || !response?.userId) continue
    map.set(responseDocId(response.eventId, response.date, response.userId), {
      ...coerceAttendanceStatus(response),
      eventId: response.eventId,
      date: response.date,
      userId: response.userId,
      displayName: response.displayName || 'Member',
    })
  }
  for (const raw of events ?? []) {
    const event = normalizeReportEvent(raw)
    const date = event.date || event.startDate
    if (!isDateId(date)) continue
    for (const row of event.attendance) {
      if (!row?.userId || !row.status) continue
      const key = responseDocId(event.id, date, row.userId)
      if (map.has(key)) continue
      const coerced = coerceAttendanceStatus(row)
      map.set(key, {
        ...coerced,
        eventId: event.id,
        date,
        userId: row.userId,
        displayName: row.displayName || coerced.displayName || 'Member',
        legacy: true,
      })
    }
  }
  return map
}

export function answerFor(eventId, date, userId, responseMap) {
  return responseMap.get(responseDocId(eventId, date, userId)) || null
}

/**
 * Missing is every unanswered date before today.
 * Open is today's occurrences only — future dates are not fillable.
 */
export function buildReportBoard({ events, responseMap, userId, today }) {
  const missing = []
  const open = []
  const filled = []
  const normalized = (events ?? []).map(normalizeReportEvent).filter((event) => event.startDate)

  for (const event of normalized) {
    const dates = occurrenceDates(event)
    for (const date of dates) {
      const answer = userId ? answerFor(event.id, date, userId, responseMap) : null
      const row = { event, date, answer }
      if (date < today) {
        if (!answer) missing.push(row)
        else filled.push(row)
      } else if (date === today) {
        open.push(row)
      }
    }
  }

  missing.sort(
    (a, b) => b.date.localeCompare(a.date) || a.event.title.localeCompare(b.event.title),
  )
  filled.sort(
    (a, b) => b.date.localeCompare(a.date) || a.event.title.localeCompare(b.event.title),
  )
  open.sort(
    (a, b) => a.date.localeCompare(b.date) || a.event.title.localeCompare(b.event.title),
  )
  return { missing, open, filled: filled.slice(0, 20) }
}

export function buildDatedRows({ events, from, to }) {
  const rows = []
  for (const raw of events ?? []) {
    const event = normalizeReportEvent(raw)
    if (!event.startDate) continue
    for (const date of occurrenceDates(event, { from, to })) {
      rows.push({ event, date, answer: null })
    }
  }
  rows.sort(
    (a, b) => b.date.localeCompare(a.date) || a.event.title.localeCompare(b.event.title),
  )
  return rows
}

export function buildPdfModel({ events, responses, notes, from, to, userId }) {
  const responseMap = indexResponses(events, responses)
  const pdfEvents = []
  for (const raw of events ?? []) {
    const event = normalizeReportEvent(raw)
    for (const date of occurrenceDates(event, { from, to })) {
      const attendance = []
      if (userId) {
        const answer = answerFor(event.id, date, userId, responseMap)
        if (answer) attendance.push(answer)
      } else {
        for (const [key, answer] of responseMap) {
          if (!key.startsWith(`${event.id}_${date}_`)) continue
          attendance.push(answer)
        }
      }
      if (userId && attendance.length === 0) continue
      if (!userId && attendance.length === 0) {
        pdfEvents.push({ ...event, date, attendance: [] })
        continue
      }
      pdfEvents.push({ ...event, date, attendance })
    }
  }
  const pdfNotes = (notes ?? []).filter((note) => {
    if (!note?.date || note.date < from || note.date > to) return false
    if (userId && note.createdBy !== userId) return false
    return true
  })
  return { events: pdfEvents, notes: pdfNotes }
}

export { REPORT_OUT_OF_CITY_REASON }
