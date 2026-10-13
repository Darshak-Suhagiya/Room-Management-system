import { REPORT_ANSWER_TYPE, REPORT_ATTENDANCE_STATUS } from '../../config/constants'
import { addDaysToDateId } from '../../utils/menuReviewUtils'
import {
  answerDotKind,
  answerFor,
  formatAnswerLabel,
  formatReportTime,
  occurrenceDates,
  REPORT_OUT_OF_CITY_REASON,
} from '../../utils/reportAttendance'

/** Monday of the week that contains dateId (Mon–Sun). */
export function weekStartMonday(dateId) {
  const [year, month, day] = dateId.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = date.getDay()
  const offset = weekday === 0 ? 6 : weekday - 1
  date.setDate(date.getDate() - offset)
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  const nextDay = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`
}

function shortDate(dateId) {
  const [year, month, day] = dateId.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

export const MAX_ANALYTICS_RANGE_DAYS = 90

/** Default analytics range: Mon–Sun of the week containing today. */
export function defaultAnalyticsRange(today) {
  const from = weekStartMonday(today)
  return { from, to: addDaysToDateId(from, 6) }
}

export function rangeSpanDays(from, to) {
  const a = String(from).split('-').map(Number)
  const b = String(to).split('-').map(Number)
  const start = new Date(a[0], a[1] - 1, a[2])
  const end = new Date(b[0], b[1] - 1, b[2])
  return Math.round((end - start) / 86400000) + 1
}

export function rangeLabel(from, to) {
  const end = to || from
  const start = from
  if (!start) return ''
  if (start === end) return `${shortDate(start)} ${start.slice(0, 4)}`
  return `${shortDate(start)} – ${shortDate(end)} ${end.slice(0, 4)}`
}

export function weekLabel(start) {
  return rangeLabel(start, addDaysToDateId(start, 6))
}

export function rangeDays(from, to) {
  const out = []
  if (!from || !to) return out
  let cursor = from
  const end = to >= from ? to : from
  const start = to >= from ? from : to
  cursor = start
  while (cursor <= end) {
    out.push(cursor)
    cursor = addDaysToDateId(cursor, 1)
  }
  return out
}

export function shiftAnalyticsRange(range, deltaDays) {
  return {
    from: addDaysToDateId(range.from, deltaDays),
    to: addDaysToDateId(range.to, deltaDays),
  }
}

export function weekdayShort(dateId) {
  const [year, month, day] = dateId.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { weekday: 'short' })
}

export function weekDays(start) {
  return rangeDays(start, addDaysToDateId(start, 6))
}

function formatAverage(sum, count) {
  if (!count) return null
  const value = sum / count
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function initialOf(name) {
  const letter = String(name || '').trim().charAt(0)
  return letter ? letter.toUpperCase() : '?'
}

export function summarize(type, group) {
  if (type === REPORT_ANSWER_TYPE.NUMBER) {
    let filled = 0
    let empty = 0
    let sum = 0
    for (const row of group) {
      if (answerDotKind(row.answer) !== 'filled') {
        empty += 1
        continue
      }
      filled += 1
      sum += Number(row.answer.numberValue)
    }
    const average = formatAverage(sum, filled)
    return [
      { label: 'Filled', value: filled, tone: 'yes' },
      { label: 'Not filled', value: empty, tone: 'empty' },
      ...(average == null ? [] : [{ label: 'Average', value: average, skipBar: true }]),
    ]
  }

  if (type === REPORT_ANSWER_TYPE.SINGLE || type === REPORT_ANSWER_TYPE.MULTI) {
    const optionCounts = new Map()
    for (const row of group) {
      for (const option of row.event.options || []) {
        if (!optionCounts.has(option)) optionCounts.set(option, 0)
      }
    }
    let written = 0
    let empty = 0
    for (const row of group) {
      if (answerDotKind(row.answer) === 'empty') {
        empty += 1
        continue
      }
      for (const option of row.answer.selected || []) {
        const label = String(option || '').trim()
        if (!label) continue
        optionCounts.set(label, (optionCounts.get(label) || 0) + 1)
      }
      if (String(row.answer.customText || '').trim()) written += 1
    }
    const optionTones = ['yes', 'no', 'alt', 'away']
    return [
      ...[...optionCounts.entries()].map(([label, value], index) => ({
        label,
        value,
        tone: optionTones[index % optionTones.length],
      })),
      { label: 'Written', value: written, tone: 'away' },
      { label: 'Not filled', value: empty, tone: 'empty' },
    ]
  }

  let yes = 0
  let no = 0
  let away = 0
  let empty = 0
  for (const row of group) {
    const kind = answerDotKind(row.answer)
    if (kind === 'filled') yes += 1
    else if (kind === 'away') away += 1
    else if (kind === 'no') no += 1
    else empty += 1
  }
  const chips = [
    { label: 'Yes', value: yes, tone: 'yes' },
    { label: 'No', value: no, tone: 'no' },
  ]
  if (type === REPORT_ANSWER_TYPE.ATTENDANCE) {
    chips.push({ label: 'Out of city', value: away, tone: 'away' })
  }
  chips.push({ label: 'Not filled', value: empty, tone: 'empty' })
  return chips
}

function shortLabel(row) {
  const type = row.event.answerType || REPORT_ANSWER_TYPE.ATTENDANCE
  if (!row.filled) return 'Not filled'
  if (type === REPORT_ANSWER_TYPE.NUMBER) return String(row.answer.numberValue)
  if (type === REPORT_ANSWER_TYPE.SINGLE || type === REPORT_ANSWER_TYPE.MULTI) {
    const picked = (row.answer.selected || []).find((value) => String(value || '').trim())
    return picked || 'Written'
  }
  if (row.tone === 'away') return 'Out'
  if (row.tone === 'no') return 'No'
  return 'Yes'
}

/** Extra fields shown when a date cell is opened in analytics. */
export function answerDetailFields(row) {
  const answer = row?.answer
  const type = row?.event?.answerType || answer?.answerType || REPORT_ANSWER_TYPE.ATTENDANCE
  if (!answer) {
    return {
      status: 'Not filled yet',
      fields: [],
    }
  }

  const fields = []
  const status = formatAnswerLabel(answer) || shortLabel(row)

  if (type === REPORT_ANSWER_TYPE.ATTENDANCE) {
    if (answer.status === REPORT_ATTENDANCE_STATUS.PRESENT) {
      const time = formatReportTime(answer.time)
      if (time) fields.push({ label: 'Arrival time', value: time })
    }
    if (answer.status === REPORT_ATTENDANCE_STATUS.ABSENT) {
      const reason = String(answer.reason || '').trim()
      if (reason) {
        if (reason.startsWith(REPORT_OUT_OF_CITY_REASON)) {
          fields.push({ label: 'Reason', value: REPORT_OUT_OF_CITY_REASON })
          const extra = reason.slice(REPORT_OUT_OF_CITY_REASON.length).replace(/^[\s—-]+/, '').trim()
          if (extra) fields.push({ label: 'Detail', value: extra })
        } else {
          fields.push({ label: 'Reason', value: reason })
        }
      }
    }
  }

  if (type === REPORT_ANSWER_TYPE.YES_NO || type === REPORT_ANSWER_TYPE.NUMBER) {
    const note = String(answer.note || '').trim()
    if (note) fields.push({ label: 'Note', value: note })
  }

  if (type === REPORT_ANSWER_TYPE.SINGLE || type === REPORT_ANSWER_TYPE.MULTI) {
    const selected = (Array.isArray(answer.selected) ? answer.selected : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean)
    if (selected.length) fields.push({ label: selected.length === 1 ? 'Choice' : 'Choices', value: selected.join(', ') })
    const custom = String(answer.customText || '').trim()
    if (custom) fields.push({ label: 'Written answer', value: custom })
  }

  return { status, fields }
}

function rowFrom(event, date, person, responseMap) {
  const answer = answerFor(event.id, date, person.id, responseMap)
  const kind = answerDotKind(answer)
  return {
    event,
    date,
    person,
    answer,
    filled: kind !== 'empty',
    tone: kind === 'filled' ? 'yes' : kind,
    label: shortLabel({
      event,
      answer,
      filled: kind !== 'empty',
      tone: kind === 'filled' ? 'yes' : kind,
    }),
  }
}

export function rowsForWeek(group, start, end, people, responseMap) {
  const byCell = new Map()
  for (const event of group.events) {
    for (const date of occurrenceDates(event, { from: start, to: end })) {
      for (const person of people) {
        if (!person?.id) continue
        const row = rowFrom(event, date, person, responseMap)
        const cell = `${person.id}_${date}`
        const existing = byCell.get(cell)
        if (!existing || (row.filled && !existing.filled)) byCell.set(cell, row)
      }
    }
  }
  return [...byCell.values()]
}
