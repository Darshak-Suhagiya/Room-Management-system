import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import {
  COLLECTIONS,
  MEMBER_WALLET_REASONS,
} from '../config/constants'

function nowIso() {
  return new Date().toISOString()
}

export function parseMemberWallet(snap) {
  if (!snap?.exists()) {
    return { id: snap?.id, userId: snap?.id, balancePaise: 0, updatedAt: null }
  }
  const d = snap.data() || {}
  return {
    id: snap.id,
    userId: snap.id,
    balancePaise: typeof d.balancePaise === 'number' ? d.balancePaise : 0,
    updatedAt: d.updatedAt ?? null,
  }
}

export function parseMemberWalletMovement(snap) {
  const d = snap.data() || {}
  return {
    id: snap.id,
    userId: d.userId,
    amountPaise: d.amountPaise ?? 0,
    reason: d.reason,
    refType: d.refType ?? null,
    refId: d.refId ?? null,
    note: d.note ?? '',
    createdAt: d.createdAt ?? null,
    createdBy: d.createdBy ?? null,
    createdByName: d.createdByName ?? '',
    collectionTitle: d.collectionTitle ?? '',
  }
}

export function carryMovementId(collectionId, userId) {
  return `carry_${collectionId}_${userId}`
}

export function settleMovementId(collectionId, userId) {
  return `settle_${collectionId}_${userId}`
}

export function waiveMovementId(dueId, cycle = 0) {
  return `waive_${dueId}_${cycle}`
}

export function unwaiveMovementId(dueId, cycle = 0) {
  return `unwaive_${dueId}_${cycle}`
}

export function repayMovementId(requestId) {
  return `repay_${requestId}`
}

export async function getMemberWallet(userId) {
  if (!isFirebaseConfigured || !db || !userId) {
    return { id: userId, userId, balancePaise: 0, updatedAt: null }
  }
  const snap = await getDoc(doc(db, COLLECTIONS.MEMBER_WALLETS, userId))
  if (!snap.exists()) {
    return { id: userId, userId, balancePaise: 0, updatedAt: null }
  }
  return parseMemberWallet(snap)
}

export async function listMemberWallets() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.MEMBER_WALLETS))
  return snap.docs.map(parseMemberWallet)
}

export async function listMemberWalletsByIds(userIds) {
  const unique = [...new Set((userIds || []).filter(Boolean))]
  if (!isFirebaseConfigured || !db) {
    return unique.map((id) => ({ id, userId: id, balancePaise: 0, updatedAt: null }))
  }
  const wallets = await Promise.all(unique.map((id) => getMemberWallet(id)))
  return wallets
}

export async function listMemberWalletMovements(userId, { max } = {}) {
  if (!isFirebaseConfigured || !db || !userId) return []
  const col = collection(db, COLLECTIONS.MEMBER_WALLET_MOVEMENTS)
  const snap = max
    ? await getDocs(
        query(
          col,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(max),
        ),
      )
    : await getDocs(query(col, where('userId', '==', userId)))
  const items = snap.docs.map(parseMemberWalletMovement)
  return items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export async function listAllMemberWalletMovements({ max } = {}) {
  if (!isFirebaseConfigured || !db) return []
  const col = collection(db, COLLECTIONS.MEMBER_WALLET_MOVEMENTS)
  const snap = max
    ? await getDocs(query(col, orderBy('createdAt', 'desc'), limit(max)))
    : await getDocs(col)
  return snap.docs.map(parseMemberWalletMovement)
}

export async function listMemberWalletMovementsPage({ max = 20, cursor = null, userId } = {}) {
  if (!isFirebaseConfigured || !db) {
    return { items: [], cursor: null, hasMore: false }
  }
  const col = collection(db, COLLECTIONS.MEMBER_WALLET_MOVEMENTS)
  const constraints = userId
    ? [where('userId', '==', userId), orderBy('createdAt', 'desc')]
    : [orderBy('createdAt', 'desc')]
  const snap = await getDocs(
    cursor
      ? query(col, ...constraints, startAfter(cursor), limit(max))
      : query(col, ...constraints, limit(max)),
  )
  return {
    items: snap.docs.map(parseMemberWalletMovement),
    cursor: snap.docs.at(-1) || null,
    hasMore: snap.docs.length === max,
  }
}

const BATCH_LIMIT = 150

export async function applyMemberWalletDeltas(entries, { actorId, actorName } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const pending = (entries || []).filter((entry) => {
    const amount = Math.round(Number(entry.amountPaise) || 0)
    return entry.userId && amount !== 0 && entry.movementId
  })
  if (pending.length === 0) return { applied: 0, skipped: 0 }

  let applied = 0
  let skipped = 0
  for (let i = 0; i < pending.length; i += BATCH_LIMIT) {
    const chunk = pending.slice(i, i + BATCH_LIMIT)
    const movementSnaps = await Promise.all(
      chunk.map((entry) =>
        getDoc(doc(db, COLLECTIONS.MEMBER_WALLET_MOVEMENTS, entry.movementId)),
      ),
    )
    const fresh = []
    movementSnaps.forEach((snap, index) => {
      if (snap.exists()) skipped += 1
      else fresh.push(chunk[index])
    })
    if (fresh.length === 0) continue

    const userIds = [...new Set(fresh.map((entry) => entry.userId))]
    const walletSnaps = await Promise.all(
      userIds.map((id) => getDoc(doc(db, COLLECTIONS.MEMBER_WALLETS, id))),
    )
    const balances = new Map()
    userIds.forEach((id, index) => {
      const snap = walletSnaps[index]
      balances.set(id, snap.exists() ? Number(snap.data().balancePaise) || 0 : 0)
    })

    const at = nowIso()
    const batch = writeBatch(db)
    for (const entry of fresh) {
      const amount = Math.round(Number(entry.amountPaise) || 0)
      const nextBalance = (balances.get(entry.userId) || 0) + amount
      balances.set(entry.userId, nextBalance)
      batch.set(doc(db, COLLECTIONS.MEMBER_WALLET_MOVEMENTS, entry.movementId), {
        userId: entry.userId,
        amountPaise: amount,
        reason: entry.reason || MEMBER_WALLET_REASONS.ADJUST,
        refType: entry.refType || null,
        refId: entry.refId || null,
        note: (entry.note || '').trim(),
        collectionTitle: entry.collectionTitle || '',
        createdAt: at,
        createdBy: actorId || null,
        createdByName: (actorName || '').trim(),
      })
      batch.set(
        doc(db, COLLECTIONS.MEMBER_WALLETS, entry.userId),
        { balancePaise: nextBalance, updatedAt: at },
        { merge: true },
      )
      applied += 1
    }
    await batch.commit()
  }
  return { applied, skipped }
}

export async function applyMemberWalletMovement({
  userId,
  amountPaise,
  reason,
  note,
  actorId,
  actorName,
  refType,
  refId,
  movementId,
  collectionTitle,
}) {
  const id =
    movementId ||
    doc(collection(db, COLLECTIONS.MEMBER_WALLET_MOVEMENTS)).id
  await applyMemberWalletDeltas(
    [
      {
        userId,
        amountPaise,
        reason: reason || MEMBER_WALLET_REASONS.ADJUST,
        note,
        refType,
        refId,
        movementId: id,
        collectionTitle,
      },
    ],
    { actorId, actorName },
  )
  return getMemberWallet(userId)
}
