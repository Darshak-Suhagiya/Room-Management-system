import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import {
  COLLECTIONS,
  NOTICE_PAGES,
  NOTICE_TONES,
} from '../config/constants'
import { formatDateId } from '../utils/mealDateUtils'

const ACTIVE_CACHE_MS = 60_000
let activeNoticesCache = { at: 0, list: null }
let activeNoticesInflight = null

export function invalidateActiveNoticesCache() {
  activeNoticesCache = { at: 0, list: null }
  activeNoticesInflight = null
}

function localReadKey(userId) {
  return `notice-read-ids:${userId}`
}

function localReadSyncedKey(userId) {
  return `notice-read-synced:${userId}`
}

function bannerCacheKey(userId, page) {
  return `notice-banner:${userId}:${page}:${formatDateId(new Date())}`
}

export function hasSyncedLocalReadNoticeIds(userId) {
  if (!userId || typeof localStorage === 'undefined') return false
  return localStorage.getItem(localReadSyncedKey(userId)) === '1'
}

export function getLocalReadNoticeIds(userId) {
  if (!userId || typeof localStorage === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(localReadKey(userId))
    const ids = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(ids) ? ids : [])
  } catch {
    return new Set()
  }
}

export function rememberLocalReadNotice(userId, noticeId) {
  if (!userId || !noticeId || typeof localStorage === 'undefined') return
  const ids = getLocalReadNoticeIds(userId)
  ids.add(noticeId)
  localStorage.setItem(localReadKey(userId), JSON.stringify([...ids]))
  clearBannerCachesForUser(userId)
}

function syncLocalReadNoticeIds(userId, readIds) {
  if (!userId || typeof localStorage === 'undefined') return
  localStorage.setItem(localReadKey(userId), JSON.stringify([...readIds]))
}

export function getCachedBannerNotices(userId, page) {
  if (!userId || typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(bannerCacheKey(userId, page))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function setCachedBannerNotices(userId, page, notices) {
  if (!userId || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(bannerCacheKey(userId, page), JSON.stringify(notices))
  } catch {
    /* ignore quota */
  }
}

function clearBannerCachesForUser(userId) {
  if (!userId || typeof sessionStorage === 'undefined') return
  try {
    const prefix = `notice-banner:${userId}:`
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}

function noticesCol() {
  return collection(db, COLLECTIONS.NOTICES)
}

function receiptRef(noticeId, userId) {
  return doc(db, COLLECTIONS.NOTICES, noticeId, 'receipts', userId)
}

function receiptsCol(noticeId) {
  return collection(db, COLLECTIONS.NOTICES, noticeId, 'receipts')
}

function todayId() {
  return formatDateId(new Date())
}

/** Normalize date field to YYYY-MM-DD for comparisons. */
function toDateId(value) {
  if (!value) return null
  if (typeof value === 'string') {
    return value.slice(0, 10)
  }
  return null
}

export function noticeMatchesAudience(notice, profile) {
  if (!profile) return false
  const roles = notice.audienceRoles ?? []
  const userIds = notice.audienceUserIds ?? []
  if (roles.length === 0 && userIds.length === 0) return true
  if (userIds.includes(profile.id || profile.uid)) return true
  if (roles.includes(profile.role)) return true
  return false
}

export function isNoticeInDateWindow(notice, dayId = todayId()) {
  const start = toDateId(notice.startAt)
  const end = toDateId(notice.endAt)
  if (start && dayId < start) return false
  if (end && dayId > end) return false
  return true
}

/** Currently shown on banners (not ended, active, in window). */
export function isNoticeActiveNow(notice, dayId = todayId()) {
  if (!notice) return false
  if (notice.endedAt) return false
  if (notice.active === false) return false
  return isNoticeInDateWindow(notice, dayId)
}

/** Past: manually ended, inactive, or past end date. */
export function isNoticePast(notice, dayId = todayId()) {
  if (!notice) return false
  if (notice.endedAt) return true
  if (notice.active === false) return true
  const end = toDateId(notice.endAt)
  if (end && dayId > end) return true
  return false
}

function normalizeNotice(id, data) {
  return {
    id,
    title: data.title ?? '',
    message: data.message ?? '',
    tone: data.tone ?? NOTICE_TONES.INFO,
    active: data.active !== false,
    startAt: data.startAt ?? null,
    endAt: data.endAt ?? null,
    endedAt: data.endedAt ?? null,
    endedBy: data.endedBy ?? null,
    audienceRoles: Array.isArray(data.audienceRoles) ? data.audienceRoles : [],
    audienceUserIds: Array.isArray(data.audienceUserIds)
      ? data.audienceUserIds
      : [],
    pages:
      Array.isArray(data.pages) && data.pages.length > 0
        ? data.pages
        : [NOTICE_PAGES.MEALS, NOTICE_PAGES.SEVA],
    order: typeof data.order === 'number' ? data.order : 0,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    createdBy: data.createdBy ?? null,
    updatedBy: data.updatedBy ?? null,
  }
}

export async function listAllNotices() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(noticesCol())
  return snap.docs
    .map((d) => normalizeNotice(d.id, d.data()))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export async function listActiveNotices({ bypassCache = false } = {}) {
  if (!isFirebaseConfigured || !db) return []
  const now = Date.now()
  if (
    !bypassCache &&
    activeNoticesCache.list &&
    now - activeNoticesCache.at < ACTIVE_CACHE_MS
  ) {
    return activeNoticesCache.list
  }
  if (!bypassCache && activeNoticesInflight) {
    return activeNoticesInflight
  }

  activeNoticesInflight = (async () => {
    const snap = await getDocs(query(noticesCol(), where('active', '==', true)))
    const dayId = todayId()
    const list = snap.docs
      .map((d) => normalizeNotice(d.id, d.data()))
      .filter((n) => isNoticeActiveNow(n, dayId))
      .sort(
        (a, b) =>
          a.order - b.order ||
          (b.createdAt || '').localeCompare(a.createdAt || ''),
      )
    activeNoticesCache = { at: Date.now(), list }
    return list
  })()

  try {
    return await activeNoticesInflight
  } finally {
    activeNoticesInflight = null
  }
}

export async function listPastNotices() {
  const all = await listAllNotices()
  return all
    .filter((n) => isNoticePast(n))
    .sort((a, b) => (b.endedAt || b.endAt || b.updatedAt || '').localeCompare(a.endedAt || a.endAt || a.updatedAt || ''))
}

export async function getNotice(noticeId) {
  if (!isFirebaseConfigured || !db) return null
  const snap = await getDoc(doc(db, COLLECTIONS.NOTICES, noticeId))
  return snap.exists() ? normalizeNotice(snap.id, snap.data()) : null
}

export async function createNotice(payload, userId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const title = String(payload.title ?? '').trim()
  const message = String(payload.message ?? '').trim()
  if (!title) throw new Error('Title is required.')
  if (!message) throw new Error('Message is required.')

  const now = new Date().toISOString()
  const docPayload = {
    title,
    message,
    tone: payload.tone || NOTICE_TONES.INFO,
    active: true,
    startAt: payload.startAt || null,
    endAt: payload.endAt || null,
    endedAt: null,
    endedBy: null,
    audienceRoles: payload.audienceRoles ?? [],
    audienceUserIds: payload.audienceUserIds ?? [],
    pages:
      payload.pages?.length > 0
        ? payload.pages
        : [NOTICE_PAGES.MEALS, NOTICE_PAGES.SEVA],
    order: typeof payload.order === 'number' ? payload.order : Date.now(),
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  }
  const ref = await addDoc(noticesCol(), docPayload)
  invalidateActiveNoticesCache()
  return normalizeNotice(ref.id, docPayload)
}

export async function updateNotice(noticeId, payload, userId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const title = String(payload.title ?? '').trim()
  const message = String(payload.message ?? '').trim()
  if (!title) throw new Error('Title is required.')
  if (!message) throw new Error('Message is required.')

  const patch = {
    title,
    message,
    tone: payload.tone || NOTICE_TONES.INFO,
    startAt: payload.startAt || null,
    endAt: payload.endAt || null,
    audienceRoles: payload.audienceRoles ?? [],
    audienceUserIds: payload.audienceUserIds ?? [],
    pages:
      payload.pages?.length > 0
        ? payload.pages
        : [NOTICE_PAGES.MEALS, NOTICE_PAGES.SEVA],
    updatedAt: new Date().toISOString(),
    updatedBy: userId ?? null,
  }
  if (typeof payload.order === 'number') patch.order = payload.order
  await updateDoc(doc(db, COLLECTIONS.NOTICES, noticeId), patch)
  invalidateActiveNoticesCache()
}

export async function endNotice(noticeId, userId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const now = new Date().toISOString()
  await updateDoc(doc(db, COLLECTIONS.NOTICES, noticeId), {
    active: false,
    endedAt: now,
    endedBy: userId ?? null,
    updatedAt: now,
    updatedBy: userId ?? null,
  })
  invalidateActiveNoticesCache()
}

export async function getUserReceipt(noticeId, userId) {
  if (!isFirebaseConfigured || !db || !userId) return null
  const snap = await getDoc(receiptRef(noticeId, userId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function listReceipts(noticeId) {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(receiptsCol(noticeId))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) =>
      (a.displayName || '').localeCompare(b.displayName || ''),
    )
}

export async function listUserReadNoticeIds(userId) {
  if (!isFirebaseConfigured || !db || !userId) return new Set()
  const notices = await listAllNotices()
  const readIds = new Set()
  await Promise.all(
    notices.map(async (n) => {
      const receipt = await getUserReceipt(n.id, userId)
      if (receipt?.readAt) readIds.add(n.id)
    }),
  )
  return readIds
}

/**
 * Audience/page filter only (uses local read ids). Fast path for first paint.
 */
export async function listBannerNoticeCandidates(page, profile) {
  if (!profile) return []
  const userId = profile.id
  const localRead = getLocalReadNoticeIds(userId)
  const active = await listActiveNotices()
  return active.filter(
    (n) =>
      (n.pages ?? []).includes(page) &&
      noticeMatchesAudience(n, profile) &&
      !localRead.has(n.id),
  )
}

/**
 * Notices for a page banner: active, matching audience/page, not yet marked read.
 */
export async function listBannerNoticesForUser(page, profile) {
  if (!profile) return []
  const userId = profile.id
  const active = await listActiveNotices()
  const candidates = active.filter(
    (n) =>
      (n.pages ?? []).includes(page) && noticeMatchesAudience(n, profile),
  )
  if (candidates.length === 0) {
    setCachedBannerNotices(userId, page, [])
    return []
  }

  const localRead = getLocalReadNoticeIds(userId)
  const toCheck = candidates.filter((n) => !localRead.has(n.id))
  if (toCheck.length === 0) {
    setCachedBannerNotices(userId, page, [])
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(localReadSyncedKey(userId), '1')
    }
    return []
  }

  const withRead = await Promise.all(
    toCheck.map(async (n) => {
      const receipt = await getUserReceipt(n.id, userId)
      return { notice: n, readAt: receipt?.readAt ?? null }
    }),
  )
  const newlyRead = withRead.filter((x) => x.readAt).map((x) => x.notice.id)
  const readIds = new Set([...localRead, ...newlyRead])
  syncLocalReadNoticeIds(userId, readIds)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(localReadSyncedKey(userId), '1')
  }
  const unread = withRead.filter((x) => !x.readAt).map((x) => x.notice)
  setCachedBannerNotices(userId, page, unread)
  return unread
}

export async function recordNoticeSeen(noticeId, userProfile) {
  if (!isFirebaseConfigured || !db || !userProfile?.id) return
  const ref = receiptRef(noticeId, userProfile.id)
  const existing = await getDoc(ref)
  const now = new Date().toISOString()
  if (existing.exists()) {
    const data = existing.data()
    if (data.seenAt) return
    await updateDoc(ref, {
      seenAt: now,
      updatedAt: now,
      displayName: userProfile.displayName || userProfile.email || 'User',
      role: userProfile.role ?? null,
    })
    return
  }
  await setDoc(ref, {
    userId: userProfile.id,
    displayName: userProfile.displayName || userProfile.email || 'User',
    role: userProfile.role ?? null,
    seenAt: now,
    readAt: null,
    updatedAt: now,
  })
}

export async function markNoticeRead(noticeId, userProfile) {
  if (!isFirebaseConfigured || !db || !userProfile?.id) {
    throw new Error('Not signed in')
  }
  rememberLocalReadNotice(userProfile.id, noticeId)
  const ref = receiptRef(noticeId, userProfile.id)
  const existing = await getDoc(ref)
  const now = new Date().toISOString()
  const base = {
    userId: userProfile.id,
    displayName: userProfile.displayName || userProfile.email || 'User',
    role: userProfile.role ?? null,
    readAt: now,
    updatedAt: now,
  }
  if (existing.exists()) {
    const data = existing.data()
    await updateDoc(ref, {
      ...base,
      seenAt: data.seenAt || now,
    })
    return
  }
  await setDoc(ref, {
    ...base,
    seenAt: now,
  })
}

export function summarizeReceipts(receipts) {
  const seen = receipts.filter((r) => r.seenAt)
  const read = receipts.filter((r) => r.readAt)
  return {
    seenCount: seen.length,
    readCount: read.length,
    seen,
    read,
  }
}