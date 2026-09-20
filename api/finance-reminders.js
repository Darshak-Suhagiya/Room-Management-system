/**
 * Daily cron: finance due-date reminders.
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
import admin from 'firebase-admin'
import {
  initAdmin,
  loadTokensForUsers,
  sendToTokens,
  writePushLog,
  fanOutUserNotifications,
  buildRecipientRows,
  loadUserProfiles,
} from './_lib/push.js'

const DEFAULT_REMINDER = {
  enabled: true,
  daysBefore: 1,
  remindOnDue: true,
  overdueEveryDays: 3,
}

function todayIdIst() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function addDays(dateId, days) {
  const [y, m, d] = dateId.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function daysBetween(fromId, toId) {
  const a = fromId.split('-').map(Number)
  const b = toId.split('-').map(Number)
  const da = Date.UTC(a[0], a[1] - 1, a[2])
  const db = Date.UTC(b[0], b[1] - 1, b[2])
  return Math.round((db - da) / 86400000)
}

function formatInr(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100)
}

function paidForDue(dueId, payments) {
  return payments
    .filter((p) => p.dueId === dueId && p.voided !== true)
    .reduce((sum, p) => sum + (Number(p.amountPaise) || 0), 0)
}

function payableFor(due) {
  if (typeof due.payablePaise === 'number') {
    return Math.max(0, due.payablePaise)
  }
  return Math.max(
    0,
    (Number(due.roundedDuePaise) || 0) - (Number(due.carryInPaise) || 0),
  )
}

function outstandingFor(due, payments) {
  if (due.waived === true || due.status === 'waived') return 0
  return Math.max(0, payableFor(due) - paidForDue(due.id, payments))
}

function reminderAmount(due, payments) {
  return outstandingFor(due, payments)
}

function formatDateLabel(dateId) {
  if (!dateId) return ''
  const [y, m, d] = dateId.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

async function claimReminderKey(db, collectionId, key) {
  const ref = db.collection('financeCollections').doc(collectionId)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return false
    const current = snap.data().remindersSent || {}
    if (current[key]) return false
    const sentAt = new Date().toISOString()
    tx.update(ref, {
      remindersSent: { ...current, [key]: sentAt },
      updatedAt: sentAt,
    })
    return true
  })
}

function reminderKey(collection, cfg, today) {
  const sent = collection.remindersSent || {}
  const due = collection.dueDate
  if (!due) return null
  if (today > due) {
    const overdueDays = daysBetween(due, today)
    if (overdueDays < 1) return null
    const every = Math.max(1, cfg.overdueEveryDays || 3)
    if (overdueDays === 1 || overdueDays % every === 0) {
      const key = `overdue-${today}`
      if (!sent[key]) return { key, kind: 'overdue' }
    }
    return null
  }
  if (cfg.remindOnDue && today === due && !sent.due) {
    return { key: 'due', kind: 'due' }
  }
  const daysBefore = Number(cfg.daysBefore) || 0
  if (daysBefore > 0) {
    const beforeId = addDays(due, -daysBefore)
    if (today === beforeId && !sent.before) {
      return { key: 'before', kind: 'before' }
    }
  }
  if (!sent.issued && !sent.before && !sent.due && today <= due) {
    return { key: 'issued', kind: 'issued' }
  }
  return null
}

function messageFor(kind, collection, amountPaise) {
  const amount = formatInr(amountPaise)
  const when = formatDateLabel(collection.dueDate)
  const title = collection.title || 'Room dues'
  if (kind === 'overdue') {
    return {
      title,
      body: `Overdue: room dues ${amount} were due ${when}`,
    }
  }
  if (kind === 'due') {
    return { title, body: `Room dues ${amount} are due today` }
  }
  if (kind === 'before') {
    return { title, body: `Room dues ${amount} due on ${when}` }
  }
  return { title, body: `Room dues ${amount} issued · due ${when}` }
}

async function sendDueReminders(db, collection, dues, kind) {
  const sentAt = new Date().toISOString()
  for (const due of dues) {
    const userIds = [due.userId]
    const profiles = await loadUserProfiles(db, userIds)
    const { tokens, tokenMeta, tokensByUser } = await loadTokensForUsers(
      db,
      userIds,
    )
    const { title, body } = messageFor(kind, collection, due.reminderPaise ?? due.roundedDuePaise)
    const result = tokens.length
      ? await sendToTokens(db, title, body, tokens, tokenMeta, '/finance')
      : {
          successCount: 0,
          failureCount: 0,
          errors: ['No device tokens'],
          perUserResults: new Map(),
        }
    const recipients = buildRecipientRows(
      userIds,
      profiles,
      tokensByUser,
      result.perUserResults,
    )
    const pushLogId = await writePushLog(db, {
      title,
      body,
      kind: 'custom',
      source: 'finance',
      triggeredBy: 'automatic',
      relatedId: collection.id,
      sentAt,
      recipientUserCount: 1,
      tokenCount: tokens.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.errors,
      recipients,
    })
    await fanOutUserNotifications(db, pushLogId, recipients, {
      title,
      body,
      kind: 'custom',
      source: 'finance',
      relatedId: collection.id,
      sentAt,
    })
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(204).end()
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const secret = process.env.CRON_SECRET || ''
  if (!secret || token !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    initAdmin()
    const db = admin.firestore()
    const settingsSnap = await db.collection('financeSettings').doc('default').get()
    const cfg = {
      ...DEFAULT_REMINDER,
      ...(settingsSnap.exists ? settingsSnap.data().reminderConfig : {}),
    }
    if (cfg.enabled === false) {
      return res.status(200).json({ ok: true, skipped: 'reminders disabled' })
    }

    const today = todayIdIst()
    const colSnap = await db
      .collection('financeCollections')
      .where('status', '==', 'issued')
      .get()

    const dueSnap = await db.collection('financeDues').get()
    const paySnap = await db.collection('financePayments').get()
    const allDues = dueSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const allPayments = paySnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    let sent = 0
    for (const doc of colSnap.docs) {
      const collection = { id: doc.id, ...doc.data() }
      if (collection.sendReminders === false) continue
      const plan = reminderKey(collection, cfg, today)
      if (!plan) continue
      const dues = allDues.filter((d) => d.collectionId === collection.id)
      const unpaid = dues
        .map((due) => ({
          ...due,
          reminderPaise: reminderAmount(due, allPayments),
        }))
        .filter((d) => d.reminderPaise > 0)
      if (!unpaid.length) continue
      const claimed = await claimReminderKey(db, collection.id, plan.key)
      if (!claimed) continue
      await sendDueReminders(db, collection, unpaid, plan.kind)
      sent += 1
    }

    return res.status(200).json({ ok: true, today, collectionsReminded: sent })
  } catch (err) {
    console.error('finance-reminders', err)
    return res.status(500).json({ error: err.message || 'Failed' })
  }
}
