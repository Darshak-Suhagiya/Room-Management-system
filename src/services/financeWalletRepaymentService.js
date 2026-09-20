import {
  collection,
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
import {
  COLLECTIONS,
  MEMBER_WALLET_REASONS,
  PAYMENT_METHODS,
  WALLET_MOVEMENT_REASONS,
  WALLET_REPAYMENT_STATUS,
} from '../config/constants'
import { currentDateId } from '../utils/money'
import { applyMemberWalletDeltas, getMemberWallet, repayMovementId } from './memberWalletService'
import { applyWalletMovement } from './roomWalletService'

function nowIso() {
  return new Date().toISOString()
}

export function parseWalletRepayment(snap) {
  const d = snap.data() || {}
  return {
    id: snap.id,
    userId: d.userId,
    userName: d.userName || '',
    amountPaise: d.amountPaise ?? 0,
    method: d.method || PAYMENT_METHODS.OTHER,
    note: d.note || '',
    paidOn: d.paidOn || null,
    status: d.status || WALLET_REPAYMENT_STATUS.PENDING,
    createdAt: d.createdAt || null,
    createdBy: d.createdBy || null,
    createdByName: d.createdByName || '',
    decidedAt: d.decidedAt || null,
    decidedBy: d.decidedBy || null,
    decidedByName: d.decidedByName || '',
    decisionNote: d.decisionNote || '',
  }
}

export async function listPendingWalletRepayments() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.FINANCE_WALLET_REPAYMENTS),
      where('status', '==', WALLET_REPAYMENT_STATUS.PENDING),
      orderBy('createdAt', 'desc'),
    ),
  )
  return snap.docs.map(parseWalletRepayment)
}

export async function listWalletRepaymentsForUser(userId) {
  if (!isFirebaseConfigured || !db || !userId) return []
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.FINANCE_WALLET_REPAYMENTS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    ),
  )
  return snap.docs.map(parseWalletRepayment)
}

export async function requestWalletRepayment({
  userId,
  userName,
  amountPaise,
  method,
  note,
  paidOn,
  actorId,
  actorName,
}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  if (!userId) throw new Error('Pick a person.')
  const amount = Math.round(Number(amountPaise))
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter an amount greater than 0.')
  }
  const pending = await listWalletRepaymentsForUser(userId)
  if (pending.some((item) => item.status === WALLET_REPAYMENT_STATUS.PENDING)) {
    throw new Error('A repayment request is already waiting for approval.')
  }
  const wallet = await getMemberWallet(userId)
  const arrears = Math.max(0, -(wallet.balancePaise || 0))
  if (arrears <= 0) {
    throw new Error('This wallet has nothing remaining to pay.')
  }
  if (amount > arrears) {
    throw new Error('That is more than the remaining wallet amount.')
  }
  const at = nowIso()
  const ref = doc(collection(db, COLLECTIONS.FINANCE_WALLET_REPAYMENTS))
  await setDoc(ref, {
    userId,
    userName: (userName || '').trim(),
    amountPaise: amount,
    method: method || PAYMENT_METHODS.OTHER,
    note: (note || '').trim(),
    paidOn: paidOn || currentDateId(),
    status: WALLET_REPAYMENT_STATUS.PENDING,
    createdAt: at,
    createdBy: actorId || userId,
    createdByName: (actorName || '').trim(),
    decidedAt: null,
    decidedBy: null,
    decidedByName: '',
    decisionNote: '',
  })
  return ref.id
}

export async function cancelWalletRepayment(requestId, { actorId } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const ref = doc(db, COLLECTIONS.FINANCE_WALLET_REPAYMENTS, requestId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Request not found.')
  const item = parseWalletRepayment(snap)
  if (item.status !== WALLET_REPAYMENT_STATUS.PENDING) {
    throw new Error('This request is no longer pending.')
  }
  if (actorId && item.userId !== actorId && item.createdBy !== actorId) {
    throw new Error('You can only cancel your own request.')
  }
  await updateDoc(ref, {
    status: WALLET_REPAYMENT_STATUS.CANCELLED,
    decidedAt: nowIso(),
    decidedBy: actorId || null,
    decisionNote: 'Cancelled',
  })
}

export async function rejectWalletRepayment(requestId, { actorId, actorName, note } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const ref = doc(db, COLLECTIONS.FINANCE_WALLET_REPAYMENTS, requestId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Request not found.')
  const item = parseWalletRepayment(snap)
  if (item.status !== WALLET_REPAYMENT_STATUS.PENDING) {
    throw new Error('This request is no longer pending.')
  }
  await updateDoc(ref, {
    status: WALLET_REPAYMENT_STATUS.REJECTED,
    decidedAt: nowIso(),
    decidedBy: actorId || null,
    decidedByName: (actorName || '').trim(),
    decisionNote: (note || '').trim(),
  })
}

export async function approveWalletRepayment(requestId, { actorId, actorName, note } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const ref = doc(db, COLLECTIONS.FINANCE_WALLET_REPAYMENTS, requestId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Request not found.')
  const item = parseWalletRepayment(snap)
  if (item.status !== WALLET_REPAYMENT_STATUS.PENDING) {
    throw new Error('This request is no longer pending.')
  }
  const amount = item.amountPaise || 0
  if (amount <= 0) throw new Error('Invalid repayment amount.')

  await applyMemberWalletDeltas(
    [
      {
        userId: item.userId,
        amountPaise: amount,
        reason: MEMBER_WALLET_REASONS.REPAY,
        refType: 'financeWalletRepayment',
        refId: item.id,
        movementId: repayMovementId(item.id),
        note: item.note || 'Paid remaining wallet to the room fund',
      },
    ],
    { actorId, actorName },
  )
  await applyWalletMovement({
    amountPaise: amount,
    reason: WALLET_MOVEMENT_REASONS.REPAY,
    note: item.note || `${item.userName || 'Member'} repaid wallet remaining`,
    actorId,
    actorName,
    refType: 'financeWalletRepayment',
    refId: item.id,
    userId: item.userId,
    userName: item.userName,
    allowNegative: true,
    movementId: `repay_fund_${item.id}`,
  })
  await updateDoc(ref, {
    status: WALLET_REPAYMENT_STATUS.APPROVED,
    decidedAt: nowIso(),
    decidedBy: actorId || null,
    decidedByName: (actorName || '').trim(),
    decisionNote: (note || '').trim(),
  })
}
