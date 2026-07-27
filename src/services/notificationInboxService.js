import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { COLLECTIONS } from '../config/constants'
import { db, isFirebaseConfigured } from '../lib/firebase'

export const USER_NOTIFICATIONS_SUB = 'notifications'

function notificationsCol(userId) {
  return collection(db, COLLECTIONS.USERS, userId, USER_NOTIFICATIONS_SUB)
}

export function normalizeNotification(id, data) {
  return {
    id,
    pushLogId: data?.pushLogId ?? null,
    title: data?.title ?? '',
    body: data?.body ?? '',
    kind: data?.kind ?? 'custom',
    source: data?.source ?? null,
    relatedType: data?.relatedType ?? null,
    relatedId: data?.relatedId ?? null,
    menuDateId: data?.menuDateId ?? null,
    mealSlot: data?.mealSlot ?? null,
    sentAt: data?.sentAt ?? data?.createdAt ?? null,
    deliveryStatus: data?.deliveryStatus ?? 'no_tokens',
    deviceCount: Number(data?.deviceCount) || 0,
    successCount: Number(data?.successCount) || 0,
    failureCount: Number(data?.failureCount) || 0,
    deliveryMessage: data?.deliveryMessage ?? null,
    seenAt: data?.seenAt ?? null,
    readAt: data?.readAt ?? null,
    clearedAt: data?.clearedAt ?? null,
    createdAt: data?.createdAt ?? null,
    isUnread: !data?.seenAt && !data?.clearedAt,
  }
}

function inboxQuery(userId, max) {
  // Fetch extra rows so cleared items filtered client-side still fill the inbox.
  return query(notificationsCol(userId), orderBy('sentAt', 'desc'), limit(max * 3))
}

function activeNotifications(docs, max) {
  return docs
    .map((d) => normalizeNotification(d.id, d.data()))
    .filter((n) => !n.clearedAt)
    .slice(0, max)
}

export function subscribeNotifications(userId, onChange, { limit: max = 50 } = {}) {
  if (!isFirebaseConfigured || !db || !userId) {
    onChange({ notifications: [], unreadCount: 0 })
    return () => {}
  }

  const q = inboxQuery(userId, max)
  return onSnapshot(
    q,
    (snap) => {
      const notifications = activeNotifications(snap.docs, max)
      const unreadCount = notifications.filter((n) => n.isUnread).length
      onChange({ notifications, unreadCount, error: null })
    },
    (err) => {
      console.error('notification inbox subscribe', err)
      onChange({
        notifications: [],
        unreadCount: 0,
        error: err.message || 'Could not load notifications.',
      })
    },
  )
}

export async function listNotifications(userId, { limit: max = 50 } = {}) {
  if (!isFirebaseConfigured || !db || !userId) return []
  const snap = await getDocs(inboxQuery(userId, max))
  return activeNotifications(snap.docs, max)
}

export async function markAllSeen(userId) {
  if (!isFirebaseConfigured || !db || !userId) return
  const snap = await getDocs(inboxQuery(userId, 50))
  if (snap.empty) return
  const now = new Date().toISOString()
  const batch = writeBatch(db)
  let pending = 0
  snap.docs.forEach((d) => {
    const data = d.data()
    if (!data.clearedAt && !data.seenAt) {
      batch.update(d.ref, { seenAt: now })
      pending += 1
    }
  })
  if (pending > 0) await batch.commit()
}

export async function markRead(userId, notificationId) {
  if (!isFirebaseConfigured || !db || !userId || !notificationId) return
  const now = new Date().toISOString()
  const ref = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    USER_NOTIFICATIONS_SUB,
    notificationId,
  )
  await updateDoc(ref, {
    seenAt: now,
    readAt: now,
  })
}

export async function clearAll(userId) {
  if (!isFirebaseConfigured || !db || !userId) return
  const snap = await getDocs(inboxQuery(userId, 50))
  const active = snap.docs.filter((d) => !d.data().clearedAt)
  if (!active.length) return
  const now = new Date().toISOString()
  for (let i = 0; i < active.length; i += 500) {
    const batch = writeBatch(db)
    active.slice(i, i + 500).forEach((d) => {
      batch.update(d.ref, { clearedAt: now, seenAt: d.data().seenAt ?? now })
    })
    await batch.commit()
  }
}

export function formatRelativeTime(iso) {
  if (!iso) return ''
  try {
    const date = new Date(iso)
    const diffMs = Date.now() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString()
  } catch {
    return iso
  }
}
