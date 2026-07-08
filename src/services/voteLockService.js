import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTIONS } from '../config/constants'

export function voteLockDocId(dateId, slot) {
  return `${dateId}_${slot}`
}

export async function getVoteLock(dateId, slot) {
  if (!isFirebaseConfigured || !db) return { locked: false }
  const snap = await getDoc(
    doc(db, COLLECTIONS.VOTE_LOCKS, voteLockDocId(dateId, slot)),
  )
  if (!snap.exists()) return { locked: false }
  return { id: snap.id, ...snap.data() }
}

export function subscribeVoteLock(dateId, slot, callback) {
  if (!isFirebaseConfigured || !db) {
    callback({ locked: false })
    return () => {}
  }
  const ref = doc(db, COLLECTIONS.VOTE_LOCKS, voteLockDocId(dateId, slot))
  return onSnapshot(ref, (snap) => {
    callback(
      snap.exists()
        ? { id: snap.id, ...snap.data() }
        : { date: dateId, slot, locked: false },
    )
  })
}

/** Locks for one date: { morning: bool, evening: bool } */
export function subscribeVoteLocksForDate(dateId, callback) {
  if (!isFirebaseConfigured || !db) {
    callback({ morning: false, evening: false })
    return () => {}
  }

  const state = { morning: false, evening: false }
  const emit = () => callback({ ...state })

  const unsubMorning = subscribeVoteLock(dateId, 'morning', (data) => {
    state.morning = Boolean(data?.locked)
    emit()
  })
  const unsubEvening = subscribeVoteLock(dateId, 'evening', (data) => {
    state.evening = Boolean(data?.locked)
    emit()
  })

  return () => {
    unsubMorning()
    unsubEvening()
  }
}

export async function setVoteLock(dateId, slot, locked, adminUserId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const id = voteLockDocId(dateId, slot)
  await setDoc(
    doc(db, COLLECTIONS.VOTE_LOCKS, id),
    {
      date: dateId,
      slot,
      locked: !!locked,
      lockedAt: new Date().toISOString(),
      lockedBy: adminUserId ?? null,
    },
    { merge: true },
  )
}
