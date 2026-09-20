/**
 * Shared FCM helpers for Vercel API routes.
 * Files under api/_lib are not routed as endpoints.
 */
import admin from 'firebase-admin'

export function initAdmin() {
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

export function resolveRelated(source, kind, menuDateId, relatedId) {
  if (source === 'finance' || kind === 'finance') {
    return { relatedType: 'finance', relatedId: relatedId ?? null }
  }
  if (source === 'notice') {
    return { relatedType: 'notice', relatedId: relatedId ?? null }
  }
  if (source === 'shopping') {
    return { relatedType: 'shopping_ticket', relatedId: relatedId ?? null }
  }
  if (source === 'menu_update' || kind === 'menu_digest' || kind === 'daily_digest') {
    return { relatedType: 'menu', relatedId: menuDateId ?? relatedId ?? null }
  }
  return { relatedType: null, relatedId: relatedId ?? null }
}

export function userDeliveryMessage(recipient) {
  if (recipient.status === 'no_tokens') {
    return 'Enable notifications in Settings to receive alerts'
  }
  if (recipient.status === 'partial') {
    return 'Sent to some devices only'
  }
  if (recipient.status === 'failed' && recipient.errors?.length) {
    const err = recipient.errors[0]
    return `${err.code}: ${err.message}`
  }
  return null
}

export async function loadUserProfiles(db, userIds) {
  const profiles = new Map()
  const chunkSize = 20
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(async (uid) => {
        const snap = await db.collection('users').doc(uid).get()
        if (snap.exists) {
          const data = snap.data()
          profiles.set(uid, {
            id: uid,
            displayName:
              data.displayName || data.email?.split('@')[0] || 'User',
            role: data.role ?? null,
          })
        } else {
          profiles.set(uid, { id: uid, displayName: uid, role: null })
        }
      }),
    )
  }
  return profiles
}

export async function loadTokensForUsers(db, userIds) {
  const tokens = []
  const tokenMeta = []
  const tokensByUser = new Map()
  const chunkSize = 20
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(async (uid) => {
        const snap = await db
          .collection('users')
          .doc(uid)
          .collection('fcmTokens')
          .get()
        const userTokens = []
        snap.docs.forEach((d) => {
          const data = d.data()
          if (data.token) {
            tokens.push(data.token)
            tokenMeta.push({ userId: uid, docId: d.id, token: data.token })
            userTokens.push(data.token)
          }
        })
        tokensByUser.set(uid, userTokens)
      }),
    )
  }
  return {
    tokens: [...new Set(tokens)],
    tokenMeta,
    tokensByUser,
  }
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
      .collection('users')
      .doc(meta.userId)
      .collection('fcmTokens')
      .doc(meta.docId)
      .delete()
  } catch {
    /* ignore */
  }
}

function dedupeErrors(errors) {
  const seen = new Set()
  const out = []
  for (const err of errors) {
    const key = `${err.code}:${err.message}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(err)
  }
  return out
}

function deriveRecipientStatus(successCount, failureCount, deviceCount) {
  if (deviceCount === 0) return 'no_tokens'
  if (failureCount === 0) return 'success'
  if (successCount === 0) return 'failed'
  return 'partial'
}

export function buildRecipientRows(userIds, profiles, tokensByUser, perUserResults) {
  return userIds.map((uid) => {
    const profile = profiles.get(uid) || {
      id: uid,
      displayName: uid,
      role: null,
    }
    const deviceCount = tokensByUser.get(uid)?.length ?? 0
    const result = perUserResults.get(uid) || {
      successCount: 0,
      failureCount: 0,
      errors: [],
    }
    const status = deriveRecipientStatus(
      result.successCount,
      result.failureCount,
      deviceCount,
    )
    return {
      userId: uid,
      displayName: profile.displayName,
      role: profile.role,
      pushEnabled: deviceCount > 0,
      deviceCount,
      status,
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: dedupeErrors(result.errors),
    }
  })
}

export async function sendToTokens(db, title, body, tokens, tokenMeta, link = '/') {
  const uniqueTokens = [...new Set(tokens)]
  if (!uniqueTokens.length) {
    return {
      successCount: 0,
      failureCount: 0,
      errors: ['No device tokens'],
      perUserResults: new Map(),
    }
  }
  const messaging = admin.messaging()
  let successCount = 0
  let failureCount = 0
  const errors = []
  const perUserResults = new Map()
  const metaByToken = new Map(tokenMeta.map((m) => [m.token, m]))

  const ensureUserResult = (uid) => {
    if (!perUserResults.has(uid)) {
      perUserResults.set(uid, {
        successCount: 0,
        failureCount: 0,
        errors: [],
      })
    }
    return perUserResults.get(uid)
  }

  for (let i = 0; i < uniqueTokens.length; i += 500) {
    const batch = uniqueTokens.slice(i, i + 500)
    const res = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      webpush: {
        fcmOptions: { link },
        headers: { Urgency: 'high' },
      },
      data: { title, body, click_action: link },
    })
    successCount += res.successCount
    failureCount += res.failureCount
    res.responses.forEach((r, idx) => {
      const meta = metaByToken.get(batch[idx])
      if (!meta) return
      const userResult = ensureUserResult(meta.userId)
      if (r.success) {
        userResult.successCount += 1
      } else {
        const code = r.error?.code || 'unknown'
        const message = r.error?.message || 'send failed'
        userResult.failureCount += 1
        userResult.errors.push({ code, message })
        errors.push(`${code}: ${message}`)
        pruneInvalidToken(db, meta, code)
      }
    })
  }
  return {
    successCount,
    failureCount,
    errors: errors.slice(0, 20),
    perUserResults,
  }
}

export async function writePushLog(db, payload) {
  try {
    const ref = db.collection('pushLogs').doc()
    await ref.set({
      ...payload,
      createdAt: new Date().toISOString(),
    })
    return ref.id
  } catch (err) {
    console.error('push log write failed', err)
    return null
  }
}

export async function fanOutUserNotifications(db, pushLogId, recipients, payload) {
  if (!recipients?.length) return
  const { relatedType, relatedId } = resolveRelated(
    payload.source,
    payload.kind,
    payload.menuDateId,
    payload.relatedId,
  )
  const createdAt = new Date().toISOString()

  try {
    for (let i = 0; i < recipients.length; i += 500) {
      const batch = db.batch()
      const chunk = recipients.slice(i, i + 500)
      for (const recipient of chunk) {
        const ref = db
          .collection('users')
          .doc(recipient.userId)
          .collection('notifications')
          .doc()
        batch.set(ref, {
          pushLogId: pushLogId ?? null,
          title: payload.title,
          body: payload.body,
          kind: payload.kind,
          source: payload.source,
          relatedType,
          relatedId,
          menuDateId: payload.menuDateId ?? null,
          mealSlot: payload.mealSlot ?? null,
          sentAt: payload.sentAt,
          deliveryStatus: recipient.status,
          deviceCount: recipient.deviceCount,
          successCount: recipient.successCount,
          failureCount: recipient.failureCount,
          deliveryMessage: userDeliveryMessage(recipient),
          seenAt: null,
          readAt: null,
          clearedAt: null,
          createdAt,
        })
      }
      await batch.commit()
    }
  } catch (err) {
    console.error('user notification fan-out failed', err)
  }
}
