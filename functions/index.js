/**
 * Cloud Functions: FCM push send, schedule queue, daily morning/evening digests.
 * Timezone: Asia/Kolkata
 */
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { setGlobalOptions } = require('firebase-functions/v2')

initializeApp()
setGlobalOptions({ region: 'asia-south1' })

const db = getFirestore()
const TZ = 'Asia/Kolkata'

const COL = {
  USERS: 'users',
  MENUS: 'menus',
  MEAL_PARTICIPATION: 'mealParticipation',
  MENU_CATEGORIES: 'menuCategories',
  MENU_ITEMS: 'menuItems',
  PUSH_SETTINGS: 'pushSettings',
  PUSH_JOBS: 'pushJobs',
  PUSH_LOGS: 'pushLogs',
  PUSH_DIGEST_CURSOR: 'pushDigestCursor',
}

const MANAGE_ROLES = new Set(['admin', 'kitchen_leader', 'room_leader'])

function todayIdInIST(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function timeHmInIST(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

async function getCallerProfile(uid) {
  const snap = await db.collection(COL.USERS).doc(uid).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() }
}

function assertCanManagePush(profile) {
  if (!profile || !MANAGE_ROLES.has(profile.role)) {
    throw new HttpsError(
      'permission-denied',
      'Only admin, kitchen leader, or room leader can manage push.',
    )
  }
}

function isApprovedUser(u) {
  if (!u) return false
  if (u.role === 'admin') return true
  return u.status === 'approved' || u.status == null
}

function getVoteValue(votes, itemId) {
  const v = votes?.[itemId]
  if (v && typeof v === 'object' && 'value' in v) return v.value
  return v
}

function isVoteAnswered(voteType, val) {
  if (val === undefined || val === null || val === '') return false
  if (voteType === 'integer') {
    const n = Number(val)
    return Number.isFinite(n) && n >= 0.5
  }
  return val === true || val === false
}

function hasMealVoteComplete(participation, plannedItems) {
  if (!participation) return false
  if (participation.notEating) return true
  if (!plannedItems.length) return false
  return plannedItems.every((item) => {
    const val = getVoteValue(participation.votes, item.id)
    return isVoteAnswered(item.voteType || 'yes_no', val)
  })
}

async function loadCatalog() {
  const [catSnap, itemSnap] = await Promise.all([
    db.collection(COL.MENU_CATEGORIES).get(),
    db.collection(COL.MENU_ITEMS).get(),
  ])
  const categories = catSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const items = itemSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return { categories, items }
}

function getPlannedMenuItems(menu, slotKey, catalog) {
  if (!menu || !catalog?.categories) return []
  const slot = menu[slotKey]
  if (!slot) return []
  const planned = []
  for (const cat of catalog.categories) {
    for (const itemId of slot[cat.id] ?? []) {
      const item = catalog.items.find((i) => i.id === itemId)
      if (item) {
        planned.push({
          ...item,
          categoryId: cat.id,
          voteType: item.voteType || 'yes_no',
        })
      }
    }
  }
  return planned
}

function formatMenuDigestBody(menu, slotKey, catalog, fallbackBody) {
  const planned = getPlannedMenuItems(menu, slotKey, catalog)
  if (!planned.length) {
    return fallbackBody || `No ${slotKey} menu planned for today.`
  }
  const byCat = new Map()
  for (const item of planned) {
    const label =
      catalog.categories.find((c) => c.id === item.categoryId)?.labelEn ||
      item.categoryId
    if (!byCat.has(label)) byCat.set(label, [])
    byCat.get(label).push(item.labelEn || item.labelGu || item.id)
  }
  const lines = []
  for (const [cat, names] of byCat) {
    lines.push(`${cat}: ${names.join(', ')}`)
  }
  const note =
    slotKey === 'morning' ? menu.morningNote : menu.eveningNote
  if (note) lines.push(`Note: ${note}`)
  return lines.join('\n')
}

async function listApprovedUsers() {
  const snap = await db.collection(COL.USERS).get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(isApprovedUser)
}

async function resolveAudience(audience, catalog) {
  const type = audience?.type || 'all'
  const users = await listApprovedUsers()

  if (type === 'users') {
    const ids = new Set(audience.userIds || [])
    return users.filter((u) => ids.has(u.id)).map((u) => u.id)
  }

  if (type === 'roles') {
    const roles = new Set(audience.roles || [])
    return users.filter((u) => roles.has(u.role)).map((u) => u.id)
  }

  if (type === 'not_voted') {
    const voteDateId = audience.voteDateId || todayIdInIST()
    const voteSlot = audience.voteSlot || 'morning'
    const menuSnap = await db.collection(COL.MENUS).doc(voteDateId).get()
    const menu = menuSnap.exists ? { id: menuSnap.id, ...menuSnap.data() } : null
    const planned = getPlannedMenuItems(menu, voteSlot, catalog)
    const partSnap = await db
      .collection(COL.MEAL_PARTICIPATION)
      .where('date', '==', voteDateId)
      .where('slot', '==', voteSlot)
      .get()
    const byUser = new Map(
      partSnap.docs.map((d) => {
        const data = d.data()
        return [data.userId, { id: d.id, ...data }]
      }),
    )
    return users
      .filter((u) => !hasMealVoteComplete(byUser.get(u.id), planned))
      .map((u) => u.id)
  }

  return users.map((u) => u.id)
}

async function loadTokensForUsers(userIds) {
  const tokens = []
  const tokenMeta = []
  // Batch get in chunks of parallel requests
  const chunkSize = 20
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(async (uid) => {
        const snap = await db
          .collection(COL.USERS)
          .doc(uid)
          .collection('fcmTokens')
          .get()
        snap.docs.forEach((d) => {
          const data = d.data()
          if (data.token) {
            tokens.push(data.token)
            tokenMeta.push({ userId: uid, docId: d.id, token: data.token })
          }
        })
      }),
    )
  }
  return { tokens: [...new Set(tokens)], tokenMeta }
}

async function pruneInvalidToken(meta, errorCode) {
  if (
    errorCode !== 'messaging/registration-token-not-registered' &&
    errorCode !== 'messaging/invalid-registration-token'
  ) {
    return
  }
  try {
    await db
      .collection(COL.USERS)
      .doc(meta.userId)
      .collection('fcmTokens')
      .doc(meta.docId)
      .delete()
  } catch (err) {
    console.error('prune token', err)
  }
}

async function sendToTokens(title, body, tokens, tokenMeta) {
  if (!tokens.length) {
    return { successCount: 0, failureCount: 0, errors: ['No device tokens'] }
  }
  const messaging = getMessaging()
  let successCount = 0
  let failureCount = 0
  const errors = []
  const metaByToken = new Map(tokenMeta.map((m) => [m.token, m]))

  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500)
    const res = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      webpush: {
        fcmOptions: { link: '/' },
        headers: { Urgency: 'high' },
      },
      data: {
        title,
        body,
        click_action: '/',
      },
    })
    successCount += res.successCount
    failureCount += res.failureCount
    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code || 'unknown'
        const msg = r.error?.message || 'send failed'
        errors.push(`${code}: ${msg}`)
        const meta = metaByToken.get(batch[idx])
        if (meta) pruneInvalidToken(meta, code)
      }
    })
  }

  return {
    successCount,
    failureCount,
    errors: errors.slice(0, 20),
  }
}

async function writeLog(payload) {
  const ref = db.collection(COL.PUSH_LOGS).doc()
  await ref.set({
    ...payload,
    createdAt: new Date().toISOString(),
  })
  return ref.id
}

async function executeSend({
  title,
  body,
  audience,
  kind,
  menuDateId,
  mealSlot,
  triggeredBy,
  jobId,
  createdBy,
}) {
  const catalog = await loadCatalog()
  let finalBody = body
  if (
    (kind === 'menu_digest' || kind === 'daily_digest') &&
    menuDateId &&
    mealSlot
  ) {
    const menuSnap = await db.collection(COL.MENUS).doc(menuDateId).get()
    const menu = menuSnap.exists ? { id: menuSnap.id, ...menuSnap.data() } : null
    const settings = (await db.collection(COL.PUSH_SETTINGS).doc('default').get())
      .data() || {}
    finalBody =
      body ||
      formatMenuDigestBody(
        menu,
        mealSlot,
        catalog,
        settings.fallbackBody || '',
      )
  }

  const userIds = await resolveAudience(audience || { type: 'all' }, catalog)
  const { tokens, tokenMeta } = await loadTokensForUsers(userIds)
  const result = await sendToTokens(title, finalBody || '', tokens, tokenMeta)

  await writeLog({
    title,
    body: finalBody || '',
    kind: kind || 'custom',
    menuDateId: menuDateId || null,
    mealSlot: mealSlot || null,
    audience: audience || { type: 'all' },
    triggeredBy,
    jobId: jobId || null,
    createdBy: createdBy || null,
    recipientUserCount: userIds.length,
    tokenCount: tokens.length,
    successCount: result.successCount,
    failureCount: result.failureCount,
    errors: result.errors,
    sentAt: new Date().toISOString(),
  })

  return {
    ...result,
    recipientUserCount: userIds.length,
    tokenCount: tokens.length,
    body: finalBody,
  }
}

async function getDefaultSettings() {
  const snap = await db.collection(COL.PUSH_SETTINGS).doc('default').get()
  if (!snap.exists) {
    return {
      morningEnabled: false,
      morningTime: '07:30',
      morningTitle: 'Morning menu',
      morningAudienceType: 'all',
      morningNotVotedSlot: 'morning',
      eveningEnabled: false,
      eveningTime: '17:30',
      eveningTitle: 'Evening menu',
      eveningAudienceType: 'all',
      eveningNotVotedSlot: 'evening',
      fallbackBody: 'Please check today’s menu and vote.',
    }
  }
  return snap.data()
}

async function processDailyDigests() {
  const settings = await getDefaultSettings()
  const hm = timeHmInIST()
  const dateId = todayIdInIST()
  const cursorRef = db.collection(COL.PUSH_DIGEST_CURSOR).doc('default')
  const cursorSnap = await cursorRef.get()
  const cursor = cursorSnap.exists ? cursorSnap.data() : {}

  const slots = [
    {
      enabled: settings.morningEnabled,
      time: settings.morningTime || '07:30',
      title: settings.morningTitle || 'Morning menu',
      mealSlot: 'morning',
      audienceType: settings.morningAudienceType || 'all',
      notVotedSlot: settings.morningNotVotedSlot || 'morning',
      cursorKey: 'morningDateId',
    },
    {
      enabled: settings.eveningEnabled,
      time: settings.eveningTime || '17:30',
      title: settings.eveningTitle || 'Evening menu',
      mealSlot: 'evening',
      audienceType: settings.eveningAudienceType || 'all',
      notVotedSlot: settings.eveningNotVotedSlot || 'evening',
      cursorKey: 'eveningDateId',
    },
  ]

  for (const slot of slots) {
    if (!slot.enabled) continue
    if ((slot.time || '').slice(0, 5) !== hm) continue
    if (cursor[slot.cursorKey] === dateId) continue

    const audience =
      slot.audienceType === 'not_voted'
        ? {
            type: 'not_voted',
            voteDateId: dateId,
            voteSlot: slot.notVotedSlot || slot.mealSlot,
          }
        : { type: 'all' }

    await executeSend({
      title: slot.title,
      body: '',
      audience,
      kind: 'daily_digest',
      menuDateId: dateId,
      mealSlot: slot.mealSlot,
      triggeredBy: 'cron_daily',
      createdBy: 'system',
    })

    await cursorRef.set(
      {
        [slot.cursorKey]: dateId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    )
  }
}

async function processDueJobs() {
  const nowIso = new Date().toISOString()
  const snap = await db
    .collection(COL.PUSH_JOBS)
    .where('status', '==', 'scheduled')
    .where('sendAt', '<=', nowIso)
    .limit(20)
    .get()

  for (const docSnap of snap.docs) {
    const job = { id: docSnap.id, ...docSnap.data() }
    await docSnap.ref.update({
      status: 'sending',
      updatedAt: nowIso,
    })
    try {
      const result = await executeSend({
        title: job.title,
        body: job.body || '',
        audience: job.audience || { type: 'all' },
        kind: job.kind || 'custom',
        menuDateId: job.menuDateId || null,
        mealSlot: job.mealSlot || null,
        triggeredBy: 'cron_job',
        jobId: job.id,
        createdBy: job.createdBy || null,
      })
      await docSnap.ref.update({
        status: 'sent',
        sentAt: nowIso,
        successCount: result.successCount,
        failureCount: result.failureCount,
        updatedAt: nowIso,
      })
    } catch (err) {
      console.error('job failed', job.id, err)
      await docSnap.ref.update({
        status: 'failed',
        error: err.message || String(err),
        updatedAt: nowIso,
      })
    }
  }
}

exports.sendPushNow = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.')
  }
  const profile = await getCallerProfile(request.auth.uid)
  assertCanManagePush(profile)

  const data = request.data || {}
  const title = String(data.title || '').trim()
  if (!title) throw new HttpsError('invalid-argument', 'Title is required.')

  const result = await executeSend({
    title,
    body: String(data.body || ''),
    audience: data.audience || { type: 'all' },
    kind: data.kind || 'custom',
    menuDateId: data.menuDateId || null,
    mealSlot: data.mealSlot || null,
    triggeredBy: 'manual',
    createdBy: request.auth.uid,
  })

  return {
    ok: true,
    successCount: result.successCount,
    failureCount: result.failureCount,
    recipientUserCount: result.recipientUserCount,
    tokenCount: result.tokenCount,
  }
})

exports.cancelPushJob = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.')
  }
  const profile = await getCallerProfile(request.auth.uid)
  assertCanManagePush(profile)

  const jobId = request.data?.jobId
  if (!jobId) throw new HttpsError('invalid-argument', 'jobId required.')

  const ref = db.collection(COL.PUSH_JOBS).doc(jobId)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Job not found.')
  if (snap.data().status !== 'scheduled') {
    throw new HttpsError('failed-precondition', 'Only scheduled jobs can be cancelled.')
  }
  await ref.update({
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
    cancelledBy: request.auth.uid,
  })
  return { ok: true }
})

exports.processPushQueue = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: TZ,
  },
  async () => {
    await processDailyDigests()
    await processDueJobs()
  },
)
