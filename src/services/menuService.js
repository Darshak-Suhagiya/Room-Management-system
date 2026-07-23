import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { emptyMealSlot } from '../config/menuItems'
import { COLLECTIONS } from '../config/constants'
import {
  deleteParticipationsForSlot,
  getParticipationsForSlot,
} from './participationService'
import { didSlotMenuChange } from '../utils/menuSlotCompare'
import {
  applyPlanStockUsage,
  normalizeStockUsage,
} from './stockService'

function normalizeSlot(slot, categoryIds) {
  const base = emptyMealSlot(categoryIds)
  if (!slot) return base
  for (const key of categoryIds) {
    base[key] = slot[key] ?? []
  }
  return base
}

function normalizeTotalOverrides(raw) {
  if (!raw || typeof raw !== 'object') {
    return { morning: {}, evening: {} }
  }
  return {
    morning: { ...(raw.morning ?? {}) },
    evening: { ...(raw.evening ?? {}) },
  }
}

export function formatDateId(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function slotHasContent(slot) {
  if (!slot) return false
  return Object.values(slot).some((arr) => Array.isArray(arr) && arr.length > 0)
}

function parseMenuDoc(snap, categoryIds) {
  const data = snap.data()
  const hasMorning =
    data.hasMorning === true ||
    (data.hasMorning !== false && slotHasContent(data.morning))
  const hasEvening =
    data.hasEvening === true ||
    (data.hasEvening !== false && slotHasContent(data.evening))

  return {
    id: snap.id,
    date: data.date,
    hasMorning,
    hasEvening,
    morning: data.morning
      ? normalizeSlot(data.morning, categoryIds)
      : null,
    evening: data.evening
      ? normalizeSlot(data.evening, categoryIds)
      : null,
    morningNote: data.morningNote ?? '',
    eveningNote: data.eveningNote ?? '',
    morningMaharajNote: data.morningMaharajNote ?? '',
    eveningMaharajNote: data.eveningMaharajNote ?? '',
    totalOverrides: normalizeTotalOverrides(data.totalOverrides),
    stockUsage: normalizeStockUsage(data.stockUsage),
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  }
}

export async function getMenuByDate(dateId, categoryIds = []) {
  if (!isFirebaseConfigured || !db) return null
  const snap = await getDoc(doc(db, COLLECTIONS.MENUS, dateId))
  if (!snap.exists()) return null
  return parseMenuDoc(snap, categoryIds)
}

export async function getMenusFromDate(
  startDateId,
  categoryIds = [],
  limitDays = 60,
) {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.MENUS))
  return snap.docs
    .map((d) => parseMenuDoc(d, categoryIds))
    .filter((m) => m.date >= startDateId && (m.hasMorning || m.hasEvening))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limitDays)
}

export async function getAllPlannedMenus(categoryIds = []) {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.MENUS))
  return snap.docs
    .map((d) => parseMenuDoc(d, categoryIds))
    .filter((m) => m.hasMorning || m.hasEvening)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function saveMenu(
  dateId,
  {
    hasMorning,
    hasEvening,
    morning,
    evening,
    morningNote,
    eveningNote,
    morningMaharajNote,
    eveningMaharajNote,
    stockUsage: stockUsageInput,
  },
  userId,
  categoryIds,
) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }

  if (!hasMorning && !hasEvening) {
    throw new Error('Select at least morning or evening')
  }

  const ref = doc(db, COLLECTIONS.MENUS, dateId)
  const existingSnap = await getDoc(ref)
  const existingMenu = existingSnap.exists()
    ? parseMenuDoc(existingSnap, categoryIds)
    : null

  const previousUsage = existingMenu?.stockUsage || { morning: {}, evening: {} }
  const nextUsage = normalizeStockUsage({
    morning: hasMorning ? stockUsageInput?.morning || {} : {},
    evening: hasEvening ? stockUsageInput?.evening || {} : {},
  })

  const newData = {
    hasMorning,
    hasEvening,
    morning,
    evening,
    morningNote,
    eveningNote,
    morningMaharajNote,
    eveningMaharajNote,
  }

  const clearedSlots = []
  const previousVoters = { morning: [], evening: [] }
  const slotsToCheck = ['morning', 'evening']

  for (const slot of slotsToCheck) {
    if (didSlotMenuChange(existingMenu, newData, slot, categoryIds)) {
      const parts = await getParticipationsForSlot(dateId, slot)
      previousVoters[slot] = [
        ...new Set(parts.map((p) => p.userId).filter(Boolean)),
      ]
      await deleteParticipationsForSlot(dateId, slot)
      clearedSlots.push(slot)
    }
  }

  let totalOverrides = existingMenu?.totalOverrides
    ? normalizeTotalOverrides(existingMenu.totalOverrides)
    : { morning: {}, evening: {} }

  for (const slot of clearedSlots) {
    totalOverrides = { ...totalOverrides, [slot]: {} }
  }

  const payload = {
    date: dateId,
    hasMorning: !!hasMorning,
    hasEvening: !!hasEvening,
    totalOverrides,
    stockUsage: nextUsage,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  }

  if (hasMorning) {
    payload.morning = normalizeSlot(morning, categoryIds)
    const note = (morningNote ?? '').trim()
    payload.morningNote = note || deleteField()
    const cookNote = (morningMaharajNote ?? '').trim()
    payload.morningMaharajNote = cookNote || deleteField()
  } else {
    payload.morning = deleteField()
    payload.morningNote = deleteField()
    payload.morningMaharajNote = deleteField()
  }

  if (hasEvening) {
    payload.evening = normalizeSlot(evening, categoryIds)
    const note = (eveningNote ?? '').trim()
    payload.eveningNote = note || deleteField()
    const cookNote = (eveningMaharajNote ?? '').trim()
    payload.eveningMaharajNote = cookNote || deleteField()
  } else {
    payload.evening = deleteField()
    payload.eveningNote = deleteField()
    payload.eveningMaharajNote = deleteField()
  }

  await applyPlanStockUsage({
    dateId,
    previousUsage,
    nextUsage,
    userId,
  })

  await setDoc(ref, payload, { merge: true })

  const saved = await getMenuByDate(dateId, categoryIds)
  return { menu: saved, clearedSlots, previousVoters }
}

/** Admin: set or clear adjusted total for a number-vote item (null clears). */
export async function setMenuTotalOverride(dateId, slot, itemId, total) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const ref = doc(db, COLLECTIONS.MENUS, dateId)
  const fieldPath = `totalOverrides.${slot}.${itemId}`

  if (total === null || total === undefined || total === '') {
    await updateDoc(ref, { [fieldPath]: deleteField() })
    return
  }

  const num = Number(total)
  if (!Number.isFinite(num) || num < 0) {
    throw new Error('Enter a valid non-negative number')
  }
  const halfStepOk = Math.abs(num * 2 - Math.round(num * 2)) < 1e-9
  if (!halfStepOk) {
    throw new Error('Use whole numbers or half steps (e.g. 1, 1.5, 2)')
  }

  await setDoc(
    ref,
    {
      totalOverrides: {
        [slot]: {
          [itemId]: num,
        },
      },
    },
    { merge: true },
  )
}
