import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import {
  COLLECTIONS,
  DEFAULT_FINANCE_SETTINGS,
  DEFAULT_ROUND_PRESETS,
} from '../config/constants'

function nowIso() {
  return new Date().toISOString()
}

export function normalizeFinanceSettings(data = {}) {
  const reminder = data.reminderConfig ?? {}
  return {
    ...DEFAULT_FINANCE_SETTINGS,
    ...data,
    standardDepositPaise:
      typeof data.standardDepositPaise === 'number'
        ? data.standardDepositPaise
        : DEFAULT_FINANCE_SETTINGS.standardDepositPaise,
    defaultDueDays:
      typeof data.defaultDueDays === 'number'
        ? data.defaultDueDays
        : DEFAULT_FINANCE_SETTINGS.defaultDueDays,
    roundPresets: Array.isArray(data.roundPresets) && data.roundPresets.length
      ? data.roundPresets
      : DEFAULT_ROUND_PRESETS,
    reminderConfig: {
      ...DEFAULT_FINANCE_SETTINGS.reminderConfig,
      ...reminder,
    },
    allowNegativeWallet: data.allowNegativeWallet === true,
  }
}

export async function getFinanceSettings() {
  if (!isFirebaseConfigured || !db) {
    return normalizeFinanceSettings()
  }
  const snap = await getDoc(doc(db, COLLECTIONS.FINANCE_SETTINGS, 'default'))
  if (!snap.exists()) return normalizeFinanceSettings()
  return normalizeFinanceSettings(snap.data())
}

export async function saveFinanceSettings(patch, userId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const current = await getFinanceSettings()
  const next = normalizeFinanceSettings({ ...current, ...patch })
  await setDoc(
    doc(db, COLLECTIONS.FINANCE_SETTINGS, 'default'),
    {
      ...next,
      updatedAt: nowIso(),
      updatedBy: userId || null,
    },
    { merge: true },
  )
  return next
}
