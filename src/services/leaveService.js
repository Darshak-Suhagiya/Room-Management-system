import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTIONS, LEAVE_PERIODS } from '../config/constants'

export function leaveDocId(personId, dateId, period) {
  return `${personId}_${dateId}_${period}`
}

function monthDateBounds(year, month) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function summarizeLeaves(leaves) {
  let full = 0
  let morning = 0
  let evening = 0
  for (const leave of leaves) {
    if (leave.period === LEAVE_PERIODS.FULL) full += 1
    else if (leave.period === LEAVE_PERIODS.MORNING) morning += 1
    else if (leave.period === LEAVE_PERIODS.EVENING) evening += 1
  }
  const leaveDays = full + 0.5 * (morning + evening)
  return {
    full,
    morning,
    evening,
    entries: leaves.length,
    leaveDays,
  }
}

async function listLeavesForPerson(personId) {
  const q = query(
    collection(db, COLLECTIONS.LEAVE_ENTRIES),
    where('personId', '==', personId),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function listLeavesForPersonInRange(personId, start, end) {
  const rows = await listLeavesForPerson(personId)
  return rows.filter((row) => row.date >= start && row.date <= end)
}

export async function listLeavesForMonth(personIds, year, month) {
  if (!isFirebaseConfigured || !db) return []
  const ids = (personIds ?? []).filter(Boolean)
  if (ids.length === 0) return []
  const { start, end } = monthDateBounds(year, month)
  const batches = await Promise.all(
    ids.map((id) => listLeavesForPersonInRange(id, start, end)),
  )
  return batches
    .flat()
    .sort((a, b) => a.date.localeCompare(b.date) || a.period.localeCompare(b.period))
}

async function getLeavesForPersonDate(personId, dateId) {
  const rows = await listLeavesForPerson(personId)
  return rows.filter((row) => row.date === dateId)
}

/**
 * Create a new leave entry. Fails if that person+date already has leave
 * (members cannot overwrite; leads should use updateLeave / deleteLeave).
 */
export async function createLeave({
  personId,
  personName,
  date,
  period,
  reason,
  recordedBy,
  recordedByName,
}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const reasonText = String(reason ?? '').trim()
  if (!reasonText) throw new Error('Reason is required.')
  if (!Object.values(LEAVE_PERIODS).includes(period)) {
    throw new Error('Invalid leave period.')
  }

  const existing = await getLeavesForPersonDate(personId, date)
  if (existing.length > 0) {
    throw new Error(
      'Leave already recorded for this day. Ask an admin or leader to change it.',
    )
  }

  const id = leaveDocId(personId, date, period)
  const now = new Date().toISOString()
  const payload = {
    personId,
    personName: personName ?? '',
    date,
    period,
    reason: reasonText,
    recordedBy,
    recordedByName: recordedByName ?? '',
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(doc(db, COLLECTIONS.LEAVE_ENTRIES, id), payload)
  return { id, ...payload }
}

/**
 * Update leave for a day (lead/admin). Replaces period if needed and clears conflicts.
 */
export async function updateLeave({
  personId,
  personName,
  date,
  period,
  reason,
  updatedBy,
  existingLeaves,
}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const reasonText = String(reason ?? '').trim()
  if (!reasonText) throw new Error('Reason is required.')
  if (!Object.values(LEAVE_PERIODS).includes(period)) {
    throw new Error('Invalid leave period.')
  }

  const current = existingLeaves ?? (await getLeavesForPersonDate(personId, date))
  const batch = writeBatch(db)
  const now = new Date().toISOString()
  const targetId = leaveDocId(personId, date, period)

  for (const leave of current) {
    if (leave.id !== targetId) {
      batch.delete(doc(db, COLLECTIONS.LEAVE_ENTRIES, leave.id))
    }
  }

  const recordedBy = current[0]?.recordedBy ?? updatedBy
  const recordedByName = current[0]?.recordedByName ?? ''
  const createdAt = current[0]?.createdAt ?? now

  batch.set(doc(db, COLLECTIONS.LEAVE_ENTRIES, targetId), {
    personId,
    personName: personName ?? current[0]?.personName ?? '',
    date,
    period,
    reason: reasonText,
    recordedBy,
    recordedByName,
    createdAt,
    updatedAt: now,
    updatedBy: updatedBy ?? null,
  })

  await batch.commit()
  return targetId
}

export async function deleteLeave(docId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  await deleteDoc(doc(db, COLLECTIONS.LEAVE_ENTRIES, docId))
}

export async function deleteLeavesForPersonDate(personId, dateId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const existing = await getLeavesForPersonDate(personId, dateId)
  if (existing.length === 0) return
  const batch = writeBatch(db)
  for (const leave of existing) {
    batch.delete(doc(db, COLLECTIONS.LEAVE_ENTRIES, leave.id))
  }
  await batch.commit()
}

export async function getLeaveById(docId) {
  if (!isFirebaseConfigured || !db) return null
  const snap = await getDoc(doc(db, COLLECTIONS.LEAVE_ENTRIES, docId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
