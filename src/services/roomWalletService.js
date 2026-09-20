import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTIONS, WALLET_MOVEMENT_REASONS } from '../config/constants'
import { currentDateId } from '../utils/money'

function nowIso() {
  return new Date().toISOString()
}

const WALLET_DOC = 'default'

function parseWallet(snap) {
  if (!snap?.exists()) {
    return { id: WALLET_DOC, balancePaise: 0, updatedAt: null }
  }
  const d = snap.data() || {}
  return {
    id: snap.id,
    balancePaise: typeof d.balancePaise === 'number' ? d.balancePaise : 0,
    updatedAt: d.updatedAt ?? null,
  }
}

function parseMovement(snap) {
  const d = snap.data() || {}
  return {
    id: snap.id,
    amountPaise: d.amountPaise ?? 0,
    reason: d.reason,
    refType: d.refType ?? null,
    refId: d.refId ?? null,
    userId: d.userId ?? null,
    userName: d.userName ?? '',
    note: d.note ?? '',
    occurredOn: d.occurredOn ?? null,
    createdAt: d.createdAt ?? null,
    createdBy: d.createdBy ?? null,
    createdByName: d.createdByName ?? '',
  }
}

export async function getRoomWallet() {
  if (!isFirebaseConfigured || !db) {
    return { id: WALLET_DOC, balancePaise: 0, updatedAt: null }
  }
  const snap = await getDoc(doc(db, COLLECTIONS.ROOM_WALLET, WALLET_DOC))
  return parseWallet(snap)
}

export async function listWalletMovements({ max } = {}) {
  if (!isFirebaseConfigured || !db) return []
  const col = collection(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS)
  const snap = max
    ? await getDocs(query(col, orderBy('createdAt', 'desc'), limit(max)))
    : await getDocs(col)
  const items = snap.docs.map(parseMovement)
  if (max) return items
  return items.sort((a, b) => {
    const da = a.occurredOn || String(a.createdAt || '').slice(0, 10)
    const dbDate = b.occurredOn || String(b.createdAt || '').slice(0, 10)
    const cmp = String(dbDate).localeCompare(String(da))
    if (cmp !== 0) return cmp
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  })
}

export async function listWalletMovementsPage({ max = 20, cursor = null } = {}) {
  if (!isFirebaseConfigured || !db) {
    return { items: [], cursor: null, hasMore: false }
  }
  const col = collection(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS)
  const snap = await getDocs(
    cursor
      ? query(col, orderBy('createdAt', 'desc'), startAfter(cursor), limit(max))
      : query(col, orderBy('createdAt', 'desc'), limit(max)),
  )
  return {
    items: snap.docs.map(parseMovement),
    cursor: snap.docs.at(-1) || null,
    hasMore: snap.docs.length === max,
  }
}

export async function applyWalletMovement({
  amountPaise,
  reason,
  note,
  actorId,
  actorName,
  occurredOn,
  refType,
  refId,
  userId,
  userName,
  movementId,
}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const delta = Math.round(Number(amountPaise))
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error('Enter a non-zero amount.')
  }
  const walletRef = doc(db, COLLECTIONS.ROOM_WALLET, WALLET_DOC)
  const snap = await getDoc(walletRef)
  const current = parseWallet(snap)
  const nextBalance = current.balancePaise + delta

  const at = nowIso()
  const batch = writeBatch(db)
  const moveRef = movementId
    ? doc(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS, movementId)
    : doc(collection(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS))
  if (movementId) {
    const existing = await getDoc(moveRef)
    if (existing.exists()) {
      return getRoomWallet()
    }
  }
  batch.set(moveRef, {
    amountPaise: delta,
    reason: reason || WALLET_MOVEMENT_REASONS.ADJUST,
    refType: refType || null,
    refId: refId || null,
    userId: userId || null,
    userName: (userName || '').trim(),
    note: (note || '').trim(),
    occurredOn: occurredOn || currentDateId(),
    createdAt: at,
    createdBy: actorId || null,
    createdByName: actorName || '',
  })
  batch.set(
    walletRef,
    {
      balancePaise: nextBalance,
      updatedAt: at,
    },
    { merge: true },
  )
  await batch.commit()
  return getRoomWallet()
}

const BATCH_LIMIT = 150

export async function applyRoomWalletDeltas(entries, { actorId, actorName } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const pending = (entries || []).filter((entry) => {
    const amount = Math.round(Number(entry.amountPaise) || 0)
    return amount !== 0 && entry.movementId
  })
  if (pending.length === 0) return { applied: 0, skipped: 0 }

  let applied = 0
  let skipped = 0
  const walletRef = doc(db, COLLECTIONS.ROOM_WALLET, WALLET_DOC)
  for (let i = 0; i < pending.length; i += BATCH_LIMIT) {
    const chunk = pending.slice(i, i + BATCH_LIMIT)
    const movementSnaps = await Promise.all(
      chunk.map((entry) =>
        getDoc(doc(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS, entry.movementId)),
      ),
    )
    const fresh = []
    movementSnaps.forEach((snap, index) => {
      if (snap.exists()) skipped += 1
      else fresh.push(chunk[index])
    })
    if (fresh.length === 0) continue

    const walletSnap = await getDoc(walletRef)
    const current = parseWallet(walletSnap)
    let balance = current.balancePaise
    const at = nowIso()
    const batch = writeBatch(db)
    for (const entry of fresh) {
      const amount = Math.round(Number(entry.amountPaise) || 0)
      balance += amount
      batch.set(doc(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS, entry.movementId), {
        amountPaise: amount,
        reason: entry.reason || WALLET_MOVEMENT_REASONS.ADJUST,
        refType: entry.refType || null,
        refId: entry.refId || null,
        userId: entry.userId || null,
        userName: (entry.userName || '').trim(),
        note: (entry.note || '').trim(),
        occurredOn: entry.occurredOn || currentDateId(),
        createdAt: at,
        createdBy: actorId || null,
        createdByName: (actorName || '').trim(),
      })
    }
    batch.set(
      walletRef,
      { balancePaise: balance, updatedAt: at },
      { merge: true },
    )
    await batch.commit()
    applied += fresh.length
  }
  return { applied, skipped }
}
