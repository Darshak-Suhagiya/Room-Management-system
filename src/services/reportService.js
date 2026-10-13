import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import {
  COLLECTIONS,
  REPORT_ACCESS_DOC_ID,
  REPORT_ANSWER_TYPE,
  REPORT_ATTENDANCE_STATUS,
  REPORT_EVENT_TYPE,
} from '../config/constants'
import {
  cleanAnswerText,
  clampRequirePriorDays,
  isDateId,
  isRecurringReportEvent,
  normalizeReportEvent,
  normalizeTime,
  normalizeWeekdays,
  responseDocId,
  weekdayOfDateId,
} from '../utils/reportAttendance'

function assertConfigured() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
}

function accessRef() {
  return doc(db, COLLECTIONS.REPORT_ACCESS, REPORT_ACCESS_DOC_ID)
}

function nowIso() {
  return new Date().toISOString()
}

function readAllowedIds(data) {
  const ids = data?.allowedUserIds
  if (!Array.isArray(ids)) return []
  return ids.filter((id) => typeof id === 'string' && id)
}

export function subscribeReportAccess(onChange) {
  if (!isFirebaseConfigured || !db) {
    onChange([])
    return () => {}
  }
  return onSnapshot(
    accessRef(),
    (snap) => {
      onChange(snap.exists() ? readAllowedIds(snap.data()) : [])
    },
    () => onChange([]),
  )
}

export async function setReportAccessForUser(userId, allowed, actorId) {
  assertConfigured()
  const uid = String(userId || '').trim()
  if (!uid) throw new Error('Choose a person.')
  await runTransaction(db, async (tx) => {
    const ref = accessRef()
    const snap = await tx.get(ref)
    const ids = new Set(snap.exists() ? readAllowedIds(snap.data()) : [])
    if (allowed) ids.add(uid)
    else ids.delete(uid)
    tx.set(
      ref,
      {
        allowedUserIds: [...ids].sort(),
        updatedAt: nowIso(),
        updatedBy: actorId || null,
      },
      { merge: true },
    )
  })
}

function actorStamp(actor, { creating }) {
  const now = nowIso()
  const name = String(actor?.name || '').trim() || 'Member'
  const id = actor?.id || null
  if (creating) {
    return {
      createdBy: id,
      createdByName: name,
      createdAt: now,
      updatedBy: id,
      updatedByName: name,
      updatedAt: now,
    }
  }
  return {
    updatedBy: id,
    updatedByName: name,
    updatedAt: now,
  }
}

/** Keep only people who were given a status — blank roster rows are not stored. */
function buildEventFields({
  type,
  startDate,
  endDate,
  date,
  title,
  time,
  note,
  dates,
  exceptionDates,
  weekdays,
  requirePriorDays,
  answerType,
  options,
  allowCustom,
}) {
  const eventType = Object.values(REPORT_EVENT_TYPE).includes(type)
    ? type
    : REPORT_EVENT_TYPE.ONCE
  const start = String(startDate || date || '').trim()
  const end = String(endDate || start).trim()
  if (!isDateId(start) || !isDateId(end)) throw new Error('Choose a valid date.')
  const [rangeStart, rangeEnd] = start <= end ? [start, end] : [end, start]
  const cleanTitle = cleanAnswerText(title)
  if (!cleanTitle) throw new Error('Enter an event name.')
  if (cleanTitle.length > 80) throw new Error('Event name is too long.')
  const rawTime = cleanAnswerText(time)
  const cleanTime = rawTime ? normalizeTime(time) : ''
  if (rawTime && !cleanTime) throw new Error('Enter a valid event time.')
  const cleanNote = cleanAnswerText(note)
  if (cleanNote.length > 1000) throw new Error('Event note is too long.')
  const kind = Object.values(REPORT_ANSWER_TYPE).includes(answerType)
    ? answerType
    : REPORT_ANSWER_TYPE.ATTENDANCE
  const cleanOptions = (Array.isArray(options) ? options : [])
    .map((value) => cleanAnswerText(value))
    .filter(Boolean)
    .slice(0, 20)
  if (
    (kind === REPORT_ANSWER_TYPE.SINGLE || kind === REPORT_ANSWER_TYPE.MULTI)
    && cleanOptions.length < 2
  ) {
    throw new Error('Add at least two choices.')
  }
  const onceDate = eventType === REPORT_EVENT_TYPE.ONCE ? rangeStart : rangeStart
  const recurring = eventType === REPORT_EVENT_TYPE.DAILY
    || eventType === REPORT_EVENT_TYPE.WEEKLY
    || eventType === REPORT_EVENT_TYPE.MONTHLY
  const savedDates = eventType === REPORT_EVENT_TYPE.ONCE
    ? [...new Set(
        [onceDate, ...(Array.isArray(dates) ? dates : [])].filter((value) => isDateId(value)),
      )].sort()
    : [...new Set(
        (Array.isArray(dates) ? dates : []).filter((value) => isDateId(value)),
      )].sort().slice(0, 366)
  const savedExceptions = recurring
    ? [...new Set(
        (Array.isArray(exceptionDates) ? exceptionDates : [])
          .filter((value) => isDateId(value)),
      )].sort().slice(0, 366)
    : []
  let savedWeekdays = []
  if (eventType === REPORT_EVENT_TYPE.WEEKLY) {
    savedWeekdays = normalizeWeekdays(weekdays, rangeStart)
    if (savedWeekdays.length === 0) {
      const fallback = weekdayOfDateId(rangeStart)
      if (fallback == null) throw new Error('Choose at least one weekday.')
      savedWeekdays = [fallback]
    }
  }
  return {
    type: eventType,
    startDate: onceDate,
    endDate: eventType === REPORT_EVENT_TYPE.ONCE ? onceDate : rangeEnd,
    date: eventType === REPORT_EVENT_TYPE.ONCE ? savedDates[0] || onceDate : onceDate,
    dates: savedDates,
    exceptionDates: savedExceptions,
    weekdays: savedWeekdays,
    requirePriorDays: clampRequirePriorDays(requirePriorDays),
    title: cleanTitle,
    time: cleanTime,
    note: cleanNote,
    answerType: kind,
    options: kind === REPORT_ANSWER_TYPE.SINGLE || kind === REPORT_ANSWER_TYPE.MULTI
      ? cleanOptions
      : [],
    allowCustom: (kind === REPORT_ANSWER_TYPE.SINGLE || kind === REPORT_ANSWER_TYPE.MULTI)
      && Boolean(allowCustom),
    attendance: [],
  }
}

function parseEvent(snap) {
  const data = snap.data() || {}
  return normalizeReportEvent({
    id: snap.id,
    ...data,
    attendance: Array.isArray(data.attendance) ? data.attendance : [],
  })
}

function parseNote(snap) {
  const data = snap.data() || {}
  return {
    id: snap.id,
    date: data.date || '',
    userId: data.userId || '',
    displayName: data.displayName || '',
    text: data.text || '',
    createdBy: data.createdBy || null,
    createdByName: data.createdByName || '',
    createdAt: data.createdAt || '',
    updatedBy: data.updatedBy || null,
    updatedByName: data.updatedByName || '',
    updatedAt: data.updatedAt || '',
  }
}

function buildNoteFields({ date, userId, displayName, text }) {
  const cleanDate = String(date || '').trim()
  if (!isDateId(cleanDate)) throw new Error('Choose a valid date.')
  const cleanUserId = String(userId || '').trim()
  if (!cleanUserId) throw new Error('Choose a person.')
  const cleanName = String(displayName || '').trim() || 'Member'
  const cleanText = String(text || '').trim()
  if (!cleanText) throw new Error('Enter a note.')
  if (cleanText.length > 2000) throw new Error('Note is too long.')
  return {
    date: cleanDate,
    userId: cleanUserId,
    displayName: cleanName.slice(0, 80),
    text: cleanText,
  }
}

export async function createReportEvent(input, actor) {
  assertConfigured()
  const fields = buildEventFields(input)
  const ref = doc(collection(db, COLLECTIONS.REPORT_EVENTS))
  const record = { ...fields, ...actorStamp(actor, { creating: true }) }
  await setDoc(ref, record)
  return { id: ref.id, ...record }
}

export async function updateReportEvent(eventId, input, actor) {
  assertConfigured()
  const id = String(eventId || '').trim()
  if (!id) throw new Error('Missing event.')
  const fields = buildEventFields(input)
  delete fields.attendance
  const patch = { ...fields, ...actorStamp(actor, { creating: false }) }
  await updateDoc(doc(db, COLLECTIONS.REPORT_EVENTS, id), patch)
  return { id, ...patch }
}

export async function deleteReportEvent(eventId) {
  assertConfigured()
  const id = String(eventId || '').trim()
  if (!id) throw new Error('Missing event.')
  await deleteDoc(doc(db, COLLECTIONS.REPORT_EVENTS, id))
}

/** Cancel or restore one day of a daily / weekly / monthly event. */
export async function setReportEventDayCancelled(eventId, dateId, cancelled, actor) {
  assertConfigured()
  const id = String(eventId || '').trim()
  const date = String(dateId || '').trim()
  if (!id) throw new Error('Missing event.')
  if (!isDateId(date)) throw new Error('Choose a valid date.')
  const snap = await getDoc(doc(db, COLLECTIONS.REPORT_EVENTS, id))
  if (!snap.exists()) throw new Error('That event was removed.')
  const event = normalizeReportEvent({ id: snap.id, ...snap.data() })
  if (!isRecurringReportEvent(event)) {
    throw new Error('Only daily, weekly, or monthly events can cancel a day.')
  }
  if (date < event.startDate || date > event.endDate) {
    throw new Error('That date is outside this event.')
  }
  await updateDoc(doc(db, COLLECTIONS.REPORT_EVENTS, id), {
    exceptionDates: cancelled ? arrayUnion(date) : arrayRemove(date),
    ...actorStamp(actor, { creating: false }),
  })
  return { id, date, cancelled: Boolean(cancelled) }
}

export async function createReportNote(input, actor) {
  assertConfigured()
  const fields = buildNoteFields(input)
  const ref = doc(collection(db, COLLECTIONS.REPORT_NOTES))
  const record = { ...fields, ...actorStamp(actor, { creating: true }) }
  await setDoc(ref, record)
  return { id: ref.id, ...record }
}

export async function updateReportNote(noteId, input, actor) {
  assertConfigured()
  const id = String(noteId || '').trim()
  if (!id) throw new Error('Missing note.')
  const fields = buildNoteFields(input)
  const patch = { ...fields, ...actorStamp(actor, { creating: false }) }
  await updateDoc(doc(db, COLLECTIONS.REPORT_NOTES, id), patch)
  return { id, ...patch }
}

export async function deleteReportNote(noteId) {
  assertConfigured()
  const id = String(noteId || '').trim()
  if (!id) throw new Error('Missing note.')
  await deleteDoc(doc(db, COLLECTIONS.REPORT_NOTES, id))
}

async function listByDate(collectionName, dateId, parse) {
  if (!isFirebaseConfigured || !db || !isDateId(dateId)) return []
  const snap = await getDocs(
    query(collection(db, collectionName), where('date', '==', dateId)),
  )
  return snap.docs.map(parse)
}

async function listByRange(collectionName, from, to, parse) {
  if (!isFirebaseConfigured || !db || !isDateId(from) || !isDateId(to)) return []
  const snap = await getDocs(
    query(
      collection(db, collectionName),
      where('date', '>=', from),
      where('date', '<=', to),
      orderBy('date', 'asc'),
    ),
  )
  return snap.docs.map(parse)
}

export function listEventsForDate(dateId) {
  return listByDate(COLLECTIONS.REPORT_EVENTS, dateId, parseEvent)
}

export function listNotesForDate(dateId) {
  return listByDate(COLLECTIONS.REPORT_NOTES, dateId, parseNote)
}

export function listEventsInRange(from, to) {
  return listByRange(COLLECTIONS.REPORT_EVENTS, from, to, parseEvent)
}

export async function listAllEvents() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.REPORT_EVENTS))
  return snap.docs.map(parseEvent)
}

export async function listAllNotes() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.REPORT_NOTES))
  return snap.docs.map(parseNote)
}

export async function listNotesByAuthor(userId) {
  const uid = String(userId || '').trim()
  if (!isFirebaseConfigured || !db || !uid) return []
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.REPORT_NOTES), where('createdBy', '==', uid)),
  )
  return snap.docs.map(parseNote)
}

function parseResponse(snap) {
  const data = snap.data() || {}
  return {
    id: snap.id,
    eventId: data.eventId || '',
    date: data.date || '',
    userId: data.userId || '',
    displayName: data.displayName || '',
    status: data.status || '',
    time: data.time || '',
    reason: data.reason || '',
    answerType: data.answerType || '',
    numberValue: data.numberValue ?? null,
    note: data.note || '',
    selected: Array.isArray(data.selected) ? data.selected : [],
    customText: data.customText || '',
    updatedAt: data.updatedAt || '',
    updatedBy: data.updatedBy || null,
    updatedByName: data.updatedByName || '',
  }
}

export async function listResponsesForUser(userId) {
  const uid = String(userId || '').trim()
  if (!isFirebaseConfigured || !db || !uid) return []
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.REPORT_RESPONSES), where('userId', '==', uid)),
  )
  return snap.docs.map(parseResponse)
}

export async function listAllResponses() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.REPORT_RESPONSES))
  return snap.docs.map(parseResponse)
}

export async function saveReportResponse(input, actor) {
  assertConfigured()
  const eventId = String(input?.eventId || '').trim()
  const date = String(input?.date || '').trim()
  const userId = String(input?.userId || '').trim()
  if (!eventId) throw new Error('Missing event.')
  if (!isDateId(date)) throw new Error('Choose a valid date.')
  if (!userId) throw new Error('Choose a person.')
  const displayName = String(input?.displayName || '').trim() || 'Member'
  const answerType = Object.values(REPORT_ANSWER_TYPE).includes(input?.answerType)
    ? input.answerType
    : REPORT_ANSWER_TYPE.ATTENDANCE
  let status = String(input?.status || '').trim()
  if (status === REPORT_ATTENDANCE_STATUS.UNAVAILABLE) {
    status = REPORT_ATTENDANCE_STATUS.ABSENT
  }
  let time = ''
  let reason = ''
  let note = ''
  let numberValue = null
  let selected = []
  let customText = ''
  if (answerType === REPORT_ANSWER_TYPE.ATTENDANCE || answerType === REPORT_ANSWER_TYPE.YES_NO) {
    if (
      status !== REPORT_ATTENDANCE_STATUS.PRESENT &&
      status !== REPORT_ATTENDANCE_STATUS.ABSENT
    ) {
      throw new Error('Choose yes or no.')
    }
    if (answerType === REPORT_ANSWER_TYPE.ATTENDANCE) {
      time = status === REPORT_ATTENDANCE_STATUS.PRESENT ? normalizeTime(input?.time) : ''
      if (status === REPORT_ATTENDANCE_STATUS.PRESENT && !time) {
        throw new Error('Enter your arrival time.')
      }
      reason = status === REPORT_ATTENDANCE_STATUS.ABSENT ? cleanAnswerText(input?.reason) : ''
      if (status === REPORT_ATTENDANCE_STATUS.ABSENT && !reason) {
        throw new Error('Enter a reason.')
      }
      if (reason.length > 120) throw new Error('That reason is too long.')
    } else {
      note = cleanAnswerText(input?.note).slice(0, 500)
      if (status === REPORT_ATTENDANCE_STATUS.ABSENT && !note) {
        throw new Error('Enter a reason.')
      }
    }
  } else if (answerType === REPORT_ANSWER_TYPE.NUMBER) {
    const value = Number(input?.numberValue)
    if (!Number.isFinite(value)) throw new Error('Enter a number.')
    numberValue = value
    note = cleanAnswerText(input?.note).slice(0, 500)
    status = ''
  } else {
    selected = (Array.isArray(input?.selected) ? input.selected : [])
      .map((value) => cleanAnswerText(value))
      .filter(Boolean)
      .slice(0, 20)
    customText = cleanAnswerText(input?.customText).slice(0, 200)
    if (selected.length === 0 && !customText) throw new Error('Choose an answer.')
    if (answerType === REPORT_ANSWER_TYPE.SINGLE && selected.length > 1) {
      selected = selected.slice(0, 1)
    }
    status = ''
  }
  const id = responseDocId(eventId, date, userId)
  const record = {
    eventId,
    date,
    userId,
    displayName: displayName.slice(0, 80),
    answerType,
    status,
    time,
    reason,
    note,
    numberValue,
    selected,
    customText,
    updatedAt: nowIso(),
    updatedBy: actor?.id || null,
    updatedByName: String(actor?.name || '').trim() || 'Member',
  }
  await setDoc(doc(db, COLLECTIONS.REPORT_RESPONSES, id), record, { merge: true })
  return { id, ...record }
}

export async function deleteReportResponse(eventId, date, userId) {
  assertConfigured()
  const id = responseDocId(eventId, date, userId)
  if (!id || id.startsWith('_')) throw new Error('Missing answer.')
  await deleteDoc(doc(db, COLLECTIONS.REPORT_RESPONSES, id))
}
