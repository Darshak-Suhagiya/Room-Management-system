import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { REPORT_ANSWER_TYPE, REPORT_ANSWER_TYPE_LABELS, REPORT_EVENT_TYPE, REPORT_EVENT_TYPE_LABELS } from '../../config/constants'
import { formatDateId } from '../../utils/mealDateUtils'
import {
  cleanAnswerText,
  normalizeWeekdays,
  occurrenceDates,
  REPORT_WEEKDAY_OPTIONS,
  REQUIRE_PRIOR_DAYS_OPTIONS,
  weekdayOfDateId,
} from '../../utils/reportAttendance'

const TYPE_OPTIONS = [
  REPORT_EVENT_TYPE.ONCE,
  REPORT_EVENT_TYPE.DAILY,
  REPORT_EVENT_TYPE.WEEKLY,
  REPORT_EVENT_TYPE.MONTHLY,
]

function createDraft(event, today) {
  const type = event?.type || REPORT_EVENT_TYPE.ONCE
  const start = event?.startDate || event?.date || today
  const end = event?.endDate || start
  return {
    id: event?.id || null,
    type,
    title: event?.title || '',
    time: event?.time || '',
    startDate: start,
    endDate: type === REPORT_EVENT_TYPE.ONCE ? start : end,
    note: event?.note || '',
    answerType: event?.answerType || REPORT_ANSWER_TYPE.ATTENDANCE,
    options: Array.isArray(event?.options) && event.options.length ? [...event.options] : ['', ''],
    allowCustom: Boolean(event?.allowCustom),
    requirePriorDays: Number(event?.requirePriorDays) > 0 ? Number(event.requirePriorDays) : 0,
    weekdays: type === REPORT_EVENT_TYPE.WEEKLY
      ? normalizeWeekdays(event?.weekdays, start)
      : [],
  }
}

export function ReportEventForm({ open, onClose, event, events = [], saving, onSave }) {
  const today = formatDateId(new Date())
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Edit event' : 'New event'}
      subtitle="Once, daily, weekly, or monthly. Members fill their own attendance."
      busy={saving}
      artKey="reports"
      className="reports-sheet"
    >
      {open ? (
        <EventFields
          key={event?.id || 'new-event'}
          event={event}
          events={events}
          today={today}
          saving={saving}
          onClose={onClose}
          onSave={onSave}
        />
      ) : null}
    </Modal>
  )
}

function EventFields({ event, events, today, saving, onClose, onSave }) {
  const [draft, setDraft] = useState(() => createDraft(event, today))
  const [formError, setFormError] = useState('')
  const once = draft.type === REPORT_EVENT_TYPE.ONCE
  const weekly = draft.type === REPORT_EVENT_TYPE.WEEKLY
  const sameTypeEvents = events.filter(
    (item) => (item.type || REPORT_EVENT_TYPE.ONCE) === draft.type,
  )
  const nameKey = draft.title.trim().toLowerCase()
  const matches = !event && nameKey
    ? sameTypeEvents.filter((item) => item.title.trim().toLowerCase() === nameKey)
    : []
  const matched = matches[0] || null
  const showNamePicks = !event && sameTypeEvents.length > 0

  const submit = async (formEvent) => {
    formEvent.preventDefault()
    setFormError('')
    try {
      if (!matched && !event) {
        const kind = draft.answerType
        if (
          (kind === REPORT_ANSWER_TYPE.SINGLE || kind === REPORT_ANSWER_TYPE.MULTI)
          && draft.options.map((value) => cleanAnswerText(value)).filter(Boolean).length < 2
        ) {
          setFormError('Add at least two choices.')
          return
        }
      }
      if (!matched && weekly && draft.weekdays.length === 0) {
        setFormError('Choose at least one weekday.')
        return
      }
      if (matched) {
        const addDate = draft.startDate
        if (!addDate) {
          setFormError('Choose a date.')
          return
        }
        const known = new Set([
          ...(Array.isArray(matched.dates) ? matched.dates : []),
          ...(once
            ? [matched.startDate, matched.date]
            : []),
        ].filter(Boolean))
        if (once) {
          if (known.has(addDate)) {
            setFormError('That date is already on this event.')
            return
          }
          const ownDates = [
            matched.startDate,
            matched.date,
            ...(Array.isArray(matched.dates) ? matched.dates : []),
            addDate,
          ].filter(Boolean)
          await onSave({
            id: matched.id,
            type: REPORT_EVENT_TYPE.ONCE,
            title: matched.title,
            time: draft.time || matched.time,
            startDate: matched.startDate || matched.date,
            endDate: matched.startDate || matched.date,
            date: matched.date || matched.startDate,
            note: draft.note || matched.note || '',
            dates: [...new Set(ownDates)].sort(),
            exceptionDates: matched.exceptionDates || [],
            weekdays: [],
            requirePriorDays: matched.requirePriorDays || 0,
            answerType: matched.answerType,
            options: matched.options,
            allowCustom: matched.allowCustom,
          })
          return
        }
        if (occurrenceDates(matched).includes(addDate) || known.has(addDate)) {
          setFormError('That date is already on this event.')
          return
        }
        const nextStart = matched.startDate <= addDate ? matched.startDate : addDate
        const nextEnd = matched.endDate >= addDate ? matched.endDate : addDate
        const afterExtend = occurrenceDates({
          ...matched,
          startDate: nextStart,
          endDate: nextEnd,
        }).includes(addDate)
        const nextDates = afterExtend
          ? [...(matched.dates || [])]
          : [...new Set([...(matched.dates || []), addDate])].sort()
        await onSave({
          id: matched.id,
          type: matched.type,
          title: matched.title,
          time: draft.time || matched.time,
          startDate: nextStart,
          endDate: nextEnd,
          date: matched.date || matched.startDate,
          note: draft.note || matched.note || '',
          dates: nextDates,
          exceptionDates: matched.exceptionDates || [],
          weekdays: matched.weekdays || [],
          requirePriorDays: matched.requirePriorDays || 0,
          answerType: matched.answerType,
          options: matched.options,
          allowCustom: matched.allowCustom,
        })
        return
      }
      const keptDates = once
        ? (event
          ? [event.startDate, event.date, ...(Array.isArray(event.dates) ? event.dates : []), draft.startDate]
          : [draft.startDate])
        : (event?.dates || [])
      await onSave({
        id: draft.id,
        type: draft.type,
        title: draft.title,
        time: draft.time,
        startDate: draft.startDate,
        endDate: once ? draft.startDate : draft.endDate,
        date: draft.startDate,
        note: draft.note,
        dates: once ? [...new Set(keptDates.filter(Boolean))].sort() : keptDates,
        exceptionDates: event?.exceptionDates || [],
        weekdays: weekly ? draft.weekdays : [],
        requirePriorDays: draft.requirePriorDays,
        answerType: event ? event.answerType : draft.answerType,
        options: draft.options,
        allowCustom: draft.allowCustom,
      })
    } catch (err) {
      setFormError(err.message || 'Could not save the event.')
    }
  }

  return (
    <form className="reports-form" onSubmit={submit}>
      {formError ? <p className="form-error">{formError}</p> : null}
      <div className="field-stack">
        <span className="field-stack-label">Repeats</span>
        <div className="mobile-segmented reports-repeat" role="group" aria-label="Event type">
          {TYPE_OPTIONS.map((type) => {
            const active = draft.type === type
            return (
              <button
                key={type}
                type="button"
                className={`mobile-segmented-btn${active ? ' is-active' : ''}`}
                aria-pressed={active}
                onClick={() =>
                  setDraft((current) => {
                    const next = {
                      ...current,
                      type,
                      endDate: type === REPORT_EVENT_TYPE.ONCE ? current.startDate : current.endDate,
                    }
                    if (type === REPORT_EVENT_TYPE.WEEKLY) {
                      next.weekdays = current.weekdays.length
                        ? current.weekdays
                        : normalizeWeekdays([], current.startDate)
                    } else {
                      next.weekdays = []
                    }
                    return next
                  })
                }
              >
                {REPORT_EVENT_TYPE_LABELS[type]}
              </button>
            )
          })}
        </div>
        <p className="muted reports-repeat-help">
          {matched
            ? 'This name already exists. Add another date on top of it.'
            : weekly
              ? 'Pick which weekdays this event runs. It repeats every selected day between the start and end dates.'
              : once
                ? 'Pick a saved name to add another date, or type a new name.'
                : 'Monthly uses the day of the start date, or the last day of a shorter month.'}
          {!once && !matched
            ? ' Admins can cancel a single day from the calendar without deleting the event.'
            : ''}
        </p>
      </div>
      {weekly && !matched ? (
        <div className="field-stack">
          <span className="field-stack-label">Weekdays</span>
          <div className="reports-weekday-picks" role="group" aria-label="Weekdays">
            {REPORT_WEEKDAY_OPTIONS.map((day) => {
              const active = draft.weekdays.includes(day.value)
              return (
                <button
                  key={day.value}
                  type="button"
                  className={`reports-choice${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() =>
                    setDraft((current) => {
                      const selected = current.weekdays.includes(day.value)
                        ? current.weekdays.filter((value) => value !== day.value)
                        : [...current.weekdays, day.value].sort((a, b) => a - b)
                      return { ...current, weekdays: selected }
                    })
                  }
                >
                  {day.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
      <label className="field-stack">
        <span className="field-stack-label">Event name</span>
        <input
          className="app-input"
          value={draft.title}
          onChange={(input) =>
            setDraft((current) => ({ ...current, title: input.target.value }))
          }
          required
          maxLength={80}
          placeholder="Evening sabha"
          list={showNamePicks ? 'report-event-names' : undefined}
        />
        {showNamePicks ? (
          <>
            <datalist id="report-event-names">
              {[...new Set(sameTypeEvents.map((item) => item.title))].map((title) => (
                <option key={title} value={title} />
              ))}
            </datalist>
            <div className="reports-name-picks">
              {[...new Map(sameTypeEvents.map((item) => [item.title.trim().toLowerCase(), item])).values()].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`btn btn-sm ${nameKey === item.title.trim().toLowerCase() ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      title: item.title,
                      time: item.time || current.time,
                      weekdays: weekly
                        ? normalizeWeekdays(item.weekdays, item.startDate || current.startDate)
                        : [],
                    }))
                  }
                >
                  {item.title}
                </button>
              ))}
            </div>
            <p className="muted">
              {once
                ? 'Pick a saved name to add another date, or type a new name.'
                : `Pick a saved ${REPORT_EVENT_TYPE_LABELS[draft.type].toLowerCase()} event to add another date on top, or type a new name.`}
            </p>
          </>
        ) : null}
      </label>
      {matched ? null : (
        <div className="field-stack">
          <span className="field-stack-label">Answer</span>
          {event ? (
            <p className="reports-card-meta">{REPORT_ANSWER_TYPE_LABELS[event.answerType || REPORT_ANSWER_TYPE.ATTENDANCE]}</p>
          ) : (
            <div className="reports-answer-types" role="group" aria-label="Answer type">
              {Object.values(REPORT_ANSWER_TYPE).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={`reports-choice${draft.answerType === kind ? ' is-active' : ''}`}
                  aria-pressed={draft.answerType === kind}
                  onClick={() => setDraft((current) => ({ ...current, answerType: kind }))}
                >
                  {REPORT_ANSWER_TYPE_LABELS[kind]}
                </button>
              ))}
            </div>
          )}
          {(event ? event.answerType : draft.answerType) === REPORT_ANSWER_TYPE.NUMBER ? (
            <p className="muted">Members enter a number and can add a note.</p>
          ) : null}
          {(event ? event.answerType : draft.answerType) === REPORT_ANSWER_TYPE.YES_NO ? (
            <p className="muted">Members choose Yes or No and can add a note.</p>
          ) : null}
          {(event ? event.answerType : draft.answerType) === REPORT_ANSWER_TYPE.SINGLE
            || (event ? event.answerType : draft.answerType) === REPORT_ANSWER_TYPE.MULTI ? (
            <div className="reports-option-editor">
              {draft.options.map((option, index) => (
                <div key={index} className="reports-option-row">
                  <input
                    className="app-input"
                    value={option}
                    maxLength={80}
                    placeholder={`Choice ${index + 1}`}
                    onChange={(input) =>
                      setDraft((current) => ({
                        ...current,
                        options: current.options.map((value, item) =>
                          item === index ? input.target.value : value,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        options: current.options.filter((_, item) => item !== index),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setDraft((current) => ({ ...current, options: [...current.options, ''] }))
                }
              >
                Add choice
              </button>
              <label className="reports-check">
                <input
                  type="checkbox"
                  checked={draft.allowCustom}
                  onChange={(input) =>
                    setDraft((current) => ({ ...current, allowCustom: input.target.checked }))
                  }
                />
                Allow a written answer
              </label>
            </div>
          ) : null}
        </div>
      )}
      <label className="field-stack">
        <span className="field-stack-label">Event time (optional)</span>
        <input
          type="time"
          className="app-input"
          value={draft.time}
          onChange={(input) =>
            setDraft((current) => ({ ...current, time: input.target.value }))
          }
        />
      </label>
      <label className="field-stack">
        <span className="field-stack-label">
          {matched || once ? 'Date' : 'Start date'}
        </span>
        <input
          type="date"
          className="app-input"
          value={draft.startDate}
          onChange={(input) =>
            setDraft((current) => {
              const startDate = input.target.value
              const next = {
                ...current,
                startDate,
                endDate: once || matched ? startDate : current.endDate,
              }
              if (weekly && !matched && current.weekdays.length === 0) {
                const day = weekdayOfDateId(startDate)
                if (day != null) next.weekdays = [day]
              }
              return next
            })
          }
          required
        />
      </label>
      {once || matched ? null : (
        <label className="field-stack">
          <span className="field-stack-label">End date</span>
          <input
            type="date"
            className="app-input"
            value={draft.endDate}
            min={draft.startDate}
            onChange={(input) =>
              setDraft((current) => ({ ...current, endDate: input.target.value }))
            }
            required
          />
        </label>
      )}
      {matched ? null : (
        <label className="field-stack">
          <span className="field-stack-label">Meal voting grace</span>
          <select
            className="app-input"
            value={draft.requirePriorDays}
            onChange={(input) =>
              setDraft((current) => ({
                ...current,
                requirePriorDays: Number(input.target.value) || 0,
              }))
            }
          >
            {REQUIRE_PRIOR_DAYS_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days === 0
                  ? 'Off — meals are never blocked'
                  : days === 1
                    ? 'Grace: last 1 day (older reports block meals)'
                    : `Grace: last ${days} days (older reports block meals)`}
              </option>
            ))}
          </select>
          <p className="muted">
            The last N days can stay unfilled. Anything older and still empty blocks meal voting until it is filled. Reports themselves stay open. The longest grace across events is used.
          </p>
        </label>
      )}
      <label className="field-stack">
        <span className="field-stack-label">Instructions for members</span>
        <textarea
          className="app-textarea"
          rows={2}
          value={draft.note}
          maxLength={1000}
          placeholder="Optional"
          onChange={(input) =>
            setDraft((current) => ({ ...current, note: input.target.value }))
          }
        />
      </label>
      <div className="reports-card-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : matched ? 'Add date' : event ? 'Save event' : 'Add event'}
        </button>
      </div>
    </form>
  )
}
