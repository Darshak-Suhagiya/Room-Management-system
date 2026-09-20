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
import { COLLECTION_STATUS, COLLECTIONS, PAYMENT_METHODS, PAYMENT_SOURCES, WALLET_MOVEMENT_REASONS } from '../config/constants'
import { parseCollection, parseDue } from './financeCollectionService'
import {
  fundCoverPaiseFor,
  isDueWaived,
  isExpenseFromFundPayment,
  memberFullyPaidDue,
  memberPaidPaiseForDue,
} from '../utils/financeLedger'
import { currentDateId } from '../utils/money'

function nowIso() {
  return new Date().toISOString()
}

const WALLET_DOC = 'default'

export function parsePayment(snap) {
  const d = snap.data() || {}
  return {
    id: snap.id,
    collectionId: d.collectionId,
    dueId: d.dueId,
    userId: d.userId,
    userName: d.userName ?? '',
    amountPaise: d.amountPaise ?? 0,
    method: d.method ?? null,
    source: d.source || PAYMENT_SOURCES.MEMBER,
    kind: d.kind || '',
    expenseId: d.expenseId || '',
    note: d.note ?? '',
    paidOn: d.paidOn ?? null,
    recordedBy: d.recordedBy ?? null,
    recordedByName: d.recordedByName ?? '',
    createdAt: d.createdAt ?? null,
    voided: d.voided === true,
    voidedAt: d.voidedAt ?? null,
    voidedBy: d.voidedBy ?? null,
    voidNote: d.voidNote ?? '',
  }
}

export async function listAllPayments() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.FINANCE_PAYMENTS))
  return snap.docs
    .map(parsePayment)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export async function listPaymentsForCollection(collectionId) {
  if (!isFirebaseConfigured || !db) return []
  if (!collectionId) return []
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.FINANCE_PAYMENTS),
      where('collectionId', '==', collectionId),
    ),
  )
  return snap.docs
    .map(parsePayment)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export async function listPaymentsForUser(userId) {
  if (!isFirebaseConfigured || !db) return []
  if (!userId) return []
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.FINANCE_PAYMENTS), where('userId', '==', userId)),
  )
  return snap.docs
    .map(parsePayment)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export async function listPaymentsForCollections(collectionIds) {
  if (!isFirebaseConfigured || !db) return []
  const unique = [...new Set((collectionIds || []).filter(Boolean))]
  const out = []
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30)
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.FINANCE_PAYMENTS),
        where('collectionId', 'in', chunk),
      ),
    )
    out.push(...snap.docs.map(parsePayment))
  }
  return out.sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  )
}

export async function listPaymentsForDue(dueId) {
  if (!isFirebaseConfigured || !db) return []
  if (!dueId) return []
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.FINANCE_PAYMENTS), where('dueId', '==', dueId)),
  )
  return snap.docs.map(parsePayment)
}

async function applyLegacyRounding(batch, { due, collectionDoc, nextPaid, actorId }) {
  if (!collectionDoc || collectionDoc.fundApplied === true) return null
  const delta = due.roundingDeltaPaise || 0
  if (delta === 0) return null

  const fullyPaid = memberFullyPaidDue(due, null, nextPaid)
  const needsApply = fullyPaid && !due.walletApplied
  const needsReverse = !fullyPaid && due.walletApplied
  if (!needsApply && !needsReverse) return null
  const dueRef = doc(db, COLLECTIONS.FINANCE_DUES, due.id)
  const walletRef = doc(db, COLLECTIONS.ROOM_WALLET, WALLET_DOC)
  const walletSnap = await getDoc(walletRef)
  const currentBalance = walletSnap.exists()
    ? Number(walletSnap.data().balancePaise) || 0
    : 0
  const at = nowIso()

  if (fullyPaid && !due.walletApplied) {
    const nextBalance = currentBalance + delta
    const moveRef = doc(collection(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS))
    batch.set(moveRef, {
      amountPaise: delta,
      reason: WALLET_MOVEMENT_REASONS.ROUNDING,
      refType: 'financeDue',
      refId: due.id,
      note: 'Rounding on collection payment',
      occurredOn: currentDateId(),
      createdAt: at,
      createdBy: actorId || null,
    })
    batch.set(
      walletRef,
      { balancePaise: nextBalance, updatedAt: at, lastRoundingDueId: due.id },
      { merge: true },
    )
    batch.update(dueRef, { walletApplied: true })
    return { kind: 'applied', amountPaise: delta }
  }

  if (!fullyPaid && due.walletApplied) {
    const reverseDelta = -delta
    const nextBalance = currentBalance + reverseDelta
    const moveRef = doc(collection(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS))
    batch.set(moveRef, {
      amountPaise: reverseDelta,
      reason: WALLET_MOVEMENT_REASONS.ROUNDING,
      refType: 'financeDue',
      refId: due.id,
      note: 'Reverse rounding on unpaid',
      occurredOn: currentDateId(),
      createdAt: at,
      createdBy: actorId || null,
    })
    batch.set(
      walletRef,
      { balancePaise: nextBalance, updatedAt: at, lastRoundingDueId: due.id },
      { merge: true },
    )
    batch.update(dueRef, { walletApplied: false })
    return { kind: 'reversed', amountPaise: reverseDelta }
  }

  return null
}

async function commitLegacyRounding({ due, collectionDoc, nextPaid, actorId }) {
  if (!isFirebaseConfigured || !db) return null
  const batch = writeBatch(db)
  const wrote = await applyLegacyRounding(batch, {
    due,
    collectionDoc,
    nextPaid,
    actorId,
  })
  if (!wrote) return null
  await batch.commit()
  return wrote
}

export async function recordPayment({
  dueId,
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
  const dueRef = doc(db, COLLECTIONS.FINANCE_DUES, dueId)
  const dueSnap = await getDoc(dueRef)
  if (!dueSnap.exists()) throw new Error('Due not found.')
  const due = parseDue(dueSnap)
  if (due.waived || due.status === 'waived') {
    throw new Error('This due was waived.')
  }
  const amount = Math.round(Number(amountPaise))
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter an amount greater than 0.')
  }

  const colSnap = await getDoc(doc(db, COLLECTIONS.FINANCE_COLLECTIONS, due.collectionId))
  const collectionDoc = colSnap.exists() ? parseCollection(colSnap) : null
  if (collectionDoc?.status === COLLECTION_STATUS.CLOSED) {
    throw new Error('This collection is closed. Adjust the member wallet instead.')
  }
  const existing = await listPaymentsForDue(due.id)
  const nextPaid = memberPaidPaiseForDue(existing, due.id) + amount

  const at = nowIso()
  const batch = writeBatch(db)
  const payRef = doc(collection(db, COLLECTIONS.FINANCE_PAYMENTS))
  batch.set(payRef, {
    collectionId: due.collectionId,
    dueId: due.id,
    userId: due.userId,
    userName: due.userName || '',
    amountPaise: amount,
    method: method || PAYMENT_METHODS.OTHER,
    note: (note || '').trim(),
    paidOn: paidOn || currentDateId(),
    recordedBy: actorId || null,
    recordedByName: (actorName || '').trim(),
    createdAt: at,
    source: PAYMENT_SOURCES.MEMBER,
    voided: false,
    voidedAt: null,
    voidedBy: null,
    voidNote: '',
  })

  await batch.commit()

  try {
    await commitLegacyRounding({
      due,
      collectionDoc,
      nextPaid,
      actorId,
    })
  } catch (err) {
    console.warn('Could not apply collection rounding to the room fund.', err)
  }

  return payRef.id
}

export function coverPaymentId(dueId) {
  return `coverpay_${dueId}`
}

export function coverFundMovementId(refId) {
  return `cover_${refId}`
}

export function coverVoidMovementId(paymentId) {
  return `cover_void_${paymentId}`
}

export function recoverFundMovementId(dueId) {
  return `recover_${dueId}`
}

export async function payDueFromRoomFund({
  dueId,
  amountPaise,
  note,
  actorId,
  actorName,
  paidOn,
}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const dueRef = doc(db, COLLECTIONS.FINANCE_DUES, dueId)
  const dueSnap = await getDoc(dueRef)
  if (!dueSnap.exists()) throw new Error('Due not found.')
  const due = parseDue(dueSnap)
  if (isDueWaived(due)) {
    throw new Error('This due was waived.')
  }
  const colSnap = await getDoc(doc(db, COLLECTIONS.FINANCE_COLLECTIONS, due.collectionId))
  const collectionDoc = colSnap.exists() ? parseCollection(colSnap) : null
  if (collectionDoc?.status === COLLECTION_STATUS.CLOSED) {
    throw new Error('This collection is closed. Adjust the member wallet instead.')
  }
  const existing = await listPaymentsForDue(due.id)
  const remainingCover = fundCoverPaiseFor(due, existing)
  const amount = Math.round(Number(amountPaise))
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter an amount greater than 0.')
  }
  if (amount > remainingCover) {
    throw new Error('That is more than the room fund can cover on this share.')
  }

  const at = nowIso()
  const walletRef = doc(db, COLLECTIONS.ROOM_WALLET, WALLET_DOC)
  const walletSnap = await getDoc(walletRef)
  const currentBalance = walletSnap.exists()
    ? Number(walletSnap.data().balancePaise) || 0
    : 0
  const nextBalance = currentBalance - amount
  const batch = writeBatch(db)
  const payRef = doc(collection(db, COLLECTIONS.FINANCE_PAYMENTS))
  batch.set(payRef, {
    collectionId: due.collectionId,
    dueId: due.id,
    userId: due.userId,
    userName: due.userName || '',
    amountPaise: amount,
    method: PAYMENT_METHODS.OTHER,
    source: PAYMENT_SOURCES.ROOM_FUND,
    note: (note || '').trim() || 'Paid from the room fund',
    paidOn: paidOn || currentDateId(),
    recordedBy: actorId || null,
    recordedByName: (actorName || '').trim(),
    createdAt: at,
    voided: false,
    voidedAt: null,
    voidedBy: null,
    voidNote: '',
  })
  batch.set(doc(db, COLLECTIONS.ROOM_WALLET_MOVEMENTS, coverFundMovementId(payRef.id)), {
    amountPaise: -amount,
    reason: WALLET_MOVEMENT_REASONS.COVER,
    refType: 'financeDue',
    refId: due.id,
    userId: due.userId,
    userName: due.userName || '',
    note: (note || '').trim() || 'Covered unpaid share from the room fund',
    occurredOn: paidOn || currentDateId(),
    createdAt: at,
    createdBy: actorId || null,
    createdByName: (actorName || '').trim(),
  })
  batch.set(
    walletRef,
    { balancePaise: nextBalance, updatedAt: at },
    { merge: true },
  )
  await batch.commit()

  try {
    await commitLegacyRounding({
      due,
      collectionDoc,
      nextPaid: memberPaidPaiseForDue(existing, due.id),
      actorId,
    })
  } catch (err) {
    console.warn('Could not apply collection rounding to the room fund.', err)
  }

  return payRef.id
}

export async function voidPayment(paymentId, { actorId, note } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const payRef = doc(db, COLLECTIONS.FINANCE_PAYMENTS, paymentId)
  const snap = await getDoc(payRef)
  if (!snap.exists()) throw new Error('Payment not found.')
  const payment = parsePayment(snap)
  if (payment.voided) return payment
  if (isExpenseFromFundPayment(payment)) {
    throw new Error(
      'This room-fund share is part of the expense. Delete the collection to reverse it.',
    )
  }

  const dueRef = doc(db, COLLECTIONS.FINANCE_DUES, payment.dueId)
  const dueSnap = await getDoc(dueRef)
  const due = dueSnap.exists() ? parseDue(dueSnap) : null
  const colSnap = due
    ? await getDoc(doc(db, COLLECTIONS.FINANCE_COLLECTIONS, due.collectionId))
    : null
  const collectionDoc = colSnap?.exists() ? parseCollection(colSnap) : null
  if (collectionDoc?.status === COLLECTION_STATUS.CLOSED) {
    throw new Error('This collection is closed. Adjust the member wallet instead.')
  }
  const existing = due ? await listPaymentsForDue(due.id) : []
  const remainingPaid = memberPaidPaiseForDue(
    existing.filter((p) => p.id !== payment.id),
    payment.dueId,
  )

  const at = nowIso()
  const batch = writeBatch(db)
  batch.update(payRef, {
    voided: true,
    voidedAt: at,
    voidedBy: actorId || null,
    voidNote: (note || '').trim(),
  })

  await batch.commit()
  if (payment.source === PAYMENT_SOURCES.ROOM_FUND && due) {
    try {
      const walletRef = doc(db, COLLECTIONS.ROOM_WALLET, WALLET_DOC)
      const walletSnap = await getDoc(walletRef)
      const currentBalance = walletSnap.exists()
        ? Number(walletSnap.data().balancePaise) || 0
        : 0
      const reverse = writeBatch(db)
      const moveRef = doc(
        db,
        COLLECTIONS.ROOM_WALLET_MOVEMENTS,
        coverVoidMovementId(payment.id),
      )
      const existingMove = await getDoc(moveRef)
      if (!existingMove.exists()) {
        reverse.set(moveRef, {
          amountPaise: payment.amountPaise,
          reason: WALLET_MOVEMENT_REASONS.COVER,
          refType: 'financeDue',
          refId: due.id,
          userId: due.userId,
          userName: due.userName || '',
          note: 'Reversed room-fund cover',
          occurredOn: currentDateId(),
          createdAt: at,
          createdBy: actorId || null,
          createdByName: '',
        })
        reverse.set(
          walletRef,
          { balancePaise: currentBalance + (payment.amountPaise || 0), updatedAt: at },
          { merge: true },
        )
        await reverse.commit()
      }
    } catch (err) {
      console.warn('Could not reverse room-fund cover.', err)
    }
  }
  if (due) {
    try {
      await commitLegacyRounding({
        due,
        collectionDoc,
        nextPaid: remainingPaid,
        actorId,
      })
    } catch (err) {
      console.warn('Could not reverse collection rounding on the room fund.', err)
    }
  }

  const fresh = await getDoc(payRef)
  return parsePayment(fresh)
}

export async function getDue(dueId) {
  if (!isFirebaseConfigured || !db) return null
  const snap = await getDoc(doc(db, COLLECTIONS.FINANCE_DUES, dueId))
  return snap.exists() ? parseDue(snap) : null
}

export async function syncLegacyRounding({ collections, dues, payments, actorId }) {
  if (!isFirebaseConfigured || !db) {
    return { count: 0, lines: [], errors: [] }
  }
  const lines = []
  const errors = []
  const colById = new Map((collections || []).map((collection) => [collection.id, collection]))
  for (const due of dues || []) {
    const collectionDoc = colById.get(due.collectionId)
    if (!collectionDoc || collectionDoc.fundApplied === true) continue
    const delta = due.roundingDeltaPaise || 0
    if (delta === 0) continue
    const fullyPaid = memberFullyPaidDue(due, payments)
    if ((fullyPaid && due.walletApplied) || (!fullyPaid && !due.walletApplied)) {
      continue
    }
    const latest = (await getDue(due.id)) || due
    const latestPaid = memberPaidPaiseForDue(payments, latest.id)
    try {
      const wrote = await commitLegacyRounding({
        due: latest,
        collectionDoc,
        nextPaid: latestPaid,
        actorId,
      })
      if (wrote) {
        lines.push({
          kind: wrote.kind,
          dueId: latest.id,
          userId: latest.userId,
          userName: latest.userName || '',
          collectionTitle: collectionDoc.title || '',
          amountPaise: wrote.amountPaise,
        })
      }
    } catch (err) {
      errors.push({
        dueId: latest.id,
        userId: latest.userId,
        userName: latest.userName || '',
        collectionTitle: collectionDoc.title || '',
        message: err.message || String(err),
      })
    }
  }
  return { count: lines.length, lines, errors }
}
