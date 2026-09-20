import {
  deleteField,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import {
  COLLECTIONS,
  COLLECTION_STATUS,
  DUE_STATUS,
  MEMBER_WALLET_REASONS,
} from '../config/constants'
import { parseCollection, parseDue } from './financeCollectionService'
import { listPaymentsForCollection } from './financePaymentService'
import { applyMemberWalletDeltas, unwaiveMovementId, waiveMovementId } from './memberWalletService'
import {
  carryInPaiseFor,
  dueStatusFor,
  isDueWaived,
  outstandingFor,
} from '../utils/financeLedger'

export async function listUnpaidDues(collectionId) {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.FINANCE_DUES),
      where('collectionId', '==', collectionId),
    ),
  )
  const dues = snap.docs.map(parseDue)
  const payments = await listPaymentsForCollection(collectionId)
  return dues.filter((d) => outstandingFor(d, payments) > 0)
}

async function requireOpenCollection(collectionId) {
  const snap = await getDoc(doc(db, COLLECTIONS.FINANCE_COLLECTIONS, collectionId))
  if (!snap.exists()) throw new Error('Collection not found.')
  const collectionDoc = parseCollection(snap)
  if (collectionDoc.status === COLLECTION_STATUS.CLOSED) {
    throw new Error('This collection is closed. Adjust the member wallet instead.')
  }
  return collectionDoc
}

export async function waiveDue(dueId, { actorId, actorName, note } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const dueRef = doc(db, COLLECTIONS.FINANCE_DUES, dueId)
  const dueSnap = await getDoc(dueRef)
  if (!dueSnap.exists()) throw new Error('Due not found.')
  const due = parseDue(dueSnap)
  if (isDueWaived(due)) throw new Error('This due is already waived.')
  const collectionDoc = await requireOpenCollection(due.collectionId)
  const carryInPaise = carryInPaiseFor(due)
  const cycle = due.carryReleaseCycle || 0
  if (carryInPaise !== 0) {
    await applyMemberWalletDeltas(
      [
        {
          userId: due.userId,
          amountPaise: carryInPaise,
          reason: MEMBER_WALLET_REASONS.WAIVE_RELEASE,
          refType: 'financeDue',
          refId: due.id,
          movementId: waiveMovementId(due.id, cycle),
          note: 'Wallet amount returned because this due was waived',
          collectionTitle: collectionDoc.title || '',
        },
      ],
      { actorId, actorName },
    )
  }
  const at = new Date().toISOString()
  const patch = {
    waived: true,
    status: DUE_STATUS.WAIVED,
    waivedAt: at,
    waivedBy: actorId || null,
    carryReleaseCycle: cycle + 1,
  }
  const trimmed = (note || '').trim()
  if (trimmed) patch.note = trimmed
  await updateDoc(dueRef, patch)
}

export async function unwaiveDue(dueId, { actorId, actorName } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const dueRef = doc(db, COLLECTIONS.FINANCE_DUES, dueId)
  const dueSnap = await getDoc(dueRef)
  if (!dueSnap.exists()) throw new Error('Due not found.')
  const due = parseDue(dueSnap)
  if (!isDueWaived(due)) throw new Error('This due is not waived.')
  const collectionDoc = await requireOpenCollection(due.collectionId)
  const carryInPaise = carryInPaiseFor(due)
  const cycle = due.carryReleaseCycle || 0
  if (carryInPaise !== 0 && cycle > 0) {
    await applyMemberWalletDeltas(
      [
        {
          userId: due.userId,
          amountPaise: -carryInPaise,
          reason: MEMBER_WALLET_REASONS.UNWAIVE,
          refType: 'financeDue',
          refId: due.id,
          movementId: unwaiveMovementId(due.id, cycle - 1),
          note: 'Wallet amount applied again because this due was restored',
          collectionTitle: collectionDoc.title || '',
        },
      ],
      { actorId, actorName },
    )
  }
  const payments = await listPaymentsForCollection(due.collectionId)
  const restored = {
    ...due,
    waived: false,
    status: DUE_STATUS.UNPAID,
  }
  await updateDoc(dueRef, {
    waived: false,
    status: dueStatusFor(restored, payments),
    waivedAt: deleteField(),
    waivedBy: deleteField(),
  })
}
