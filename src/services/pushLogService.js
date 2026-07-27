import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore'
import { COLLECTIONS } from '../config/constants'
import { db, isFirebaseConfigured } from '../lib/firebase'

function normalizeRecipient(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    userId: raw.userId ?? '',
    displayName: raw.displayName ?? raw.userId ?? 'User',
    role: raw.role ?? null,
    pushEnabled: Boolean(raw.pushEnabled),
    deviceCount: Number(raw.deviceCount) || 0,
    status: raw.status ?? 'no_tokens',
    successCount: Number(raw.successCount) || 0,
    failureCount: Number(raw.failureCount) || 0,
    errors: Array.isArray(raw.errors)
      ? raw.errors.map((e) => ({
          code: e?.code ?? 'unknown',
          message: e?.message ?? 'Send failed',
        }))
      : [],
  }
}

export function normalizePushLog(id, data) {
  const recipients = Array.isArray(data?.recipients)
    ? data.recipients.map(normalizeRecipient).filter(Boolean)
    : null

  return {
    id,
    title: data?.title ?? '',
    body: data?.body ?? '',
    kind: data?.kind ?? 'custom',
    audience: data?.audience ?? { type: 'all' },
    source: data?.source ?? null,
    triggeredBy: data?.triggeredBy ?? null,
    createdBy: data?.createdBy ?? null,
    createdByName: data?.createdByName ?? null,
    sentAt: data?.sentAt ?? data?.createdAt ?? null,
    createdAt: data?.createdAt ?? null,
    recipientUserCount: Number(data?.recipientUserCount) || 0,
    tokenCount: Number(data?.tokenCount) || 0,
    successCount: Number(data?.successCount) || 0,
    failureCount: Number(data?.failureCount) || 0,
    errors: Array.isArray(data?.errors) ? data.errors : [],
    recipients,
    hasRecipientDetails: recipients != null && recipients.length > 0,
  }
}

export async function listPushLogs({ limit: max = 50 } = {}) {
  if (!isFirebaseConfigured || !db) return []
  const q = query(
    collection(db, COLLECTIONS.PUSH_LOGS),
    orderBy('sentAt', 'desc'),
    limit(max),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => normalizePushLog(d.id, d.data()))
}

export async function getPushLog(id) {
  if (!isFirebaseConfigured || !db || !id) return null
  const snap = await getDoc(doc(db, COLLECTIONS.PUSH_LOGS, id))
  if (!snap.exists()) return null
  return normalizePushLog(snap.id, snap.data())
}

export function recipientStatusReason(recipient) {
  if (!recipient) return '—'
  if (recipient.status === 'no_tokens') {
    return 'Notifications not enabled on any device'
  }
  if (recipient.errors?.length) {
    return recipient.errors.map((e) => `${e.code}: ${e.message}`).join('; ')
  }
  if (recipient.status === 'success') return '—'
  if (recipient.status === 'partial') return 'Some devices failed'
  if (recipient.status === 'failed') return 'All devices failed'
  return '—'
}
