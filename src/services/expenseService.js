import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import {
  COLLECTIONS,
  DEFAULT_EXPENSE_TEMPLATES,
  EXPENSE_STATUS,
  FINANCE_SPLIT_MODES,
} from '../config/constants'
import { serializeCookLeave } from '../utils/cookLeave'
import { expenseFromFundPaise } from '../utils/financeSplit'
import { currentPeriodId } from '../utils/money'

function nowIso() {
  return new Date().toISOString()
}

function parseTemplate(snap) {
  const d = snap.data() || {}
  return {
    id: snap.id,
    name: d.name ?? '',
    defaultAmountPaise:
      typeof d.defaultAmountPaise === 'number' ? d.defaultAmountPaise : 0,
    defaultSplitMode: d.defaultSplitMode || FINANCE_SPLIT_MODES.EQUAL,
    recurring: d.recurring !== false,
    order: typeof d.order === 'number' ? d.order : 0,
    active: d.active !== false,
    createdAt: d.createdAt ?? null,
    updatedAt: d.updatedAt ?? null,
  }
}

function parseExpense(snap) {
  const d = snap.data() || {}
  return {
    id: snap.id,
    templateId: d.templateId ?? null,
    name: d.name ?? '',
    amountPaise: typeof d.amountPaise === 'number' ? d.amountPaise : 0,
    fromFundPaise: typeof d.fromFundPaise === 'number' ? d.fromFundPaise : 0,
    periodId: d.periodId ?? '',
    date: d.date ?? null,
    splitMode: d.splitMode || FINANCE_SPLIT_MODES.EQUAL,
    includedUserIds: Array.isArray(d.includedUserIds) ? d.includedUserIds : [],
    shares: d.shares && typeof d.shares === 'object' ? d.shares : {},
    manualPaise:
      d.manualPaise && typeof d.manualPaise === 'object' ? d.manualPaise : {},
    status: d.status || EXPENSE_STATUS.DRAFT,
    collectionId: d.collectionId ?? null,
    note: d.note ?? '',
    cookLeave: d.cookLeave && typeof d.cookLeave === 'object' ? d.cookLeave : null,
    createdAt: d.createdAt ?? null,
    createdBy: d.createdBy ?? null,
    updatedAt: d.updatedAt ?? null,
  }
}

export async function listExpenseTemplates() {
  if (!isFirebaseConfigured || !db) return [...DEFAULT_EXPENSE_TEMPLATES]
  const snap = await getDocs(collection(db, COLLECTIONS.EXPENSE_TEMPLATES))
  if (snap.empty) {
    try {
      await seedExpenseTemplates()
      const seeded = await getDocs(collection(db, COLLECTIONS.EXPENSE_TEMPLATES))
      return seeded.docs.map(parseTemplate).sort((a, b) => a.order - b.order)
    } catch (err) {
      console.warn('Could not seed expense templates', err)
      return [...DEFAULT_EXPENSE_TEMPLATES]
    }
  }
  return snap.docs.map(parseTemplate).sort((a, b) => a.order - b.order)
}

export async function seedExpenseTemplates() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const at = nowIso()
  await Promise.all(
    DEFAULT_EXPENSE_TEMPLATES.map((tpl) =>
      setDoc(doc(db, COLLECTIONS.EXPENSE_TEMPLATES, tpl.id), {
        ...tpl,
        createdAt: at,
        updatedAt: at,
      }),
    ),
  )
}

export async function saveExpenseTemplate(payload, userId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const name = (payload.name || '').trim()
  if (!name) throw new Error('Template name is required.')
  const ref = payload.id
    ? doc(db, COLLECTIONS.EXPENSE_TEMPLATES, payload.id)
    : doc(collection(db, COLLECTIONS.EXPENSE_TEMPLATES))
  const at = nowIso()
  await setDoc(
    ref,
    {
      name,
      defaultAmountPaise: Math.max(0, Math.round(payload.defaultAmountPaise || 0)),
      defaultSplitMode: payload.defaultSplitMode || FINANCE_SPLIT_MODES.EQUAL,
      recurring: payload.recurring !== false,
      order: typeof payload.order === 'number' ? payload.order : 99,
      active: payload.active !== false,
      updatedAt: at,
      updatedBy: userId || null,
      createdAt: payload.createdAt || at,
    },
    { merge: true },
  )
  return ref.id
}

export async function deleteExpenseTemplate(id) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  await deleteDoc(doc(db, COLLECTIONS.EXPENSE_TEMPLATES, id))
}

function sortExpenses(list) {
  return list.sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  )
}

export async function listAllExpenses() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.EXPENSES))
  return sortExpenses(snap.docs.map(parseExpense))
}

export async function listExpensesPage({ max = 20, cursor = null } = {}) {
  if (!isFirebaseConfigured || !db) {
    return { items: [], cursor: null, hasMore: false }
  }
  const col = collection(db, COLLECTIONS.EXPENSES)
  const snap = await getDocs(
    cursor
      ? query(col, orderBy('createdAt', 'desc'), startAfter(cursor), limit(max))
      : query(col, orderBy('createdAt', 'desc'), limit(max)),
  )
  return {
    items: snap.docs.map(parseExpense),
    cursor: snap.docs.at(-1) || null,
    hasMore: snap.docs.length === max,
  }
}

export async function listDraftExpenses() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.EXPENSES),
      where('status', '==', EXPENSE_STATUS.DRAFT),
    ),
  )
  return sortExpenses(snap.docs.map(parseExpense))
}

export async function listExpenses(periodId) {
  if (!isFirebaseConfigured || !db) return []
  const period = periodId || currentPeriodId()
  const q = query(
    collection(db, COLLECTIONS.EXPENSES),
    where('periodId', '==', period),
  )
  const snap = await getDocs(q)
  return sortExpenses(snap.docs.map(parseExpense))
}

export async function saveExpense(payload, userId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const name = (payload.name || '').trim()
  if (!name) throw new Error('Expense name is required.')
  const cookLeave = serializeCookLeave(payload.cookLeave)
  const amountPaise = cookLeave
    ? cookLeave.billedPaise
    : Math.round(Number(payload.amountPaise) || 0)
  if (amountPaise < 0) throw new Error('Amount cannot be negative.')
  const fromFundPaise = expenseFromFundPaise({ ...payload, amountPaise, cookLeave })
  const includedUserIds = Array.isArray(payload.includedUserIds)
    ? payload.includedUserIds.filter(Boolean)
    : []
  if (includedUserIds.length === 0) {
    throw new Error('Select at least one person.')
  }
  if (payload.status === EXPENSE_STATUS.ISSUED && payload.id) {
    throw new Error('Issued expenses cannot be edited. Create a new line instead.')
  }

  const ref = payload.id
    ? doc(db, COLLECTIONS.EXPENSES, payload.id)
    : doc(collection(db, COLLECTIONS.EXPENSES))
  const at = nowIso()
  const body = {
    templateId: payload.templateId ?? null,
    name,
    amountPaise,
    fromFundPaise,
    periodId: payload.periodId || currentPeriodId(),
    date: payload.date || at.slice(0, 10),
    splitMode: payload.splitMode || FINANCE_SPLIT_MODES.EQUAL,
    includedUserIds,
    shares: payload.shares && typeof payload.shares === 'object' ? payload.shares : {},
    manualPaise:
      payload.manualPaise && typeof payload.manualPaise === 'object'
        ? payload.manualPaise
        : {},
    status: EXPENSE_STATUS.DRAFT,
    collectionId: null,
    note: (payload.note || '').trim(),
    cookLeave,
    updatedAt: at,
    updatedBy: userId || null,
  }
  if (!payload.id) {
    body.createdAt = at
    body.createdBy = userId || null
  }
  await setDoc(ref, body, { merge: true })
  return ref.id
}

export async function deleteExpense(id, existing) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  if (existing?.status === EXPENSE_STATUS.ISSUED) {
    throw new Error('Issued expenses cannot be deleted.')
  }
  await deleteDoc(doc(db, COLLECTIONS.EXPENSES, id))
}

export async function markExpensesIssued(expenseIds, collectionId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const at = nowIso()
  await Promise.all(
    expenseIds.map((id) =>
      updateDoc(doc(db, COLLECTIONS.EXPENSES, id), {
        status: EXPENSE_STATUS.ISSUED,
        collectionId,
        updatedAt: at,
      }),
    ),
  )
}
