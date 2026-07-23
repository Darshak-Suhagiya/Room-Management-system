import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../lib/firebase'
import {
  COLLECTIONS,
  PUSH_AUDIENCE_TYPES,
  PUSH_JOB_KINDS,
} from '../config/constants'
import { getPlannedMenuItems } from '../utils/menuVoteUtils'

export { PUSH_JOB_KINDS }

export const DEFAULT_PUSH_SETTINGS = {
  morningEnabled: false,
  morningTime: '07:30',
  morningTitle: 'સવારનું મેનુ',
  morningAudienceType: PUSH_AUDIENCE_TYPES.ALL,
  morningNotVotedSlot: 'morning',
  eveningEnabled: false,
  eveningTime: '17:30',
  eveningTitle: 'સાંજનું મેનુ',
  eveningAudienceType: PUSH_AUDIENCE_TYPES.ALL,
  eveningNotVotedSlot: 'evening',
  fallbackBody: 'આજનું મેનુ જોઈને વોટ કરો.',
}

function itemDigestLabel(item) {
  return item.gu || item.labelGu || item.en || item.labelEn || item.id
}

function categoryDigestLabel(item, catalog) {
  if (item.categoryLabelGu) return item.categoryLabelGu
  const cat = catalog?.categories?.find((c) => c.id === item.categoryId)
  return (
    cat?.labelGu ||
    item.categoryLabelEn ||
    cat?.labelEn ||
    item.categoryId
  )
}

export function formatMenuDigestBody(menu, slotKey, catalog, fallbackBody = '') {
  const planned = getPlannedMenuItems(menu, slotKey, catalog)
  if (!planned.length) {
    return (
      fallbackBody ||
      (slotKey === 'evening'
        ? 'સાંજનું મેનુ આયોજિત નથી.'
        : 'સવારનું મેનુ આયોજિત નથી.')
    )
  }
  const byCat = new Map()
  for (const item of planned) {
    const label = categoryDigestLabel(item, catalog)
    if (!byCat.has(label)) byCat.set(label, [])
    byCat.get(label).push(itemDigestLabel(item))
  }
  const lines = []
  for (const [cat, names] of byCat) {
    lines.push(`${cat}: ${names.join(', ')}`)
  }
  const note = slotKey === 'morning' ? menu?.morningNote : menu?.eveningNote
  if (note) lines.push(`નોંધ: ${note}`)
  return lines.join('\n')
}

export async function getPushSettings() {
  if (!isFirebaseConfigured || !db) return { ...DEFAULT_PUSH_SETTINGS }
  const snap = await getDoc(doc(db, COLLECTIONS.PUSH_SETTINGS, 'default'))
  if (!snap.exists()) return { ...DEFAULT_PUSH_SETTINGS }
  return { ...DEFAULT_PUSH_SETTINGS, ...snap.data() }
}

export async function savePushSettings(settings, userId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  await setDoc(
    doc(db, COLLECTIONS.PUSH_SETTINGS, 'default'),
    {
      ...DEFAULT_PUSH_SETTINGS,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: userId ?? null,
    },
    { merge: true },
  )
}

/**
 * Send push via Vercel API (/api/send-push). Requires signed-in user with manage role.
 */
export async function sendPushNow(payload) {
  if (!auth?.currentUser) {
    throw new Error('Sign in required')
  }
  const idToken = await auth.currentUser.getIdToken()
  const res = await fetch('/api/send-push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  })
  let data = {}
  try {
    data = await res.json()
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(data.error || `Send failed (${res.status})`)
  }
  return data
}

/** Map a notice audience to push audience and send FCM. */
export async function sendNoticePush(notice) {
  const roles = notice.audienceRoles ?? []
  const userIds = notice.audienceUserIds ?? []
  let audience
  if (roles.length === 0 && userIds.length === 0) {
    audience = { type: PUSH_AUDIENCE_TYPES.ALL }
  } else {
    audience = {
      type: 'roles_or_users',
      roles,
      userIds,
    }
  }
  return sendPushNow({
    title: notice.title || 'Notice',
    body: notice.message || '',
    kind: PUSH_JOB_KINDS.CUSTOM,
    audience,
  })
}

export function audienceSummary(audience) {
  if (!audience) return 'Everyone'
  if (audience.type === PUSH_AUDIENCE_TYPES.ALL) return 'All users'
  if (audience.type === PUSH_AUDIENCE_TYPES.NOT_VOTED) {
    return `Not voted (${audience.voteSlot || 'morning'}${
      audience.voteDateId ? ` · ${audience.voteDateId}` : ''
    })`
  }
  if (audience.type === PUSH_AUDIENCE_TYPES.ROLES) {
    const roles = audience.roles || []
    return roles.length ? `Roles: ${roles.join(', ')}` : 'Roles (none)'
  }
  if (audience.type === PUSH_AUDIENCE_TYPES.USERS) {
    return `${(audience.userIds || []).length} user(s)`
  }
  return audience.type
}

export function buildDailyAudience(settings, slot) {
  const type =
    slot === 'morning'
      ? settings.morningAudienceType
      : settings.eveningAudienceType
  const voteSlot =
    slot === 'morning'
      ? settings.morningNotVotedSlot || 'morning'
      : settings.eveningNotVotedSlot || 'evening'
  if (type === PUSH_AUDIENCE_TYPES.NOT_VOTED) {
    return {
      type: PUSH_AUDIENCE_TYPES.NOT_VOTED,
      voteSlot,
      voteDateId: undefined, // API defaults to today IST
    }
  }
  return { type: PUSH_AUDIENCE_TYPES.ALL }
}
