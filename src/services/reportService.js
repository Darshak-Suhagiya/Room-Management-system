import {
  collection,
  deleteDoc,
  doc,
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
  REPORT_ATTENDANCE_STATUS,
} from '../config/constants'
import { isDateId, normalizeTime } from '../utils/reportAttendance'

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
function normalizeAttendance(attendance) {
  const seen = new Set()
  const rows = []
  const writable = new Set([
    REPORT_ATTENDANCE_STATUS.PRESENT,
    REPORT_ATTENDANCE_STATUS.ABSENT,
  ])
  for (const row of attendance ?? []) {
    const userId = String(row?.userId || '').trim()
    let status = String(row?.status || '').trim()
    if (!userId || !status) continue
    // Legacy UI rows may still send unavailable; store as absent + reason.
    if (status === REPORT_ATTENDANCE_STATUS.UNAVAILABLE) {
      status = REPORT_ATTENDANCE_STATUS.ABSENT
    }
    if (!writable.has(status)) {
      throw new Error('Choose present or not present.')
    }
    if (seen.has(userId)) continue
    seen.add(userId)
    const displayName = String(row.displayName || '').trim() || 'Member'
    const time =
      status === REPORT_ATTENDANCE_STATUS.PRESENT ? normalizeTime(row.time) : ''
    const reason =
      status === REPORT_ATTENDANCE_STATUS.ABSENT
        ? String(row.reason || '').trim()
        : ''
    if (reason.length > 120) {
      throw new Error(`The reason for ${displayName} is too long.`)
    }
    rows.push({
      userId,
      displayName: displayName.slice(0, 80),
      status,
      time,
      reason,
    })
  }
  rows.sort((a, b) => a.displayName.localeCompare(b.displayName))
  return rows
}

function buildEventFields({ date, title, time, note, attendance }) {
  const cleanDate = String(date || '').trim()
  if (!isDateId(cleanDate)) throw new Error('Choose a valid date.')
  const cleanTitle = String(title || '').trim()
  if (!cleanTitle) throw new Error('Enter an event name.')
  if (cleanTitle.length > 80) throw new Error('Event name is too long.')
  const cleanTime = normalizeTime(time)
  if (!cleanTime) throw new Error('Enter the event time.')
  const cleanNote = String(note || '').trim()
  if (cleanNote.length > 1000) throw new Error('Event note is too long.')
  return {
    date: cleanDate,
    title: cleanTitle,
    time: cleanTime,
    note: cleanNote,
    attendance: normalizeAttendance(attendance),
  }
}

function parseEvent(snap) {
  const data = snap.data() || {}
  return {
    id: snap.id,
    date: data.date || '',
    title: data.title || '',
    time: data.time || '',
    note: data.note || '',
    attendance: Array.isArray(data.attendance) ? data.attendance : [],
    createdBy: data.createdBy || null,
    createdByName: data.createdByName || '',
    createdAt: data.createdAt || '',
    updatedBy: data.updatedBy || null,
    updatedByName: data.updatedByName || '',
    updatedAt: data.updatedAt || '',
  }
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

export function listNotesInRange(from, to) {
  return listByRange(COLLECTIONS.REPORT_NOTES, from, to, parseNote)
}
