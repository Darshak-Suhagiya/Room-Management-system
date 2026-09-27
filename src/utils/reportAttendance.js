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

/**
 * Purpose: Build the editor rows for one event.
 * Why: Saved rows omit unmarked people. The roster fills those back in as blank.
 */
export function buildAttendanceEditorRows(event, roster) {
  const saved = new Map(
    (event?.attendance ?? []).map((row) => [row.userId, row]),
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
    rows.push({
      userId: row.userId,
      displayName: row.displayName || 'Member',
      status: row.status || '',
      time: row.time || '',
      reason: row.reason || '',
    })
  }

  rows.sort(byDisplayName)
  return rows
}

export function splitAttendance(attendance, roster) {
  const present = []
  const absent = []
  const unavailable = []
  const recorded = new Set()

  for (const row of attendance ?? []) {
    if (!row?.userId) continue
    if (row.status === REPORT_ATTENDANCE_STATUS.PRESENT) {
      recorded.add(row.userId)
      present.push(row)
    } else if (row.status === REPORT_ATTENDANCE_STATUS.ABSENT) {
      recorded.add(row.userId)
      absent.push(row)
    } else if (row.status === REPORT_ATTENDANCE_STATUS.UNAVAILABLE) {
      recorded.add(row.userId)
      unavailable.push(row)
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
  unavailable.sort(byDisplayName)
  notRecorded.sort(byDisplayName)

  return { present, absent, unavailable, notRecorded }
}

export function attendanceCounts(split) {
  return {
    present: split.present.length,
    absent: split.absent.length,
    unavailable: split.unavailable.length,
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

export function countLine(counts) {
  return `Present ${counts.present} · Not present ${counts.absent} · Not available ${counts.unavailable} · Not recorded ${counts.notRecorded}`
}

export { REPORT_OUT_OF_CITY_REASON }
