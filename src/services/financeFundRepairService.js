import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTION_STATUS, COLLECTIONS } from '../config/constants'
import { memberFullyPaidDue } from '../utils/financeLedger'
import { fromFundLinesFromSnapshots, fromFundPaymentId } from '../utils/financeSplit'
import {
  listAllDues,
  listCollections,
  repairIssueTimeRounding,
  syncIssueFromFund,
} from './financeCollectionService'
import { listAllPayments, syncLegacyRounding } from './financePaymentService'
import { getRoomWallet, listWalletMovements } from './roomWalletService'

function nowIso() {
  return new Date().toISOString()
}

function sumAmount(lines, predicate) {
  return (lines || []).reduce((sum, line) => {
    if (!predicate(line)) return sum
    return sum + (Number(line.amountPaise) || 0)
  }, 0)
}

export function countPendingFundFixes({ collections, dues, payments }) {
  let count = 0
  const colById = new Map((collections || []).map((item) => [item.id, item]))
  for (const collectionDoc of collections || []) {
    if (collectionDoc.fundApplied === true) count += 1
  }
  for (const due of dues || []) {
    const collectionDoc = colById.get(due.collectionId)
    if (!collectionDoc || collectionDoc.fundApplied === true) continue
    const delta = due.roundingDeltaPaise || 0
    if (delta === 0) continue
    const fullyPaid = memberFullyPaidDue(due, payments)
    if ((fullyPaid && due.walletApplied) || (!fullyPaid && !due.walletApplied)) {
      continue
    }
    count += 1
  }
  const payById = new Map((payments || []).map((payment) => [payment.id, payment]))
  for (const collectionDoc of collections || []) {
    if (collectionDoc.status === COLLECTION_STATUS.DRAFT) continue
    for (const line of fromFundLinesFromSnapshots(collectionDoc.expenseSnapshots)) {
      const payment = payById.get(fromFundPaymentId(collectionDoc.id, line.expenseId))
      if (!payment || payment.voided === true) count += 1
    }
  }
  return count
}

function parseRepair(snap) {
  const d = snap.data() || {}
  return {
    id: snap.id,
    startedAt: d.startedAt ?? d.createdAt ?? null,
    finishedAt: d.finishedAt ?? d.createdAt ?? null,
    createdAt: d.createdAt ?? d.finishedAt ?? null,
    actorId: d.actorId ?? null,
    actorName: d.actorName ?? '',
    checkedCollections: d.checkedCollections ?? 0,
    checkedDues: d.checkedDues ?? 0,
    changeCount: d.changeCount ?? 0,
    addedPaise: d.addedPaise ?? 0,
    removedPaise: d.removedPaise ?? 0,
    netPaise: d.netPaise ?? 0,
    balanceBeforePaise: d.balanceBeforePaise ?? 0,
    balanceAfterPaise: d.balanceAfterPaise ?? 0,
    status: d.status || 'ok',
    lines: Array.isArray(d.lines) ? d.lines : [],
    errors: Array.isArray(d.errors) ? d.errors : [],
  }
}

export async function listFundRepairs(max = 10) {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.FINANCE_FUND_REPAIRS),
      orderBy('createdAt', 'desc'),
      limit(max),
    ),
  )
  return snap.docs.map(parseRepair)
}

export async function runFundRepair({ actorId, actorName } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }

  const startedAt = nowIso()
  const [
    collections,
    dues,
    payments,
    walletMovements,
    walletBefore,
  ] = await Promise.all([
    listCollections(),
    listAllDues(),
    listAllPayments(),
    listWalletMovements(),
    getRoomWallet(),
  ])

  const issueResult = await repairIssueTimeRounding({
    collections,
    dues,
    walletMovements,
    actorId,
    actorName,
  })

  let collectionsForSync = collections
  let duesForSync = dues
  if (issueResult.count > 0) {
    const [freshCollections, freshDues] = await Promise.all([
      listCollections(),
      listAllDues(),
    ])
    collectionsForSync = freshCollections
    duesForSync = freshDues
  }

  const payResult = await syncLegacyRounding({
    collections: collectionsForSync,
    dues: duesForSync,
    payments,
    actorId,
  })

  const fromFundResult = await syncIssueFromFund({
    collections: collectionsForSync,
    payments,
    walletMovements,
    actorId,
    actorName,
  })

  const walletAfter = await getRoomWallet()
  const finishedAt = nowIso()
  const lines = [
    ...(issueResult.lines || []),
    ...(payResult.lines || []),
    ...(fromFundResult.lines || []),
  ]
  const errors = [
    ...(issueResult.errors || []),
    ...(payResult.errors || []),
    ...(fromFundResult.errors || []),
  ]
  const addedPaise = sumAmount(lines, (line) => (line.amountPaise || 0) > 0)
  const removedPaise = Math.abs(sumAmount(lines, (line) => (line.amountPaise || 0) < 0))
  const netPaise = sumAmount(lines, () => true)
  const status = errors.length === 0 ? 'ok' : lines.length ? 'partial' : 'error'

  const report = {
    startedAt,
    finishedAt,
    createdAt: finishedAt,
    actorId: actorId || null,
    actorName: (actorName || '').trim(),
    checkedCollections: (collections || []).length,
    checkedDues: (dues || []).length,
    changeCount: lines.length,
    addedPaise,
    removedPaise,
    netPaise,
    balanceBeforePaise: walletBefore?.balancePaise || 0,
    balanceAfterPaise: walletAfter?.balancePaise || 0,
    status,
    lines,
    errors,
  }

  const batch = writeBatch(db)
  const ref = doc(collection(db, COLLECTIONS.FINANCE_FUND_REPAIRS))
  try {
    batch.set(ref, report)
    await batch.commit()
    return { ...report, id: ref.id }
  } catch (err) {
    console.warn('Could not save fund repair history.', err)
    return { ...report, id: null }
  }
}
