import { Calendar, Check, ChevronRight, Clock, StickyNote, X } from 'lucide-react'
import { REPORT_ANSWER_TYPE, REPORT_ATTENDANCE_STATUS, REPORT_EVENT_TYPE_LABELS } from '../../config/constants'
import {
  answerFor,
  formatAnswerLabel,
  formatReportDate,
  formatReportTime,
  personLabel,
  REPORT_OUT_OF_CITY_REASON,
} from '../../utils/reportAttendance'
import { InlineReportAnswer } from './InlineReportAnswer'

function answerTypeOf(answer, event) {
  return answer?.answerType || event?.answerType || REPORT_ANSWER_TYPE.ATTENDANCE
}

function noDetail(answer) {
  const reason = String(answer?.reason || answer?.note || '').trim()
  if (!reason) return ''
  if (reason.startsWith(REPORT_OUT_OF_CITY_REASON)) return REPORT_OUT_OF_CITY_REASON
  return reason
}

function StatusChip({ answer, event, filled, total }) {
  if (filled != null) {
    const done = total > 0 && filled === total
    return (
      <span className={`reports-status${done ? ' is-yes' : ' is-empty'}`}>
        <span>{filled} of {total} filled</span>
      </span>
    )
  }
  if (!answer) {
    return (
      <span className="reports-status is-empty">
        <span>Not filled yet</span>
      </span>
    )
  }

  const type = answerTypeOf(answer, event)
  if (type === REPORT_ANSWER_TYPE.NUMBER || type === REPORT_ANSWER_TYPE.SINGLE || type === REPORT_ANSWER_TYPE.MULTI) {
    const label = formatAnswerLabel(answer)
    if (!label) {
      return (
        <span className="reports-status is-empty">
          <span>Not filled yet</span>
        </span>
      )
    }
    return (
      <span className="reports-status is-yes">
        <Check size={14} aria-hidden />
        <span>{label}</span>
      </span>
    )
  }

  const present = answer.status === REPORT_ATTENDANCE_STATUS.PRESENT
  if (present) {
    const time = type === REPORT_ANSWER_TYPE.ATTENDANCE ? formatReportTime(answer.time) : ''
    const note = type === REPORT_ANSWER_TYPE.YES_NO ? String(answer.note || '').trim() : ''
    return (
      <span className="reports-status is-yes">
        <Check size={14} aria-hidden />
        <span>
          <strong>Yes</strong>
          {time ? <small>arrived {time}</small> : null}
          {!time && note ? <small>{note}</small> : null}
        </span>
      </span>
    )
  }

  if (answer.status === REPORT_ATTENDANCE_STATUS.ABSENT) {
    const detail = noDetail(answer)
    return (
      <span className="reports-status is-no">
        <X size={14} aria-hidden />
        <span>
          <strong>No</strong>
          {detail ? <small>{detail}</small> : null}
        </span>
      </span>
    )
  }

  return (
    <span className="reports-status is-empty">
      <span>Not filled yet</span>
    </span>
  )
}

function RowMeta({ row }) {
  const time = formatReportTime(row.event.time)
  const note = String(row.event.note || '').trim()
  return (
    <span className="reports-row-meta">
      <span>{formatReportDate(row.date)}</span>
      {time ? (
        <span>
          <Clock size={13} aria-hidden /> Event time {time}
        </span>
      ) : null}
      <span className="reports-type-pill">{REPORT_EVENT_TYPE_LABELS[row.event.type] || 'Once'}</span>
      {note ? (
        <span>
          <StickyNote size={13} aria-hidden /> {note}
        </span>
      ) : null}
    </span>
  )
}

function fillCounts(row, roster, responseMap) {
  let filled = 0
  for (const person of roster) {
    if (answerFor(row.event.id, row.date, person.id, responseMap)) filled += 1
  }
  return { filled, total: roster.length }
}

export function ReportEventRow({
  row,
  expanded,
  onToggle,
  showStatus,
  everyone,
  roster,
  responseMap,
  isAdmin,
  onFillPerson,
  saving,
  onSave,
  onClear,
}) {
  const counts = everyone ? fillCounts(row, roster, responseMap) : null
  const showChip = Boolean(everyone || showStatus || row.answer)
  const people = everyone
    ? roster.map((person) => ({
        person,
        answer: answerFor(row.event.id, row.date, person.id, responseMap),
      }))
    : []

  return (
    <article
      className={`reports-row${expanded ? ' is-open' : ''}`}
      id={`report-row-${row.event.id}_${row.date}`}
    >
      <button
        type="button"
        className="reports-row-hit"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="reports-row-icon" aria-hidden>
          <Calendar size={16} />
        </span>
        <span className="reports-row-copy">
          <strong>{row.event.title}</strong>
          <RowMeta row={row} />
        </span>
        <span className="reports-row-end">
          {showChip ? (
            <StatusChip
              answer={everyone ? null : row.answer}
              event={row.event}
              filled={counts?.filled}
              total={counts?.total}
            />
          ) : null}
          <ChevronRight size={18} className="reports-row-chevron" aria-hidden />
        </span>
      </button>
      {expanded && everyone ? (
        <ul className="reports-everyone-list">
          {people.map(({ person, answer }) => {
            const label = formatAnswerLabel(answer) || 'Not filled yet'
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
      ) : null}
      {expanded && !everyone ? (
        <InlineReportAnswer
          key={`${row.event.id}-${row.date}-${row.answer?.updatedAt || ''}`}
          answer={row.answer}
          event={row.event}
          saving={saving}
          onSave={onSave}
          onClear={row.answer && !row.answer.legacy ? onClear : null}
        />
      ) : null}
    </article>
  )
}
