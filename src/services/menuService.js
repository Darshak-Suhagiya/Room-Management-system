import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { emptyMealSlot } from '../config/menuItems'
import { COLLECTIONS } from '../config/constants'
import {
  deleteParticipationsForSlot,
  getParticipationsForSlot,
} from './participationService'
import { didSlotMenuChange, slotMenuSignature } from '../utils/menuSlotCompare'
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

const SLOT_EDIT_ACTIONS = new Set(['added', 'updated', 'deleted'])

function normalizeSlotEdit(raw) {
  if (!raw || typeof raw !== 'object') return null
  const action = SLOT_EDIT_ACTIONS.has(raw.action) ? raw.action : null
  const displayName =
    typeof raw.displayName === 'string' ? raw.displayName.trim() : ''
  if (!action || !displayName) return null
  return {
    action,
    userId: typeof raw.userId === 'string' ? raw.userId : '',
    displayName,
    at: typeof raw.at === 'string' ? raw.at : '',
  }
}

function normalizeSlotEdits(raw) {
  if (!raw || typeof raw !== 'object') {
    return { morning: null, evening: null }
  }
  return {
    morning: normalizeSlotEdit(raw.morning),
    evening: normalizeSlotEdit(raw.evening),
  }
}

function slotIsEnabled(menu, slot) {
  if (!menu) return false
  return slot === 'morning' ? Boolean(menu.hasMorning) : Boolean(menu.hasEvening)
}

function notesForSlot(menu, slot) {
  if (slot === 'morning') {
    return {
      note: (menu?.morningNote ?? '').trim(),
      cook: (menu?.morningMaharajNote ?? '').trim(),
    }
  }
  return {
    note: (menu?.eveningNote ?? '').trim(),
    cook: (menu?.eveningMaharajNote ?? '').trim(),
  }
}

function stockMapsEqual(left, right) {
  const a = left || {}
  const b = right || {}
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if ((Number(a[key]) || 0) !== (Number(b[key]) || 0)) return false
  }
  return true
}

function slotPlanChanged(
  existingMenu,
  newData,
  previousUsage,
  nextUsage,
  slot,
  categoryIds,
) {
  if (slotIsEnabled(existingMenu, slot) !== slotIsEnabled(newData, slot)) {
    return true
  }
  if (!slotIsEnabled(newData, slot)) return false
  if (
    slotMenuSignature(existingMenu?.[slot], categoryIds) !==
    slotMenuSignature(newData[slot], categoryIds)
  ) {
    return true
  }
  const prevNotes = notesForSlot(existingMenu, slot)
  const nextNotes = notesForSlot(newData, slot)
  if (prevNotes.note !== nextNotes.note || prevNotes.cook !== nextNotes.cook) {
    return true
  }
  return !stockMapsEqual(previousUsage?.[slot], nextUsage?.[slot])
}

function buildSlotEdit(existing, action, userId, displayName, at) {
  return {
    action,
    userId: userId || existing?.userId || '',
    displayName: displayName || existing?.displayName || 'Member',
    at,
  }
}

function nextSlotEdit(
  existingMenu,
  newData,
  previousUsage,
  nextUsage,
  slot,
  categoryIds,
  userId,
  displayName,
  at,
) {
  const wasEnabled = slotIsEnabled(existingMenu, slot)
  const isEnabled = slotIsEnabled(newData, slot)
  const previous = existingMenu?.slotEdits?.[slot] ?? null

  if (!wasEnabled && !isEnabled) return previous
  if (!wasEnabled && isEnabled) {
    return buildSlotEdit(previous, 'added', userId, displayName, at)
  }
  if (wasEnabled && !isEnabled) {
    return buildSlotEdit(previous, 'deleted', userId, displayName, at)
  }
  if (
    slotPlanChanged(
      existingMenu,
      newData,
      previousUsage,
      nextUsage,
      slot,
      categoryIds,
    )
  ) {
    return buildSlotEdit(previous, 'updated', userId, displayName, at)
  }
  return previous
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
    slotEdits: normalizeSlotEdits(data.slotEdits),
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

export async function listPlannedMenusFromDate(
  startDateId,
  categoryIds = [],
  { limitDays } = {},
) {
  if (!isFirebaseConfigured || !db || !startDateId) return []
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.MENUS),
      where('date', '>=', startDateId),
      orderBy('date', 'desc'),
    ),
  )
  const menus = snap.docs
    .map((d) => parseMenuDoc(d, categoryIds))
    .filter((m) => m.hasMorning || m.hasEvening)
  if (limitDays) return menus.slice(0, limitDays)
  return menus
}

export async function getMenusFromDate(
  startDateId,
  categoryIds = [],
  limitDays = 60,
) {
  return listPlannedMenusFromDate(startDateId, categoryIds, { limitDays })
}

export async function getAllPlannedMenus(categoryIds = []) {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.MENUS), orderBy('date', 'desc')),
  )
  return snap.docs
    .map((d) => parseMenuDoc(d, categoryIds))
    .filter((m) => m.hasMorning || m.hasEvening)
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
  { displayName } = {},
) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
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

  const savedAt = new Date().toISOString()
  const actorName =
    typeof displayName === 'string' && displayName.trim()
      ? displayName.trim()
      : 'Member'
  const slotEdits = {
    morning: nextSlotEdit(
      existingMenu,
      newData,
      previousUsage,
      nextUsage,
      'morning',
      categoryIds,
      userId,
      actorName,
      savedAt,
    ),
    evening: nextSlotEdit(
      existingMenu,
      newData,
      previousUsage,
      nextUsage,
      'evening',
      categoryIds,
      userId,
      actorName,
      savedAt,
    ),
  }

  const payload = {
    date: dateId,
    hasMorning: !!hasMorning,
    hasEvening: !!hasEvening,
    totalOverrides,
    stockUsage: nextUsage,
    updatedAt: savedAt,
    updatedBy: userId,
  }

  if (slotEdits.morning || slotEdits.evening) {
    payload.slotEdits = {}
    if (slotEdits.morning) payload.slotEdits.morning = slotEdits.morning
    if (slotEdits.evening) payload.slotEdits.evening = slotEdits.evening
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

/**
 * Admin / kitchen lead: set or clear adjusted total (null clears).
 * Stores { total, baseline } so later votes keep the same difference:
 * display = liveVotes + (total − baseline).
 */
export async function setMenuTotalOverride(
  dateId,
  slot,
  itemId,
  total,
  { baseline } = {},
) {
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

  const baselineNum = Number(baseline)
  const payload =
    Number.isFinite(baselineNum) && baselineNum >= 0
      ? { total: num, baseline: baselineNum }
      : num

  await setDoc(
    ref,
    {
      totalOverrides: {
        [slot]: {
          [itemId]: payload,
        },
      },
    },
    { merge: true },
  )
}
