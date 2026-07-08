import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { createDefaultSevaConfig } from '../config/defaultSevaSeed'
import { normalizePrefillRules } from '../config/prefillRuleTypes'
import { COLLECTIONS } from '../config/constants'
import { db, isFirebaseConfigured } from '../lib/firebase'

const SEVA_DOC = 'config'

export function getSevaDocRef() {
  if (!db) return null
  return doc(db, COLLECTIONS.SEVA_ROOM, SEVA_DOC)
}

export async function getSevaConfig() {
  if (!isFirebaseConfigured || !db) return createDefaultSevaConfig()
  const ref = getSevaDocRef()
  const snap = await getDoc(ref)
  if (!snap.exists()) return createDefaultSevaConfig()
  return normalizeConfig(snap.data())
}

export function subscribeSevaConfig(onData, onError) {
  if (!isFirebaseConfigured || !db) {
    onData(createDefaultSevaConfig())
    return () => {}
  }
  const ref = getSevaDocRef()
  return onSnapshot(
    ref,
    (snap) => {
      onData(snap.exists() ? normalizeConfig(snap.data()) : createDefaultSevaConfig())
    },
    (err) => onError?.(err),
  )
}

export async function saveSevaConfig(config) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const payload = {
    ...config,
    prefillRules: normalizePrefillRules(config.prefillRules ?? []),
    updatedAt: new Date().toISOString(),
  }
  await setDoc(getSevaDocRef(), payload)
  return payload
}

export async function seedSevaConfigIfEmpty() {
  if (!isFirebaseConfigured || !db) return createDefaultSevaConfig()
  const ref = getSevaDocRef()
  const snap = await getDoc(ref)
  if (snap.exists()) return normalizeConfig(snap.data())
  const seed = createDefaultSevaConfig()
  await setDoc(ref, seed)
  return seed
}

function normalizeConfig(data) {
  const defaults = createDefaultSevaConfig()
  return {
    ...defaults,
    ...data,
    people: data.people ?? defaults.people,
    dailyGroups: data.dailyGroups ?? defaults.dailyGroups,
    weekDays: data.weekDays ?? defaults.weekDays,
    loadColumns: data.loadColumns ?? defaults.loadColumns,
    weeklyColumnCount: data.weeklyColumnCount ?? defaults.weeklyColumnCount ?? 4,
    weeklyTasks: data.weeklyTasks ?? defaults.weeklyTasks,
    assignments: data.assignments ?? defaults.assignments,
    prefillRules: normalizePrefillRules(
      data.prefillRules ?? defaults.prefillRules ?? [],
    ),
  }
}
