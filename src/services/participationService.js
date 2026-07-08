import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTIONS } from '../config/constants'
import { isPastDate } from '../utils/mealDateUtils'
import { getVoteLock } from './voteLockService'

export function participationDocId(userId, dateId, slot) {
  return `${userId}_${dateId}_${slot}`
}

export async function getMealParticipation(userId, dateId, slot) {
  if (!isFirebaseConfigured || !db) return null
  const id = participationDocId(userId, dateId, slot)
  const snap = await getDoc(doc(db, COLLECTIONS.MEAL_PARTICIPATION, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export function subscribeMealParticipation(userId, dateId, slot, callback) {
  if (!isFirebaseConfigured || !db) {
    callback(null)
    return () => {}
  }
  const id = participationDocId(userId, dateId, slot)
  return onSnapshot(doc(db, COLLECTIONS.MEAL_PARTICIPATION, id), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

/** Live stream of every participation doc belonging to one user. */
export function subscribeUserParticipations(userId, callback) {
  if (!isFirebaseConfigured || !db || !userId) {
    callback([])
    return () => {}
  }
  const q = query(
    collection(db, COLLECTIONS.MEAL_PARTICIPATION),
    where('userId', '==', userId),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function getParticipationsForSlot(dateId, slot) {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.MEAL_PARTICIPATION))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.date === dateId && p.slot === slot)
}

/** Remove all user votes for a date + slot (e.g. after menu items change). */
export async function deleteParticipationsForSlot(dateId, slot) {
  if (!isFirebaseConfigured || !db) return 0
  const participations = await getParticipationsForSlot(dateId, slot)
  if (participations.length === 0) return 0

  const batch = writeBatch(db)
  for (const p of participations) {
    batch.delete(doc(db, COLLECTIONS.MEAL_PARTICIPATION, p.id))
  }
  await batch.commit()
  return participations.length
}

export async function assertCanVoteOnSlot(dateId, slot) {
  if (isPastDate(dateId)) {
    throw new Error('Votes cannot be changed for past dates.')
  }
  const lock = await getVoteLock(dateId, slot)
  if (lock?.locked) {
    throw new Error('Voting is closed for this slot — locked by admin.')
  }
}

export async function saveMealParticipation({
  userId,
  dateId,
  slot,
  notEating,
  votes,
}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  await assertCanVoteOnSlot(dateId, slot)
  const id = participationDocId(userId, dateId, slot)
  const payload = {
    userId,
    date: dateId,
    slot,
    notEating: !!notEating,
    votes: notEating ? {} : votes ?? {},
    isVoted: true,
    updatedAt: new Date().toISOString(),
  }
  await setDoc(doc(db, COLLECTIONS.MEAL_PARTICIPATION, id), payload, {
    merge: true,
  })
  return { id, ...payload }
}

/** @deprecated use saveMealParticipation */
export async function setMealOptOut(userId, dateId, slot, notEating) {
  const existing = await getMealParticipation(userId, dateId, slot)
  return saveMealParticipation({
    userId,
    dateId,
    slot,
    notEating,
    votes: notEating ? {} : existing?.votes ?? {},
  })
}
