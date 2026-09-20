import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import {
  COLLECTIONS,
  COLLECTION_STATUS,
  DUE_STATUS,
  EXPENSE_STATUS,
  MEMBER_WALLET_REASONS,
  PAYMENT_METHODS,
  PAYMENT_SOURCES,
  WALLET_MOVEMENT_REASONS,
} from '../config/constants'
import {
  buildCollectionPreview,
  expenseFromFundPaise,
  fromFundLinesFromSnapshots,
  fromFundMovementId,
  fromFundPaiseFromSnapshots,
  fromFundPaymentId,
} from '../utils/financeSplit'
import { displayName, parseRoster, usablePersonName } from '../utils/financePeople'
import { currentDateId } from '../utils/money'
import {
  cookLeaveFundLinesFromSnapshots,
  cookLeaveFundMovementId,
  cookLeaveFundPaiseFromSnapshots,
  formatLeaveDays,
} from '../utils/cookLeave'
import { applyRoomWalletDeltas, getRoomWallet, listWalletMovements } from './roomWalletService'
import {
  applyMemberWalletDeltas,
  carryMovementId,
  listAllMemberWalletMovements,
  listMemberWalletsByIds,
  settleMovementId,
} from './memberWalletService'
import {
  carryInAppliedPaise,
  fundCoverPaiseFor,
  fundRecoverPaiseFor,
  isDueWaived,
  isRoomFundPayment,
  isVoidedPayment,
  paidPaiseForDue,
  payablePaiseFor,
  settlePaiseFor,
} from '../utils/financeLedger'

function nowIso() {
  return new Date().toISOString()
}

const WALLET_DOC = 'default'
const IN_QUERY_LIMIT = 30

async function mapInChunks(ids, mapper) {
  const unique = [...new Set((ids || []).filter(Boolean))]
  const out = []
  for (let i = 0; i < unique.length; i += IN_QUERY_LIMIT) {
    const chunk = unique.slice(i, i + IN_QUERY_LIMIT)
    out.push(...(await mapper(chunk)))
  }
  return out
}

export function dueDocId(collectionId, userId) {
  return `${collectionId}_${userId}`
}

export function parseCollection(snap) {
  const d = snap.data() || {}
  return {
    id: snap.id,
    title: d.title ?? '',
    periodId: d.periodId ?? '',
    periodIds: Array.isArray(d.periodIds) ? d.periodIds : d.periodId ? [d.periodId] : [],
    expenseIds: Array.isArray(d.expenseIds) ? d.expenseIds : [],
    expenseSnapshots: Array.isArray(d.expenseSnapshots) ? d.expenseSnapshots : [],
    roster: parseRoster(d.roster),
    roundRule: d.roundRule || { mode: 'exact' },
    dueDate: d.dueDate ?? null,
    status: d.status || COLLECTION_STATUS.DRAFT,
    totalExpensePaise: d.totalExpensePaise ?? 0,
    totalExactPaise: d.totalExactPaise ?? 0,
    totalDuePaise: d.totalDuePaise ?? 0,
    fundImpactPaise: d.fundImpactPaise ?? 0,
    cookLeaveFundPaise: d.cookLeaveFundPaise ?? 0,
    fromFundPaise: d.fromFundPaise ?? 0,
    fundApplied: d.fundApplied === true,
    fundMovementId: d.fundMovementId ?? null,
    personCount: d.personCount ?? 0,
    issuedAt: d.issuedAt ?? null,
    issuedBy: d.issuedBy ?? null,
    remindersSent: d.remindersSent && typeof d.remindersSent === 'object'
      ? d.remindersSent
      : {},
    sendReminders: d.sendReminders !== false,
    createdAt: d.createdAt ?? null,
    createdBy: d.createdBy ?? null,
    updatedAt: d.updatedAt ?? null,
    closedAt: d.closedAt ?? null,
    settledAt: d.settledAt ?? null,
  }
}

export function parseDue(snap) {
  const d = snap.data() || {}
  return {
    id: snap.id,
    collectionId: d.collectionId,
    userId: d.userId,
    userName: d.userName ?? '',
    exactSharePaise: d.exactSharePaise ?? 0,
    roundedDuePaise: d.roundedDuePaise ?? 0,
    roundingDeltaPaise: d.roundingDeltaPaise ?? 0,
    breakdown: Array.isArray(d.breakdown) ? d.breakdown : [],
    status: d.status || DUE_STATUS.UNPAID,
    waived: d.waived === true,
    paidAt: d.paidAt ?? null,
    paidBy: d.paidBy ?? null,
    method: d.method ?? null,
    note: d.note ?? '',
    walletApplied: d.walletApplied === true,
    carryInPaise: typeof d.carryInPaise === 'number' ? d.carryInPaise : 0,
    payablePaise:
      typeof d.payablePaise === 'number'
        ? d.payablePaise
        : Math.max(0, (d.roundedDuePaise ?? 0) - (typeof d.carryInPaise === 'number' ? d.carryInPaise : 0)),
    carryReleaseCycle: typeof d.carryReleaseCycle === 'number' ? d.carryReleaseCycle : 0,
    createdAt: d.createdAt ?? null,
  }
}

export async function listCollections(periodId) {
  if (!isFirebaseConfigured || !db) return []
  const col = collection(db, COLLECTIONS.FINANCE_COLLECTIONS)
  const snap = periodId
    ? await getDocs(query(col, where('periodId', '==', periodId)))
    : await getDocs(col)
  return snap.docs
    .map(parseCollection)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export async function listCollectionsWindow(max = 24) {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.FINANCE_COLLECTIONS),
      orderBy('createdAt', 'desc'),
      limit(max),
    ),
  )
  return snap.docs.map(parseCollection)
}

export async function listCollectionsPage({ max = 10, cursor = null } = {}) {
  if (!isFirebaseConfigured || !db) {
    return { items: [], cursor: null, hasMore: false }
  }
  const col = collection(db, COLLECTIONS.FINANCE_COLLECTIONS)
  const snap = await getDocs(
    cursor
      ? query(col, orderBy('createdAt', 'desc'), startAfter(cursor), limit(max))
      : query(col, orderBy('createdAt', 'desc'), limit(max)),
  )
  return {
    items: snap.docs.map(parseCollection),
    cursor: snap.docs.at(-1) || null,
    hasMore: snap.docs.length === max,
  }
}

export async function listCollectionsByIds(ids) {
  if (!isFirebaseConfigured || !db) return []
  const unique = [...new Set((ids || []).filter(Boolean))]
  if (unique.length === 0) return []
  const snaps = await Promise.all(
    unique.map((id) => getDoc(doc(db, COLLECTIONS.FINANCE_COLLECTIONS, id))),
  )
  return snaps.filter((snap) => snap.exists()).map(parseCollection)
}

export async function listIssuedCollections() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.FINANCE_COLLECTIONS),
      where('status', '==', COLLECTION_STATUS.ISSUED),
    ),
  )
  return snap.docs.map(parseCollection)
}

export async function getCollection(id) {
  if (!isFirebaseConfigured || !db) return null
  const snap = await getDoc(doc(db, COLLECTIONS.FINANCE_COLLECTIONS, id))
  return snap.exists() ? parseCollection(snap) : null
}

export async function listDuesForCollection(collectionId) {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.FINANCE_DUES),
      where('collectionId', '==', collectionId),
    ),
  )
  return snap.docs.map(parseDue)
}

export async function listAllDues() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.FINANCE_DUES))
  return snap.docs.map(parseDue)
}

export async function listDuesForCollections(collectionIds) {
  if (!isFirebaseConfigured || !db) return []
  return mapInChunks(collectionIds, async (chunk) => {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.FINANCE_DUES),
        where('collectionId', 'in', chunk),
      ),
    )
    return snap.docs.map(parseDue)
  })
}

export async function listDuesForUser(userId) {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.FINANCE_DUES), where('userId', '==', userId)),
  )
  return snap.docs
    .map(parseDue)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function previewCollection(expenses, roundRule, overrides, options) {
  return buildCollectionPreview(expenses, roundRule, overrides, options)
}

export async function issueCollection({
  title,
  periodId,
  expenses,
  roundRule,
  overrides,
  dueDate,
  sendReminders = true,
  actorId,
  actorName,
  users = [],
}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const draftExpenses = (expenses || []).filter(
    (e) => e.status !== EXPENSE_STATUS.ISSUED,
  )
  if (draftExpenses.length === 0) {
    throw new Error('Select at least one unissued expense.')
  }
  const allUserIds = users.map((u) => u.id)
  const preview = buildCollectionPreview(draftExpenses, roundRule, overrides, {
    allUserIds,
  })
  if (preview.personCount === 0) {
    throw new Error('No people to bill.')
  }

  const wallet = await getRoomWallet()
  const fromFundPaise = preview.fromFundPaise || 0
  const afterFromFund = (wallet.balancePaise || 0) - fromFundPaise

  const wallets = await listMemberWalletsByIds(preview.dues.map((due) => due.userId))
  const walletByUser = new Map(wallets.map((wallet) => [wallet.userId, wallet]))

  const at = nowIso()
  const colRef = doc(collection(db, COLLECTIONS.FINANCE_COLLECTIONS))
  const batch = writeBatch(db)
  const rosterById = new Map()
  for (const user of users) {
    const name = usablePersonName(displayName(user))
    if (user?.id && name) rosterById.set(user.id, { userId: user.id, name })
  }
  for (const due of preview.dues) {
    if (rosterById.has(due.userId)) continue
    const user = users.find((u) => u.id === due.userId)
    const name = usablePersonName(displayName(user)) || usablePersonName(due.userName)
    rosterById.set(due.userId, { userId: due.userId, name: name || '' })
  }
  const roster = [...rosterById.values()]
  const periodIds = [...new Set(draftExpenses.map((e) => e.periodId).filter(Boolean))]

  batch.set(colRef, {
    title: (title || '').trim() || `Dues ${periodId}`,
    periodId,
    periodIds,
    expenseIds: draftExpenses.map((e) => e.id),
    expenseSnapshots: preview.expenseSnapshots,
    roster,
    roundRule: roundRule || { mode: 'exact' },
    dueDate,
    status: COLLECTION_STATUS.ISSUED,
    totalExpensePaise: preview.totalExpensePaise,
    totalExactPaise: preview.totalExactPaise,
    totalDuePaise: preview.totalDuePaise,
    fundImpactPaise: preview.fundImpactPaise,
    cookLeaveFundPaise: preview.cookLeaveFundPaise || 0,
    fromFundPaise,
    fundApplied: false,
    fundMovementId: null,
    personCount: preview.personCount,
    issuedAt: at,
    issuedBy: actorId || null,
    remindersSent: {},
    sendReminders: sendReminders !== false,
    createdAt: at,
    createdBy: actorId || null,
  })

  for (const due of preview.dues) {
    const dueId = dueDocId(colRef.id, due.userId)
    const walletBalance = walletByUser.get(due.userId)?.balancePaise || 0
    const carryInPaise = carryInAppliedPaise(walletBalance, due.roundedDuePaise)
    const payablePaise = Math.max(0, (due.roundedDuePaise || 0) - carryInPaise)
    batch.set(doc(db, COLLECTIONS.FINANCE_DUES, dueId), {
      collectionId: colRef.id,
      userId: due.userId,
      userName:
        rosterById.get(due.userId)?.name ||
        usablePersonName(displayName(users.find((u) => u.id === due.userId))),
      exactSharePaise: due.exactSharePaise,
      roundedDuePaise: due.roundedDuePaise,
      roundingDeltaPaise: due.roundingDeltaPaise,
      breakdown: due.breakdown,
      status: payablePaise <= 0 ? DUE_STATUS.PAID : DUE_STATUS.UNPAID,
      waived: false,
      paidAt: null,
      paidBy: null,
      method: null,
      note: '',
      walletApplied: false,
      carryInPaise,
      payablePaise,
      carryReleaseCycle: 0,
      createdAt: at,
    })
    if (carryInPaise !== 0) {
      const current = walletByUser.get(due.userId)?.balancePaise || 0
      const nextBalance = current - carryInPaise
      walletByUser.set(due.userId, {
        id: due.userId,
        userId: due.userId,
        balancePaise: nextBalance,
      })
      batch.set(
        doc(db, COLLECTIONS.MEMBER_WALLET_MOVEMENTS, carryMovementId(colRef.id, due.userId)),
        {
          userId: due.userId,
          amountPaise: -carryInPaise,
          reason: MEMBER_WALLET_REASONS.CARRY_IN,
          refType: 'financeCollection',
          refId: colRef.id,
          note: 'Wallet applied when this collection was issued',
          collectionTitle: (title || '').trim() || `Dues ${periodId}`,
          createdAt: at,
          createdBy: actorId || null,
          createdByName: (actorName || '').trim(),
        },
      )
      batch.set(
        doc(db, COLLECTIONS.MEMBER_WALLETS, due.userId),
        { balancePaise: nextBalance, updatedAt: at },
        { merge: true },
      )
    }
  }

  const fromFundLines = fromFundLinesFromSnapshots(preview.expenseSnapshots)
  if (fromFundLines.length) {
    batch.set(
      doc(db, COLLECTIONS.ROOM_WALLET, WALLET_DOC),
      { balancePaise: afterFromFund, updatedAt: at },
      { merge: true },
    )
    for (const line of fromFundLines) {
      batch.set(
        doc(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS, fromFundMovementId(colRef.id, line.expenseId)),
        {
          amountPaise: -line.amountPaise,
          reason: WALLET_MOVEMENT_REASONS.FROM_FUND,
          refType: 'financeCollection',
          refId: colRef.id,
          note: `${line.name} — from room fund`,
          occurredOn: currentDateId(),
          createdAt: at,
          createdBy: actorId || null,
          createdByName: (actorName || '').trim(),
        },
      )
      batch.set(
        doc(db, COLLECTIONS.FINANCE_PAYMENTS, fromFundPaymentId(colRef.id, line.expenseId)),
        fromFundPaymentFields(colRef.id, line, { actorId, actorName, at }),
      )
    }
  }

  for (const expense of draftExpenses) {
    batch.update(doc(db, COLLECTIONS.EXPENSES, expense.id), {
      status: EXPENSE_STATUS.ISSUED,
      collectionId: colRef.id,
      includedUserIds: expense.includedUserIds || [],
      splitMode: expense.splitMode || 'equal',
      shares: expense.shares || {},
      manualPaise: expense.manualPaise || {},
      fromFundPaise: expenseFromFundPaise(expense),
      updatedAt: at,
    })
  }

  await batch.commit()
  return { id: colRef.id, preview }
}

function issueRoundingMovementsFor(collectionDoc, walletMovements) {
  return (walletMovements || []).filter((movement) => {
    if (collectionDoc.fundMovementId && movement.id === collectionDoc.fundMovementId) {
      return true
    }
    return (
      movement.refType === 'financeCollection' &&
      movement.refId === collectionDoc.id &&
      movement.reason === WALLET_MOVEMENT_REASONS.ROUNDING
    )
  })
}

async function reverseIssueRoundingForCollection({
  collectionDoc,
  dues,
  walletMovements,
  actorId,
  actorName,
}) {
  const related = issueRoundingMovementsFor(collectionDoc, walletMovements)
  const net = related.reduce((sum, movement) => sum + (Number(movement.amountPaise) || 0), 0)
  const wallet = await getRoomWallet()
  const nextBalance = wallet.balancePaise - net

  const at = nowIso()
  const batch = writeBatch(db)
  if (net !== 0) {
    const moveRef = doc(collection(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS))
    batch.set(moveRef, {
      amountPaise: -net,
      reason: WALLET_MOVEMENT_REASONS.ROUNDING,
      refType: 'financeCollection',
      refId: collectionDoc.id,
      note: 'Reverse rounding booked at issue. Rounding now applies when people pay.',
      occurredOn: currentDateId(),
      createdAt: at,
      createdBy: actorId || null,
      createdByName: actorName || '',
    })
    batch.set(
      doc(db, COLLECTIONS.ROOM_WALLET, WALLET_DOC),
      { balancePaise: nextBalance, updatedAt: at },
      { merge: true },
    )
  }
  batch.update(doc(db, COLLECTIONS.FINANCE_COLLECTIONS, collectionDoc.id), {
    fundApplied: false,
    fundMovementId: null,
    updatedAt: at,
  })
  for (const due of dues || []) {
    if (!due?.id) continue
    batch.update(doc(db, COLLECTIONS.FINANCE_DUES, due.id), {
      walletApplied: false,
    })
  }
  await batch.commit()
  return true
}

export async function repairIssueTimeRounding({
  collections,
  dues,
  walletMovements,
  actorId,
  actorName,
}) {
  if (!isFirebaseConfigured || !db) {
    return { count: 0, lines: [], errors: [] }
  }
  const lines = []
  const errors = []
  for (const collectionDoc of collections || []) {
    if (!collectionDoc?.id || collectionDoc.fundApplied !== true) continue
    const related = issueRoundingMovementsFor(collectionDoc, walletMovements)
    const net = related.reduce(
      (sum, movement) => sum + (Number(movement.amountPaise) || 0),
      0,
    )
    try {
      await reverseIssueRoundingForCollection({
        collectionDoc,
        dues: (dues || []).filter((due) => due.collectionId === collectionDoc.id),
        walletMovements,
        actorId,
        actorName,
      })
      lines.push({
        kind: 'issueReverse',
        collectionId: collectionDoc.id,
        collectionTitle: collectionDoc.title || '',
        amountPaise: -net,
      })
    } catch (err) {
      errors.push({
        collectionId: collectionDoc.id,
        collectionTitle: collectionDoc.title || '',
        message: err.message || String(err),
      })
    }
  }
  return { count: lines.length, lines, errors }
}

function fromFundPaymentFields(collectionId, line, { actorId, actorName, at }) {
  return {
    collectionId,
    dueId: '',
    userId: '',
    userName: '',
    expenseId: line.expenseId,
    amountPaise: line.amountPaise,
    method: PAYMENT_METHODS.OTHER,
    source: PAYMENT_SOURCES.ROOM_FUND,
    kind: 'from_fund',
    note: `${line.name} — from room fund`,
    paidOn: currentDateId(),
    recordedBy: actorId || null,
    recordedByName: (actorName || '').trim(),
    createdAt: at,
    voided: false,
    voidedAt: null,
    voidedBy: null,
    voidNote: '',
  }
}

export async function syncIssueFromFund({
  collections,
  payments,
  walletMovements,
  actorId,
  actorName,
} = {}) {
  if (!isFirebaseConfigured || !db) {
    return { count: 0, lines: [], errors: [] }
  }
  const lines = []
  const errors = []
  const payById = new Map((payments || []).map((payment) => [payment.id, payment]))
  const moveById = new Map((walletMovements || []).map((movement) => [movement.id, movement]))

  for (const collectionDoc of collections || []) {
    if (!collectionDoc?.id || collectionDoc.status === COLLECTION_STATUS.DRAFT) continue
    const expected = fromFundLinesFromSnapshots(collectionDoc.expenseSnapshots)
    const expectedIds = new Set(expected.map((line) => line.expenseId))
    const prefix = `fromfund_${collectionDoc.id}_`

    for (const movement of walletMovements || []) {
      if (
        movement.reason !== WALLET_MOVEMENT_REASONS.FROM_FUND ||
        movement.refType !== 'financeCollection' ||
        movement.refId !== collectionDoc.id
      ) {
        continue
      }
      const expenseId = String(movement.id || '').startsWith(prefix)
        ? String(movement.id).slice(prefix.length)
        : ''
      if (expenseId && !expectedIds.has(expenseId)) {
        errors.push({
          collectionId: collectionDoc.id,
          collectionTitle: collectionDoc.title || '',
          message: `Unexpected from-fund movement for ${expenseId}. Left in place.`,
        })
      }
    }

    for (const line of expected) {
      const movementId = fromFundMovementId(collectionDoc.id, line.expenseId)
      const paymentId = fromFundPaymentId(collectionDoc.id, line.expenseId)
      const movement = moveById.get(movementId)
      const payment = payById.get(paymentId)
      const needMove = !movement
      const needPay = !payment
      const needUnvoid = payment?.voided === true
      if (!needMove && !needPay && !needUnvoid) continue

      try {
        const at = nowIso()
        if (needMove) {
          await applyRoomWalletDeltas(
            [
              {
                amountPaise: -line.amountPaise,
                reason: WALLET_MOVEMENT_REASONS.FROM_FUND,
                refType: 'financeCollection',
                refId: collectionDoc.id,
                movementId,
                note: `${line.name} — from room fund`,
              },
            ],
            { actorId, actorName, allowNegative: true },
          )
          lines.push({
            kind: 'fromFund',
            collectionId: collectionDoc.id,
            collectionTitle: collectionDoc.title || line.name || '',
            amountPaise: -line.amountPaise,
          })
        }
        if (needPay || needUnvoid) {
          const batch = writeBatch(db)
          if (needPay) {
            batch.set(
              doc(db, COLLECTIONS.FINANCE_PAYMENTS, paymentId),
              fromFundPaymentFields(collectionDoc.id, line, { actorId, actorName, at }),
            )
          } else {
            batch.update(doc(db, COLLECTIONS.FINANCE_PAYMENTS, paymentId), {
              voided: false,
              voidedAt: null,
              voidedBy: null,
              voidNote: 'Restored by fund repair',
            })
          }
          await batch.commit()
          if (!needMove) {
            lines.push({
              kind: 'fromFundPay',
              collectionId: collectionDoc.id,
              collectionTitle: collectionDoc.title || line.name || '',
              amountPaise: 0,
            })
          }
        }
      } catch (err) {
        errors.push({
          collectionId: collectionDoc.id,
          collectionTitle: collectionDoc.title || '',
          message: err.message || String(err),
        })
      }
    }
  }

  return { count: lines.length, lines, errors }
}

export async function previewCollectionClose(collectionId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const collectionDoc = await getCollection(collectionId)
  if (!collectionDoc) throw new Error('Collection not found.')
  const dues = await listDuesForCollection(collectionId)
  const { listPaymentsForCollection } = await import('./financePaymentService.js')
  const payments = await listPaymentsForCollection(collectionId)
  const wallet = await getRoomWallet()
  const settleLines = []
  const coverLines = []
  const recoverLines = []
  let fundDelta = 0
  for (const due of dues) {
    const paidPaise = paidPaiseForDue(payments, due.id)
    const payablePaise = payablePaiseFor(due)
    const amountPaise = settlePaiseFor(due, payments)
    settleLines.push({
      dueId: due.id,
      userId: due.userId,
      userName: due.userName || '',
      paidPaise,
      payablePaise,
      amountPaise,
    })
    if (!isDueWaived(due)) {
      const coverPaise = fundCoverPaiseFor(due, payments)
      if (coverPaise > 0) {
        coverLines.push({
          dueId: due.id,
          userId: due.userId,
          userName: due.userName || '',
          amountPaise: coverPaise,
          payablePaise,
          paidPaise,
        })
        fundDelta -= coverPaise
      }
      const recoverPaise = fundRecoverPaiseFor(due, payments)
      if (recoverPaise > 0) {
        recoverLines.push({
          dueId: due.id,
          userId: due.userId,
          userName: due.userName || '',
          amountPaise: recoverPaise,
        })
        fundDelta += recoverPaise
      }
    }
  }
  const cookLeaveLines = cookLeaveFundLinesFromSnapshots(collectionDoc.expenseSnapshots)
  const cookLeavePaise = cookLeaveFundPaiseFromSnapshots(collectionDoc.expenseSnapshots)
  fundDelta += cookLeavePaise
  const fromFundLines = fromFundLinesFromSnapshots(collectionDoc.expenseSnapshots)
  const fromFundPaise =
    collectionDoc.fromFundPaise || fromFundPaiseFromSnapshots(collectionDoc.expenseSnapshots)
  return {
    settleLines,
    coverLines,
    recoverLines,
    cookLeaveLines,
    fromFundLines,
    fromFundPaise,
    fundBalancePaise: wallet.balancePaise || 0,
    fundDeltaPaise: fundDelta,
    fundBalanceAfterPaise: (wallet.balancePaise || 0) + fundDelta,
  }
}

export async function closeCollection(collectionId, { actorId, actorName } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const collectionDoc = await getCollection(collectionId)
  if (!collectionDoc) throw new Error('Collection not found.')
  if (collectionDoc.status === COLLECTION_STATUS.DRAFT) {
    throw new Error('Issue this collection before closing it.')
  }

  const at = nowIso()
  if (!collectionDoc.settledAt) {
    const dues = await listDuesForCollection(collectionId)
    const {
      coverFundMovementId,
      coverPaymentId,
      listPaymentsForCollection,
      recoverFundMovementId,
    } = await import('./financePaymentService.js')
    const payments = await listPaymentsForCollection(collectionId)
    const coverEntries = []
    const recoverEntries = []
    for (const due of dues) {
      if (isDueWaived(due)) continue
      const coverPaise = fundCoverPaiseFor(due, payments)
      if (coverPaise > 0) {
        coverEntries.push({ due, amountPaise: coverPaise })
      }
      const recoverPaise = fundRecoverPaiseFor(due, payments)
      if (recoverPaise > 0) {
        recoverEntries.push({ due, amountPaise: recoverPaise })
      }
    }

    if (coverEntries.length) {
      const walletRef = doc(db, COLLECTIONS.ROOM_WALLET, WALLET_DOC)
      const wallet = await getRoomWallet()
      let balance = wallet.balancePaise || 0
      const chunkSize = 80
      for (let i = 0; i < coverEntries.length; i += chunkSize) {
        const chunk = coverEntries.slice(i, i + chunkSize)
        const existing = await Promise.all(
          chunk.map((entry) =>
            Promise.all([
              getDoc(doc(db, COLLECTIONS.FINANCE_PAYMENTS, coverPaymentId(entry.due.id))),
              getDoc(
                doc(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS, coverFundMovementId(entry.due.id)),
              ),
            ]),
          ),
        )
        const batch = writeBatch(db)
        let wrote = false
        let wroteMove = false
        chunk.forEach((entry, index) => {
          const [paySnap, moveSnap] = existing[index]
          if (!paySnap.exists()) {
            batch.set(doc(db, COLLECTIONS.FINANCE_PAYMENTS, coverPaymentId(entry.due.id)), {
              collectionId,
              dueId: entry.due.id,
              userId: entry.due.userId,
              userName: entry.due.userName || '',
              amountPaise: entry.amountPaise,
              method: PAYMENT_METHODS.OTHER,
              source: PAYMENT_SOURCES.ROOM_FUND,
              note: 'Covered from the room fund when the collection closed',
              paidOn: currentDateId(),
              recordedBy: actorId || null,
              recordedByName: (actorName || '').trim(),
              createdAt: at,
              voided: false,
              voidedAt: null,
              voidedBy: null,
              voidNote: '',
            })
            wrote = true
          }
          if (!moveSnap.exists()) {
            batch.set(
              doc(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS, coverFundMovementId(entry.due.id)),
              {
                amountPaise: -entry.amountPaise,
                reason: WALLET_MOVEMENT_REASONS.COVER,
                refType: 'financeDue',
                refId: entry.due.id,
                userId: entry.due.userId,
                userName: entry.due.userName || '',
                note: 'Covered unpaid share when the collection closed',
                occurredOn: currentDateId(),
                createdAt: at,
                createdBy: actorId || null,
                createdByName: (actorName || '').trim(),
              },
            )
            balance -= entry.amountPaise
            wrote = true
            wroteMove = true
          }
        })
        if (wroteMove) {
          batch.set(walletRef, { balancePaise: balance, updatedAt: at }, { merge: true })
        }
        if (wrote) {
          await batch.commit()
        }
      }
    }

    if (recoverEntries.length) {
      await applyRoomWalletDeltas(
        recoverEntries.map((entry) => ({
          amountPaise: entry.amountPaise,
          reason: WALLET_MOVEMENT_REASONS.RECOVER,
          refType: 'financeDue',
          refId: entry.due.id,
          userId: entry.due.userId,
          userName: entry.due.userName || '',
          movementId: recoverFundMovementId(entry.due.id),
          note: 'Recovered rolled-in wallet remaining into the room fund',
        })),
        { actorId, actorName, allowNegative: true },
      )
    }

    const cookLeaveEntries = cookLeaveFundLinesFromSnapshots(collectionDoc.expenseSnapshots).map(
      (line) => ({
        amountPaise: line.amountPaise,
        reason: WALLET_MOVEMENT_REASONS.COOK_LEAVE,
        refType: 'financeCollection',
        refId: collectionId,
        movementId: cookLeaveFundMovementId(collectionId, line.expenseId),
        note: `Cook leave held back: ${line.cookName}, ${formatLeaveDays(line.deductDays)} days`,
      }),
    )
    if (cookLeaveEntries.length) {
      await applyRoomWalletDeltas(cookLeaveEntries, { actorId, actorName })
    }

    const entries = dues
      .map((due) => {
        const amountPaise = settlePaiseFor(due, payments)
        return {
          userId: due.userId,
          amountPaise,
          reason: MEMBER_WALLET_REASONS.SETTLE,
          refType: 'financeCollection',
          refId: collectionId,
          movementId: settleMovementId(collectionId, due.userId),
          note:
            amountPaise < 0
              ? 'Owes the room wallet for the share covered at close'
              : 'Leftover moved to wallet when the collection closed',
          collectionTitle: collectionDoc.title || '',
        }
      })
      .filter((entry) => entry.amountPaise !== 0)
    if (entries.length) {
      await applyMemberWalletDeltas(entries, { actorId, actorName })
    }
  }

  await updateDoc(doc(db, COLLECTIONS.FINANCE_COLLECTIONS, collectionId), {
    status: COLLECTION_STATUS.CLOSED,
    closedAt: collectionDoc.closedAt || at,
    settledAt: collectionDoc.settledAt || at,
    updatedAt: at,
  })
}

const WRITE_CHUNK = 80

async function commitOpChunks(ops) {
  for (let i = 0; i < ops.length; i += WRITE_CHUNK) {
    const batch = writeBatch(db)
    for (const apply of ops.slice(i, i + WRITE_CHUNK)) apply(batch)
    await batch.commit()
  }
}

function isRelatedLedgerMovement(movement, collectionId, dueIds) {
  if (movement.refType === 'financeCollection' && movement.refId === collectionId) return true
  if (movement.refType === 'financeDue' && dueIds.has(movement.refId)) return true
  return false
}

async function loadCollectionDeletePlan(collectionId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const collectionDoc = await getCollection(collectionId)
  if (!collectionDoc) throw new Error('Collection not found.')
  if (collectionDoc.status === COLLECTION_STATUS.CLOSED) {
    throw new Error('Closed collections cannot be deleted.')
  }
  const dues = await listDuesForCollection(collectionId)
  const { listPaymentsForCollection } = await import('./financePaymentService.js')
  const payments = await listPaymentsForCollection(collectionId)
  const dueIds = new Set(dues.map((due) => due.id))
  const [memberMoves, fundMoves, expenseSnap] = await Promise.all([
    listAllMemberWalletMovements(),
    listWalletMovements(),
    getDocs(
      query(
        collection(db, COLLECTIONS.EXPENSES),
        where('collectionId', '==', collectionId),
      ),
    ),
  ])
  const expensesById = new Map()
  for (const snap of expenseSnap.docs) {
    const data = snap.data() || {}
    expensesById.set(snap.id, { id: snap.id, name: data.name || 'Expense' })
  }
  for (const id of collectionDoc.expenseIds || []) {
    if (expensesById.has(id)) continue
    const snap = await getDoc(doc(db, COLLECTIONS.EXPENSES, id))
    if (!snap.exists()) continue
    const data = snap.data() || {}
    expensesById.set(id, { id, name: data.name || 'Expense' })
  }
  return {
    collectionDoc,
    dues,
    payments,
    memberMovements: memberMoves.filter((movement) =>
      isRelatedLedgerMovement(movement, collectionId, dueIds),
    ),
    fundMovements: fundMoves.filter((movement) =>
      isRelatedLedgerMovement(movement, collectionId, dueIds),
    ),
    expenses: [...expensesById.values()],
  }
}

export async function previewCollectionDelete(collectionId) {
  const plan = await loadCollectionDeletePlan(collectionId)
  const livePayments = plan.payments.filter((payment) => !isVoidedPayment(payment))
  const memberPaidPaise = livePayments
    .filter((payment) => !isRoomFundPayment(payment))
    .reduce((sum, payment) => sum + (payment.amountPaise || 0), 0)
  const fundPaidPaise = livePayments
    .filter((payment) => isRoomFundPayment(payment))
    .reduce((sum, payment) => sum + (payment.amountPaise || 0), 0)
  return {
    title: plan.collectionDoc.title || 'Collection',
    closed: false,
    peopleCount: plan.dues.length,
    paymentCount: plan.payments.length,
    livePaymentCount: livePayments.length,
    memberPaidPaise,
    fundPaidPaise,
    walletMovementCount: plan.memberMovements.length,
    walletNetPaise: plan.memberMovements.reduce(
      (sum, movement) => sum + (movement.amountPaise || 0),
      0,
    ),
    fundMovementCount: plan.fundMovements.length,
    fundNetPaise: plan.fundMovements.reduce(
      (sum, movement) => sum + (movement.amountPaise || 0),
      0,
    ),
    expenseNames: plan.expenses.map((expense) => expense.name),
    hasEntries:
      livePayments.length > 0 ||
      plan.memberMovements.length > 0 ||
      plan.fundMovements.length > 0,
  }
}

export async function deleteCollection(collectionId) {
  const plan = await loadCollectionDeletePlan(collectionId)
  const at = nowIso()

  const byUser = new Map()
  for (const movement of plan.memberMovements) {
    if (!movement.userId) continue
    const list = byUser.get(movement.userId) || []
    list.push(movement)
    byUser.set(movement.userId, list)
  }
  const userIds = [...byUser.keys()]
  const wallets = await listMemberWalletsByIds(userIds)
  const memberOps = []
  for (const wallet of wallets) {
    let balance = wallet.balancePaise || 0
    for (const movement of byUser.get(wallet.userId) || []) {
      balance -= movement.amountPaise || 0
      memberOps.push((batch) =>
        batch.delete(doc(db, COLLECTIONS.MEMBER_WALLET_MOVEMENTS, movement.id)),
      )
    }
    const nextBalance = balance
    memberOps.push((batch) =>
      batch.set(
        doc(db, COLLECTIONS.MEMBER_WALLETS, wallet.userId),
        { balancePaise: nextBalance, updatedAt: at },
        { merge: true },
      ),
    )
  }
  await commitOpChunks(memberOps)

  if (plan.fundMovements.length) {
    const fund = await getRoomWallet()
    let balance = fund.balancePaise || 0
    const fundOps = []
    for (const movement of plan.fundMovements) {
      balance -= movement.amountPaise || 0
      fundOps.push((batch) =>
        batch.delete(doc(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS, movement.id)),
      )
    }
    const nextFund = balance
    fundOps.push((batch) =>
      batch.set(
        doc(db, COLLECTIONS.ROOM_WALLET, WALLET_DOC),
        { balancePaise: nextFund, updatedAt: at },
        { merge: true },
      ),
    )
    await commitOpChunks(fundOps)
  }

  const rest = []
  for (const payment of plan.payments) {
    rest.push((batch) => batch.delete(doc(db, COLLECTIONS.FINANCE_PAYMENTS, payment.id)))
  }
  for (const due of plan.dues) {
    rest.push((batch) => batch.delete(doc(db, COLLECTIONS.FINANCE_DUES, due.id)))
  }
  for (const expense of plan.expenses) {
    rest.push((batch) =>
      batch.update(doc(db, COLLECTIONS.EXPENSES, expense.id), {
        status: EXPENSE_STATUS.DRAFT,
        collectionId: null,
        updatedAt: at,
      }),
    )
  }
  rest.push((batch) => batch.delete(doc(db, COLLECTIONS.FINANCE_COLLECTIONS, collectionId)))
  await commitOpChunks(rest)
}

export async function markReminderSent(collectionId, key) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const ref = doc(db, COLLECTIONS.FINANCE_COLLECTIONS, collectionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const current = snap.data().remindersSent || {}
  await updateDoc(ref, {
    remindersSent: { ...current, [key]: nowIso() },
    updatedAt: nowIso(),
  })
}
