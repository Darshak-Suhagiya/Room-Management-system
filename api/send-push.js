/**
 * Vercel serverless: send FCM push now (no scheduler / no logs).
 * Auth: Firebase ID token in Authorization: Bearer <token>
 * Caller must be admin | kitchen_leader | room_leader.
 *
 * Env: FIREBASE_SERVICE_ACCOUNT = full service account JSON string
 */
import admin from 'firebase-admin'

const MANAGE_ROLES = new Set(['admin', 'kitchen_leader', 'room_leader'])

const COL = {
  USERS: 'users',
  MENUS: 'menus',
  MEAL_PARTICIPATION: 'mealParticipation',
  MENU_CATEGORIES: 'menuCategories',
  MENU_ITEMS: 'menuItems',
  PUSH_SETTINGS: 'pushSettings',
}

function initAdmin() {
  if (admin.apps.length) return admin.app()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT env var')
  }
  const sa = typeof raw === 'string' ? JSON.parse(raw) : raw
  return admin.initializeApp({
    credential: admin.credential.cert(sa),
  })
}

function todayId() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
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

async function loadCatalog(db) {
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
  const note = slotKey === 'morning' ? menu.morningNote : menu.eveningNote
  if (note) lines.push(`Note: ${note}`)
  return lines.join('\n')
}

async function listApprovedUsers(db) {
  const snap = await db.collection(COL.USERS).get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(isApprovedUser)
}

async function resolveAudience(db, audience, catalog) {
  const type = audience?.type || 'all'
  const users = await listApprovedUsers(db)

  if (type === 'users') {
    const ids = new Set(audience.userIds || [])
    return users.filter((u) => ids.has(u.id)).map((u) => u.id)
  }
  if (type === 'roles') {
    const roles = new Set(audience.roles || [])
    return users.filter((u) => roles.has(u.role)).map((u) => u.id)
  }
  // Notice-style: match if role OR explicit user id (empty both = all)
  if (type === 'roles_or_users') {
    const roles = new Set(audience.roles || [])
    const ids = new Set(audience.userIds || [])
    if (roles.size === 0 && ids.size === 0) {
      return users.map((u) => u.id)
    }
    return users
      .filter((u) => ids.has(u.id) || roles.has(u.role))
      .map((u) => u.id)
  }
  if (type === 'not_voted') {
    const voteDateId = audience.voteDateId || todayId()
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

async function loadTokensForUsers(db, userIds) {
  const tokens = []
  const tokenMeta = []
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

async function pruneInvalidToken(db, meta, errorCode) {
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
  } catch {
    /* ignore */
  }
}

async function sendToTokens(db, title, body, tokens, tokenMeta) {
  const uniqueTokens = [...new Set(tokens)]
  if (!uniqueTokens.length) {
    return { successCount: 0, failureCount: 0, errors: ['No device tokens'] }
  }
  const messaging = admin.messaging()
  let successCount = 0
  let failureCount = 0
  const errors = []
  const metaByToken = new Map(tokenMeta.map((m) => [m.token, m]))

  for (let i = 0; i < uniqueTokens.length; i += 500) {
    const batch = uniqueTokens.slice(i, i + 500)
    const res = await messaging.sendEachForMulticast({
      tokens: batch,
      // Single display path only — do NOT also set webpush.notification
      // (that causes 2 banners for 1 token on web/PWA).
      notification: { title, body },
      webpush: {
        fcmOptions: { link: '/' },
        headers: { Urgency: 'high' },
      },
      data: { title, body, click_action: '/' },
    })
    successCount += res.successCount
    failureCount += res.failureCount
    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code || 'unknown'
        errors.push(`${code}: ${r.error?.message || 'send failed'}`)
        const meta = metaByToken.get(batch[idx])
        if (meta) pruneInvalidToken(db, meta, code)
      }
    })
  }
  return { successCount, failureCount, errors: errors.slice(0, 20) }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization',
  )
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    initAdmin()
    const db = admin.firestore()

    const authHeader = req.headers.authorization || ''
    const idToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null
    if (!idToken) {
      return res.status(401).json({ error: 'Missing Authorization bearer token' })
    }

    const decoded = await admin.auth().verifyIdToken(idToken)
    const profileSnap = await db.collection(COL.USERS).doc(decoded.uid).get()
    const profile = profileSnap.exists ? profileSnap.data() : null
    if (!profile || !MANAGE_ROLES.has(profile.role)) {
      return res.status(403).json({ error: 'Not allowed to send push' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const title = String(body?.title || '').trim()
    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }

    const kind = body.kind || 'custom'
    const menuDateId = body.menuDateId || null
    const mealSlot = body.mealSlot || null
    const audience = body.audience || { type: 'all' }
    let messageBody = String(body.body || '')

    const catalog = await loadCatalog(db)
    if ((kind === 'menu_digest' || kind === 'daily_digest') && menuDateId && mealSlot) {
      const menuSnap = await db.collection(COL.MENUS).doc(menuDateId).get()
      const menu = menuSnap.exists ? { id: menuSnap.id, ...menuSnap.data() } : null
      const settingsSnap = await db.collection(COL.PUSH_SETTINGS).doc('default').get()
      const settings = settingsSnap.exists ? settingsSnap.data() : {}
      if (!messageBody.trim()) {
        messageBody = formatMenuDigestBody(
          menu,
          mealSlot,
          catalog,
          settings.fallbackBody || '',
        )
      }
    }

    const userIds = await resolveAudience(db, audience, catalog)
    const { tokens, tokenMeta } = await loadTokensForUsers(db, userIds)

    console.log('send-push audience', {
      userCount: userIds.length,
      tokenCount: tokens.length,
      audienceType: audience?.type,
    })

    if (!userIds.length) {
      return res.status(400).json({
        error: 'No users matched this audience.',
        recipientUserCount: 0,
        tokenCount: 0,
      })
    }

    if (!tokens.length) {
      return res.status(400).json({
        error: `Found ${userIds.length} user(s) but none have an FCM device token. Ask them to open My Meals / Room Seva and tap Enable (or Register this device) on the Vercel app URL.`,
        recipientUserCount: userIds.length,
        tokenCount: 0,
        successCount: 0,
        failureCount: 0,
      })
    }

    const result = await sendToTokens(db, title, messageBody, tokens, tokenMeta)

    return res.status(200).json({
      ok: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
      recipientUserCount: userIds.length,
      tokenCount: tokens.length,
      errors: result.errors,
    })
  } catch (err) {
    console.error('send-push error', err)
    return res.status(500).json({
      error: err.message || 'Failed to send push',
    })
  }
}
