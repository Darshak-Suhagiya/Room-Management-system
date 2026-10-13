import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { REPORT_ANSWER_TYPE, REPORT_ATTENDANCE_STATUS } from '../../config/constants'
import { cleanAnswerText, REPORT_OUT_OF_CITY_REASON } from '../../utils/reportAttendance'

const DETAIL_PREFIX = `${REPORT_OUT_OF_CITY_REASON} — `

function splitReason(reason) {
  const text = String(reason || '')
  if (text === REPORT_OUT_OF_CITY_REASON) return { outOfCity: true, detail: '' }
  if (text.startsWith(DETAIL_PREFIX)) {
    return { outOfCity: true, detail: text.slice(DETAIL_PREFIX.length) }
  }
  return { outOfCity: false, detail: text }
}

function joinReason(outOfCity, detail) {
  const extra = cleanAnswerText(detail)
  if (outOfCity && extra) return `${REPORT_OUT_OF_CITY_REASON} — ${extra}`
  if (outOfCity) return REPORT_OUT_OF_CITY_REASON
  return extra
}

function answerTypeOf(event) {
  return event?.answerType || REPORT_ANSWER_TYPE.ATTENDANCE
}

export function InlineReportAnswer({
  event,
  answer,
  saving,
  onSave,
  onClear,
}) {
  const type = answerTypeOf(event)
  const initial = splitReason(answer?.reason)
  const [choice, setChoice] = useState(
    answer?.status === REPORT_ATTENDANCE_STATUS.ABSENT
      ? 'no'
      : answer?.status === REPORT_ATTENDANCE_STATUS.PRESENT
        ? 'yes'
        : '',
  )
  const [time, setTime] = useState(answer?.time || '')
  const [outOfCity, setOutOfCity] = useState(initial.outOfCity)
  const [detail, setDetail] = useState(initial.detail)
  const [numberValue, setNumberValue] = useState(
    answer?.numberValue == null ? '' : String(answer.numberValue),
  )
  const [note, setNote] = useState(answer?.note || '')
  const [selected, setSelected] = useState(Array.isArray(answer?.selected) ? answer.selected : [])
  const [customText, setCustomText] = useState(answer?.customText || '')
  const [error, setError] = useState('')
  const options = Array.isArray(event?.options) ? event.options : []

  const save = async () => {
    setError('')
    try {
      if (type === REPORT_ANSWER_TYPE.NUMBER) {
        await onSave({ numberValue, note: cleanAnswerText(note) })
        return
      }
      if (type === REPORT_ANSWER_TYPE.YES_NO) {
        if (!choice) return
        const cleanedNote = cleanAnswerText(note)
        if (choice === 'no' && !cleanedNote) {
          setError('Enter a reason.')
          return
        }
        await onSave({
          status: choice === 'yes' ? REPORT_ATTENDANCE_STATUS.PRESENT : REPORT_ATTENDANCE_STATUS.ABSENT,
          note: cleanedNote,
        })
        return
      }
      if (type === REPORT_ANSWER_TYPE.SINGLE || type === REPORT_ANSWER_TYPE.MULTI) {
        const cleanedCustom = cleanAnswerText(customText)
        if (selected.length === 0 && !cleanedCustom) {
          setError('Choose an answer.')
          return
        }
        await onSave({ selected, customText: cleanedCustom })
        return
      }
      if (!choice) return
      if (choice === 'yes' && !cleanAnswerText(time)) {
        setError('Enter your arrival time.')
        return
      }
      const reason = choice === 'no' ? joinReason(outOfCity, detail) : ''
      if (choice === 'no' && !cleanAnswerText(reason)) {
        setError('Enter a reason.')
        return
      }
      await onSave({
        status: choice === 'yes' ? REPORT_ATTENDANCE_STATUS.PRESENT : REPORT_ATTENDANCE_STATUS.ABSENT,
        time: choice === 'yes' ? time : '',
        reason,
      })
    } catch (err) {
      setError(err.message || 'Could not save your report.')
    }
  }

  const toggleOption = (option) => {
    setSelected((current) => {
      if (type === REPORT_ANSWER_TYPE.SINGLE) return [option]
      return current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
    })
  }

  const showSave = type === REPORT_ANSWER_TYPE.NUMBER
    || type === REPORT_ANSWER_TYPE.SINGLE
    || type === REPORT_ANSWER_TYPE.MULTI
    || Boolean(choice)

  return (
    <div className="reports-inline">
      {error ? <p className="form-error">{error}</p> : null}
      {type === REPORT_ANSWER_TYPE.NUMBER ? (
        <>
          <label className="field-stack">
            <span className="field-stack-label">Number</span>
            <input
              type="number"
              className="app-input"
              value={numberValue}
              onChange={(input) => setNumberValue(input.target.value)}
            />
          </label>
          <label className="field-stack">
            <span className="field-stack-label">Note (optional)</span>
            <input
              className="app-input"
              value={note}
              maxLength={500}
              onChange={(input) => setNote(input.target.value)}
            />
          </label>
        </>
      ) : null}
      {type === REPORT_ANSWER_TYPE.SINGLE || type === REPORT_ANSWER_TYPE.MULTI ? (
        <>
          <div className="reports-choice-list" role="group" aria-label="Choices">
            {options.map((option) => {
              const active = selected.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  className={`reports-choice${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleOption(option)}
                >
                  {option}
                </button>
              )
            })}
          </div>
          {event?.allowCustom ? (
            <label className="field-stack">
              <span className="field-stack-label">Written answer (optional)</span>
              <input
                className="app-input"
                value={customText}
                maxLength={200}
                onChange={(input) => setCustomText(input.target.value)}
              />
            </label>
          ) : null}
        </>
      ) : null}
      {type === REPORT_ANSWER_TYPE.ATTENDANCE || type === REPORT_ANSWER_TYPE.YES_NO ? (
        <div className="reports-yesno">
          <button
            type="button"
            className={`reports-yesno-btn is-yes${choice === 'yes' ? ' is-active' : ''}`}
            aria-pressed={choice === 'yes'}
            onClick={() => setChoice('yes')}
          >
            <Check size={16} aria-hidden />
            <span>
              <strong>Yes</strong>
              <small>{type === REPORT_ANSWER_TYPE.ATTENDANCE ? 'I was there' : 'Yes'}</small>
            </span>
          </button>
          <button
            type="button"
            className={`reports-yesno-btn is-no${choice === 'no' ? ' is-active' : ''}`}
            aria-pressed={choice === 'no'}
            onClick={() => setChoice('no')}
          >
            <X size={16} aria-hidden />
            <span>
              <strong>No</strong>
              <small>{type === REPORT_ANSWER_TYPE.ATTENDANCE ? 'I was not there' : 'No'}</small>
            </span>
          </button>
        </div>
      ) : null}
      {type === REPORT_ANSWER_TYPE.ATTENDANCE && choice === 'yes' ? (
        <label className="field-stack">
          <span className="field-stack-label">Your arrival time</span>
          <input
            type="time"
            className="app-input"
            value={time}
            onChange={(input) => setTime(input.target.value)}
          />
        </label>
      ) : null}
      {type === REPORT_ANSWER_TYPE.ATTENDANCE && choice === 'no' ? (
        <div className="reports-inline-no">
          <button
            type="button"
            className={`btn btn-sm ${outOfCity ? 'btn-primary' : 'btn-secondary'}`}
            aria-pressed={outOfCity}
            onClick={() => setOutOfCity((value) => !value)}
          >
            Out of city
          </button>
          <input
            className="app-input"
            value={detail}
            maxLength={80}
            placeholder="Reason"
            aria-label="Reason"
            required={!outOfCity}
            onChange={(input) => setDetail(input.target.value)}
          />
        </div>
      ) : null}
      {type === REPORT_ANSWER_TYPE.YES_NO && choice === 'yes' ? (
        <label className="field-stack">
          <span className="field-stack-label">Note (optional)</span>
          <input
            className="app-input"
            value={note}
            maxLength={500}
            onChange={(input) => setNote(input.target.value)}
          />
        </label>
      ) : null}
      {type === REPORT_ANSWER_TYPE.YES_NO && choice === 'no' ? (
        <label className="field-stack">
          <span className="field-stack-label">Reason</span>
          <input
            className="app-input"
            value={note}
            maxLength={500}
            placeholder="Reason"
            required
            onChange={(input) => setNote(input.target.value)}
          />
        </label>
      ) : null}
      {showSave ? (
        <div className="reports-card-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {answer && !answer.legacy && onClear ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClear} disabled={saving}>
              Clear answer
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
