import { doc, updateDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTIONS, COLLECTION_STATUS, MEMBER_WALLET_REASONS } from '../config/constants'
import { listAllDues, listCollections } from './financeCollectionService'
import { listAllPayments } from './financePaymentService'
import {
  applyMemberWalletDeltas,
  listMemberWallets,
  settleMovementId,
} from './memberWalletService'
import { settlePaiseFor } from '../utils/financeLedger'

function nowIso() {
  return new Date().toISOString()
}

export function previewMemberWalletBackfill({
  collections = [],
  dues = [],
  payments = [],
  wallets = [],
} = {}) {
  const closed = (collections || []).filter(
    (item) => item.status === COLLECTION_STATUS.CLOSED && !item.settledAt,
  )
  const duesByCollection = new Map()
  for (const due of dues || []) {
    if (!duesByCollection.has(due.collectionId)) duesByCollection.set(due.collectionId, [])
    duesByCollection.get(due.collectionId).push(due)
  }
  const lines = []
  const balanceByUser = new Map(
    (wallets || []).map((wallet) => [wallet.userId || wallet.id, wallet.balancePaise || 0]),
  )
  const closedSorted = [...closed].sort((a, b) =>
    String(a.closedAt || a.issuedAt || a.createdAt || '').localeCompare(
      String(b.closedAt || b.issuedAt || b.createdAt || ''),
    ),
  )
  for (const collectionDoc of closedSorted) {
    for (const due of duesByCollection.get(collectionDoc.id) || []) {
      const amountPaise = settlePaiseFor(due, payments)
      if (!amountPaise) continue
      const before = balanceByUser.get(due.userId) || 0
      const after = before + amountPaise
      balanceByUser.set(due.userId, after)
      lines.push({
        collectionId: collectionDoc.id,
        collectionTitle: collectionDoc.title || '',
        dueId: due.id,
        userId: due.userId,
        userName: due.userName || '',
        amountPaise,
        balanceBeforePaise: before,
        balanceAfterPaise: after,
      })
    }
  }
  return {
    closedCount: closed.length,
    changeCount: lines.length,
    lines,
    balances: [...balanceByUser.entries()].map(([userId, balancePaise]) => ({
      userId,
      balancePaise,
    })),
  }
}

export async function runMemberWalletBackfill({ actorId, actorName } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const [collections, dues, payments, wallets] = await Promise.all([
    listCollections(),
    listAllDues(),
    listAllPayments(),
    listMemberWallets(),
  ])
  const preview = previewMemberWalletBackfill({ collections, dues, payments, wallets })
  const entries = preview.lines.map((line) => ({
    userId: line.userId,
    amountPaise: line.amountPaise,
    reason: MEMBER_WALLET_REASONS.SETTLE,
    refType: 'financeCollection',
    refId: line.collectionId,
    movementId: settleMovementId(line.collectionId, line.userId),
    note: 'Backfill: leftover from a closed collection',
    collectionTitle: line.collectionTitle,
  }))
  if (entries.length) {
    await applyMemberWalletDeltas(entries, { actorId, actorName })
  }
  const at = nowIso()
  const closed = collections.filter(
    (item) => item.status === COLLECTION_STATUS.CLOSED && !item.settledAt,
  )
  await Promise.all(
    closed.map((item) =>
      updateDoc(doc(db, COLLECTIONS.FINANCE_COLLECTIONS, item.id), {
        settledAt: item.closedAt || at,
        updatedAt: at,
      }),
    ),
  )
  return preview
}