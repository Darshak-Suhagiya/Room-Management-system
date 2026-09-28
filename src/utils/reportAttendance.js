import {
  REPORT_ATTENDANCE_STATUS,
  REPORT_OUT_OF_CITY_REASON,
} from '../config/constants'
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

/** HTML time inputs may include seconds. Store HH:mm. */
export function normalizeTime(value) {
  const match = String(value || '').trim().match(/^(\d{2}):(\d{2})/)
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

export function attendanceStatusLabel(row) {
  const coerced = coerceAttendanceStatus(row)
  if (coerced.status === REPORT_ATTENDANCE_STATUS.PRESENT) return 'Present'
  if (coerced.status === REPORT_ATTENDANCE_STATUS.ABSENT) {
    return String(coerced.reason || '').trim() || 'Not present'
  }
  return ''
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
  const recorded = new Set()

  for (const row of attendance ?? []) {
    if (!row?.userId) continue
    const coerced = coerceAttendanceStatus(row)
    if (coerced.status === REPORT_ATTENDANCE_STATUS.PRESENT) {
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
  notRecorded.sort(byDisplayName)

  return { present, absent, unavailable: [], notRecorded }
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
      if (
        coerced.status !== REPORT_ATTENDANCE_STATUS.PRESENT &&
        coerced.status !== REPORT_ATTENDANCE_STATUS.ABSENT
      ) {
        continue
      }
      const group = bucket(coerced.userId, coerced.displayName)
      if (!group) continue
      group.attendance.push({
        date: event.date,
        eventTitle: event.title || 'Event',
        eventTime: event.time || '',
        status: coerced.status,
        time: coerced.time || '',
        reason: coerced.reason || '',
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
  return `Present ${counts.present} · Not present ${counts.absent} · Not recorded ${counts.notRecorded}`
}

export { REPORT_OUT_OF_CITY_REASON }
