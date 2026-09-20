import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import {
  COLLECTIONS,
  DEPOSIT_ACCOUNT_STATUS,
  DEPOSIT_MOVEMENT_TYPES,
} from '../config/constants'
import { clampNonNegative } from '../utils/money'

function nowIso() {
  return new Date().toISOString()
}

function parseAccount(snap) {
  const d = snap.data() || {}
  return {
    id: snap.id,
    userId: snap.id,
    balancePaise: typeof d.balancePaise === 'number' ? d.balancePaise : 0,
    expectedPaise: typeof d.expectedPaise === 'number' ? d.expectedPaise : 0,
    status: d.status || DEPOSIT_ACCOUNT_STATUS.ACTIVE,
    lastMovementAt: d.lastMovementAt ?? null,
    createdAt: d.createdAt ?? null,
    updatedAt: d.updatedAt ?? null,
  }
}

function parseMovement(snap) {
  const d = snap.data() || {}
  return {
    id: snap.id,
    userId: d.userId,
    type: d.type,
    amountPaise: d.amountPaise ?? 0,
    note: d.note ?? '',
    refType: d.refType ?? null,
    refId: d.refId ?? null,
    createdAt: d.createdAt ?? null,
    createdBy: d.createdBy ?? null,
  }
}

function statusFor(balancePaise, expectedPaise) {
  if (balancePaise <= 0) return DEPOSIT_ACCOUNT_STATUS.REFUNDED
  if (expectedPaise > 0 && balancePaise < expectedPaise) {
    return DEPOSIT_ACCOUNT_STATUS.PARTIAL
  }
  return DEPOSIT_ACCOUNT_STATUS.ACTIVE
}

export async function listDepositAccounts() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.DEPOSIT_ACCOUNTS))
  return snap.docs.map(parseAccount)
}

export async function getDepositAccount(userId) {
  if (!isFirebaseConfigured || !db) return null
  const snap = await getDoc(doc(db, COLLECTIONS.DEPOSIT_ACCOUNTS, userId))
  return snap.exists() ? parseAccount(snap) : null
}

export async function listDepositMovements(userId) {
  if (!isFirebaseConfigured || !db) return []
  const q = query(
    collection(db, COLLECTIONS.DEPOSIT_MOVEMENTS),
    where('userId', '==', userId),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(parseMovement)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

async function applyDepositMovement({
  userId,
  type,
  amountPaise,
  note,
  actorId,
  expectedPaise,
}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  if (!userId) throw new Error('Person is required.')
  const abs = Math.abs(Math.round(Number(amountPaise)))
  if (!Number.isFinite(abs) || abs < 0) {
    throw new Error('Enter a valid amount.')
  }
  if (type !== DEPOSIT_MOVEMENT_TYPES.ADJUST && abs === 0) {
    throw new Error('Enter an amount greater than 0.')
  }

  const accRef = doc(db, COLLECTIONS.DEPOSIT_ACCOUNTS, userId)
  const accSnap = await getDoc(accRef)
  const existing = accSnap.exists() ? parseAccount(accSnap) : null
  const currentBalance = existing?.balancePaise ?? 0
  const currentExpected = existing?.expectedPaise ?? 0

  let delta = abs
  if (type === DEPOSIT_MOVEMENT_TYPES.REPAY) delta = -abs
  else if (type === DEPOSIT_MOVEMENT_TYPES.ADJUST) {
    delta = Math.round(Number(amountPaise))
  }

  const nextBalance = currentBalance + delta
  if (nextBalance < 0) {
    throw new Error('Deposit balance cannot go below ₹0.')
  }

  let nextExpected = currentExpected
  if (typeof expectedPaise === 'number') {
    nextExpected = clampNonNegative(expectedPaise)
  } else if (
    type === DEPOSIT_MOVEMENT_TYPES.COLLECT ||
    type === DEPOSIT_MOVEMENT_TYPES.TOPUP
  ) {
    nextExpected = Math.max(currentExpected, nextBalance)
  }

  const at = nowIso()
  const batch = writeBatch(db)
  const moveRef = doc(collection(db, COLLECTIONS.DEPOSIT_MOVEMENTS))
  batch.set(moveRef, {
    userId,
    type,
    amountPaise: delta,
    note: (note || '').trim(),
    refType: null,
    refId: null,
    createdAt: at,
    createdBy: actorId || null,
  })
  const accountBody = {
    balancePaise: nextBalance,
    expectedPaise: nextExpected,
    status: statusFor(nextBalance, nextExpected),
    lastMovementAt: at,
    updatedAt: at,
    createdAt: existing?.createdAt || at,
  }
  if (!existing) accountBody.createdBy = actorId || null
  batch.set(accRef, accountBody, { merge: true })
  await batch.commit()
  return getDepositAccount(userId)
}

export function collectDeposit(userId, amountPaise, { note, actorId, expectedPaise } = {}) {
  return applyDepositMovement({
    userId,
    type: DEPOSIT_MOVEMENT_TYPES.COLLECT,
    amountPaise,
    note,
    actorId,
    expectedPaise,
  })
}

export function repayDeposit(userId, amountPaise, { note, actorId } = {}) {
  return applyDepositMovement({
    userId,
    type: DEPOSIT_MOVEMENT_TYPES.REPAY,
    amountPaise,
    note,
    actorId,
  })
}

export function topUpDeposit(userId, amountPaise, { note, actorId, expectedPaise } = {}) {
  return applyDepositMovement({
    userId,
    type: DEPOSIT_MOVEMENT_TYPES.TOPUP,
    amountPaise,
    note,
    actorId,
    expectedPaise,
  })
}

export function adjustDeposit(userId, amountPaise, { note, actorId, expectedPaise } = {}) {
  return applyDepositMovement({
    userId,
    type: DEPOSIT_MOVEMENT_TYPES.ADJUST,
    amountPaise,
    note,
    actorId,
    expectedPaise,
  })
}
