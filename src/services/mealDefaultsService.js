import {
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTIONS, DEFAULT_MEAL_MODE } from '../config/constants'
import { isPastDate } from '../utils/mealDateUtils'

const VALID_MODES = new Set(Object.values(DEFAULT_MEAL_MODE))

export function normalizeMealDefaults(raw, userId = '') {
  const data = raw && typeof raw === 'object' ? raw : {}
  const dateOverrides = {}
  if (data.dateOverrides && typeof data.dateOverrides === 'object') {
    for (const [dateId, mode] of Object.entries(data.dateOverrides)) {
      if (VALID_MODES.has(mode)) dateOverrides[dateId] = mode
    }
  }
  return {
    userId: userId || data.userId || '',
    mode: VALID_MODES.has(data.mode) ? data.mode : DEFAULT_MEAL_MODE.NOT_EATING,
    votes: data.votes && typeof data.votes === 'object' ? data.votes : {},
    dateOverrides,
    updatedAt: data.updatedAt ?? '',
    exists: Boolean(raw),
  }
}

export function subscribeMealDefaults(userId, callback) {
  if (!isFirebaseConfigured || !db || !userId) {
    callback(normalizeMealDefaults(null, userId))
    return () => {}
  }
  return onSnapshot(
    doc(db, COLLECTIONS.MEAL_DEFAULTS, userId),
    (snap) => {
      callback(normalizeMealDefaults(snap.exists() ? snap.data() : null, userId))
    },
    (err) => {
      callback({
        ...normalizeMealDefaults(null, userId),
        error: err?.message || 'Could not load default votes.',
      })
    },
  )
}

export async function listAllMealDefaults() {
  if (!isFirebaseConfigured || !db) return {}
  const snap = await getDocs(collection(db, COLLECTIONS.MEAL_DEFAULTS))
  const byUser = {}
  for (const d of snap.docs) {
    byUser[d.id] = normalizeMealDefaults(d.data(), d.id)
  }
  return byUser
}

/** Save the default mode and the per-dish default votes. */
export async function saveMealDefaults(userId, { mode, votes }) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  if (!userId) throw new Error('You must be signed in.')
  if (!VALID_MODES.has(mode)) throw new Error('Pick Eating or Not eating.')

  const payload = {
    userId,
    mode,
    votes: votes ?? {},
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  }
  await setDoc(doc(db, COLLECTIONS.MEAL_DEFAULTS, userId), payload, {
    merge: true,
  })
  return payload
}

/**
 * Set (or clear with value = null) the Eating / Not eating override for dates.
 * Past dates are ignored.
 */
export async function setDateOverrides(userId, dateIds, value) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  if (!userId) throw new Error('You must be signed in.')
  if (value !== null && !VALID_MODES.has(value)) {
    throw new Error('Pick Eating or Not eating.')
  }
  const ids = [...new Set(dateIds ?? [])].filter((id) => !isPastDate(id))
  if (ids.length === 0) return 0

  const overrides = {}
  for (const id of ids) overrides[id] = value === null ? deleteField() : value

  await setDoc(
    doc(db, COLLECTIONS.MEAL_DEFAULTS, userId),
    {
      userId,
      dateOverrides: overrides,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    },
    { merge: true },
  )
  return ids.length
}
