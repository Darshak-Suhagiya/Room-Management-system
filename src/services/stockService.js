import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import {
  COLLECTIONS,
  DEFAULT_STOCK_GROUPS,
  STOCK_ITERATION_PERIODS,
  STOCK_MOVEMENT_REASONS,
  STOCK_UNITS,
} from '../config/constants'

function nowIso() {
  return new Date().toISOString()
}

function parseGroup(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    name: d.name ?? '',
    linkToMenu: d.linkToMenu === true,
    editorUserIds: Array.isArray(d.editorUserIds) ? d.editorUserIds : [],
    order: typeof d.order === 'number' ? d.order : 0,
    createdAt: d.createdAt ?? null,
    createdBy: d.createdBy ?? null,
  }
}

function parseItem(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    groupId: d.groupId ?? '',
    name: d.name ?? '',
    unit: d.unit || STOCK_UNITS.KG,
    quantity: normalizeStockNumber(d.quantity, d.unit || STOCK_UNITS.KG),
    needPerIteration: normalizeStockNumber(
      d.needPerIteration,
      d.unit || STOCK_UNITS.KG,
    ),
    iterationPeriod: d.iterationPeriod || STOCK_ITERATION_PERIODS.WEEK,
    lastFilledAt: d.lastFilledAt ?? null,
    lastUsedAt: d.lastUsedAt ?? null,
    menuItemIds: Array.isArray(d.menuItemIds) ? d.menuItemIds : [],
    updatedAt: d.updatedAt ?? null,
  }
}

export function stockSliderBounds(needPerIteration, unit = STOCK_UNITS.KG) {
  const need = normalizeStockNumber(needPerIteration, unit)
  const fallback =
    unit === STOCK_UNITS.COUNT ? 10 : unit === STOCK_UNITS.G ? 1000 : 10
  const mid = need > 0 ? need : fallback
  return { min: 0, mid, max: normalizeStockNumber(mid * 2, unit) }
}

/** Round qty for the unit (avoids float display/storage junk like 3.399999…). */
export function normalizeStockNumber(qty, unit = STOCK_UNITS.KG) {
  const n = Number(qty)
  if (!Number.isFinite(n)) return 0
  if (unit === STOCK_UNITS.COUNT || unit === STOCK_UNITS.G) {
    return Math.round(n)
  }
  return Math.round(n * 100) / 100
}

export function formatStockQty(qty, unit) {
  const n = normalizeStockNumber(qty, unit)
  if (unit === STOCK_UNITS.COUNT || unit === STOCK_UNITS.G) {
    return String(n)
  }
  // Trim trailing zeros: 1.60 → 1.6, 5.00 → 5
  return String(parseFloat(n.toFixed(2)))
}

export async function ensureDefaultStockGroups(userId) {
  if (!isFirebaseConfigured || !db) return []
  const existing = await listStockGroups()
  if (existing.length > 0) return existing

  const batch = writeBatch(db)
  const created = []
  for (const g of DEFAULT_STOCK_GROUPS) {
    const ref = doc(db, COLLECTIONS.STOCK_GROUPS, g.id)
    const payload = {
      name: g.name,
      linkToMenu: g.linkToMenu,
      editorUserIds: [],
      order: g.order,
      createdAt: nowIso(),
      createdBy: userId || null,
    }
    batch.set(ref, payload)
    created.push({ id: g.id, ...payload })
  }
  await batch.commit()
  return created
}

export async function listStockGroups() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.STOCK_GROUPS))
  return snap.docs.map(parseGroup).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

export async function createStockGroup({ name, linkToMenu }, userId) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('Group name is required')
  const groups = await listStockGroups()
  const order = groups.reduce((m, g) => Math.max(m, g.order), -1) + 1
  const ref = doc(collection(db, COLLECTIONS.STOCK_GROUPS))
  const payload = {
    name: trimmed,
    linkToMenu: !!linkToMenu,
    editorUserIds: [],
    order,
    createdAt: nowIso(),
    createdBy: userId || null,
  }
  await setDoc(ref, payload)
  return { id: ref.id, ...payload }
}

export async function updateStockGroup(groupId, patch) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')
  const data = {}
  if (patch.name != null) data.name = String(patch.name).trim()
  if (patch.linkToMenu != null) data.linkToMenu = !!patch.linkToMenu
  if (patch.editorUserIds != null) {
    data.editorUserIds = [...new Set(patch.editorUserIds)]
  }
  if (patch.order != null) data.order = Number(patch.order)
  await updateDoc(doc(db, COLLECTIONS.STOCK_GROUPS, groupId), data)
  const snap = await getDoc(doc(db, COLLECTIONS.STOCK_GROUPS, groupId))
  return snap.exists() ? parseGroup(snap) : null
}

export async function deleteStockGroup(groupId) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')
  const items = await listStockItems(groupId)
  const batch = writeBatch(db)
  for (const item of items) {
    batch.delete(doc(db, COLLECTIONS.STOCK_ITEMS, item.id))
  }
  batch.delete(doc(db, COLLECTIONS.STOCK_GROUPS, groupId))
  await batch.commit()
}

export async function listStockItems(groupId = null) {
  if (!isFirebaseConfigured || !db) return []
  let snap
  if (groupId) {
    snap = await getDocs(
      query(
        collection(db, COLLECTIONS.STOCK_ITEMS),
        where('groupId', '==', groupId),
      ),
    )
  } else {
    snap = await getDocs(collection(db, COLLECTIONS.STOCK_ITEMS))
  }
  return snap.docs
    .map(parseItem)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function listStockItemsLinkedToMenuItems(menuItemIds) {
  if (!menuItemIds?.length) return []
  const all = await listStockItems()
  const set = new Set(menuItemIds)
  return all.filter((item) => (item.menuItemIds ?? []).some((id) => set.has(id)))
}

export async function getStockItem(itemId) {
  if (!isFirebaseConfigured || !db) return null
  const snap = await getDoc(doc(db, COLLECTIONS.STOCK_ITEMS, itemId))
  if (!snap.exists()) return null
  return parseItem(snap)
}

export async function createStockItem(
  {
    groupId,
    name,
    unit = STOCK_UNITS.KG,
    quantity = 0,
    needPerIteration = 0,
    iterationPeriod = STOCK_ITERATION_PERIODS.WEEK,
    menuItemIds = [],
  },
  userId,
) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('Item name is required')
  if (!groupId) throw new Error('Group is required')
  const ref = doc(collection(db, COLLECTIONS.STOCK_ITEMS))
  const payload = {
    groupId,
    name: trimmed,
    unit,
    quantity: Math.max(0, Number(quantity) || 0),
    needPerIteration: Math.max(0, Number(needPerIteration) || 0),
    iterationPeriod,
    lastFilledAt: null,
    lastUsedAt: null,
    menuItemIds: [...new Set(menuItemIds)],
    updatedAt: nowIso(),
    createdBy: userId || null,
  }
  await setDoc(ref, payload)
  return { id: ref.id, ...payload }
}

export async function updateStockItem(itemId, patch) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')
  const data = { updatedAt: nowIso() }
  if (patch.name != null) data.name = String(patch.name).trim()
  if (patch.unit != null) data.unit = patch.unit
  if (patch.needPerIteration != null) {
    data.needPerIteration = Math.max(0, Number(patch.needPerIteration) || 0)
  }
  if (patch.iterationPeriod != null) data.iterationPeriod = patch.iterationPeriod
  if (patch.menuItemIds != null) {
    data.menuItemIds = [...new Set(patch.menuItemIds)]
  }
  if (patch.quantity != null) {
    data.quantity = Math.max(0, Number(patch.quantity) || 0)
  }
  await updateDoc(doc(db, COLLECTIONS.STOCK_ITEMS, itemId), data)
  return getStockItem(itemId)
}

export async function deleteStockItem(itemId) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')
  await deleteDoc(doc(db, COLLECTIONS.STOCK_ITEMS, itemId))
}

function appendMovement(batch, {
  itemId,
  delta,
  reason,
  refType = null,
  refId = null,
  note = '',
  userId,
}) {
  const ref = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS))
  batch.set(ref, {
    itemId,
    delta,
    reason,
    refType,
    refId,
    note: note || '',
    createdAt: nowIso(),
    createdBy: userId || null,
  })
}

/**
 * Adjust stock by absolute target quantity (or use setAbsolute).
 * positive delta = fill, negative = use.
 */
export async function applyStockDelta(
  itemId,
  delta,
  { reason, userId, refType, refId, note } = {},
) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')
  const itemRef = doc(db, COLLECTIONS.STOCK_ITEMS, itemId)
  const snap = await getDoc(itemRef)
  if (!snap.exists()) throw new Error('Stock item not found')
  const item = parseItem(snap)
  const deltaNum = normalizeStockNumber(delta, item.unit)
  const nextQty = Math.max(0, normalizeStockNumber(item.quantity + deltaNum, item.unit))
  const batch = writeBatch(db)
  const patch = {
    quantity: nextQty,
    updatedAt: nowIso(),
  }
  if (deltaNum > 0) patch.lastFilledAt = nowIso()
  if (deltaNum < 0) patch.lastUsedAt = nowIso()
  batch.update(itemRef, patch)
  appendMovement(batch, {
    itemId,
    delta: deltaNum,
    reason: reason || (deltaNum >= 0 ? STOCK_MOVEMENT_REASONS.FILL : STOCK_MOVEMENT_REASONS.USE),
    refType,
    refId,
    note,
    userId,
  })
  await batch.commit()
  return { ...item, ...patch, quantity: nextQty }
}

export async function setStockQuantity(
  itemId,
  quantity,
  { reason, userId, note } = {},
) {
  const item = await getStockItem(itemId)
  if (!item) throw new Error('Stock item not found')
  const delta = Number(quantity) - item.quantity
  if (delta === 0) return item
  return applyStockDelta(itemId, delta, {
    reason:
      reason ||
      (delta > 0 ? STOCK_MOVEMENT_REASONS.FILL : STOCK_MOVEMENT_REASONS.USE),
    userId,
    note,
  })
}

/**
 * Reverse previous plan usage then apply new maps.
 * previousUsage / nextUsage: { morning?: { [itemId]: qty }, evening?: { [itemId]: qty } }
 */
export async function applyPlanStockUsage({
  dateId,
  previousUsage,
  nextUsage,
  userId,
}) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')

  const prev = previousUsage || { morning: {}, evening: {} }
  const next = nextUsage || { morning: {}, evening: {} }

  const netByItem = {}

  for (const slot of ['morning', 'evening']) {
    const prevMap = prev[slot] || {}
    const nextMap = next[slot] || {}
    for (const [itemId, amt] of Object.entries(prevMap)) {
      const a = Number(amt) || 0
      if (a === 0) continue
      netByItem[itemId] = (netByItem[itemId] || 0) + a // reverse = add back
    }
    for (const [itemId, amt] of Object.entries(nextMap)) {
      const a = Number(amt) || 0
      if (a === 0) continue
      netByItem[itemId] = (netByItem[itemId] || 0) - a // consume = subtract
    }
  }

  const itemIds = Object.keys(netByItem).filter((id) => netByItem[id] !== 0)
  if (itemIds.length === 0) return

  // Process in batches of ~200 ops (each item = 1 update + up to 2 movements)
  const batch = writeBatch(db)
  let ops = 0

  for (const itemId of itemIds) {
    const net = netByItem[itemId]
    const itemRef = doc(db, COLLECTIONS.STOCK_ITEMS, itemId)
    const snap = await getDoc(itemRef)
    if (!snap.exists()) continue
    const item = parseItem(snap)
    const nextQty = Math.max(0, item.quantity + net)
    const patch = {
      quantity: nextQty,
      updatedAt: nowIso(),
    }
    if (net < 0) patch.lastUsedAt = nowIso()
    if (net > 0) patch.lastFilledAt = nowIso()
    batch.update(itemRef, patch)
    ops += 1

    // Log reverse of previous (positive) and consume of next (negative) separately when both happened
    const prevTotal =
      (Number(prev.morning?.[itemId]) || 0) + (Number(prev.evening?.[itemId]) || 0)
    const nextTotal =
      (Number(next.morning?.[itemId]) || 0) + (Number(next.evening?.[itemId]) || 0)

    if (prevTotal > 0) {
      appendMovement(batch, {
        itemId,
        delta: prevTotal,
        reason: STOCK_MOVEMENT_REASONS.PLAN_REVERSE,
        refType: 'menu',
        refId: dateId,
        userId,
      })
      ops += 1
    }
    if (nextTotal > 0) {
      appendMovement(batch, {
        itemId,
        delta: -nextTotal,
        reason: STOCK_MOVEMENT_REASONS.PLAN_CONSUME,
        refType: 'menu',
        refId: dateId,
        userId,
      })
      ops += 1
    }
  }

  if (ops > 0) await batch.commit()
}

export function normalizeStockUsage(raw) {
  if (!raw || typeof raw !== 'object') {
    return { morning: {}, evening: {} }
  }
  const clean = (map) => {
    const out = {}
    if (!map || typeof map !== 'object') return out
    for (const [k, v] of Object.entries(map)) {
      const n = Number(v)
      if (Number.isFinite(n) && n > 0) out[k] = n
    }
    return out
  }
  return {
    morning: clean(raw.morning),
    evening: clean(raw.evening),
  }
}
