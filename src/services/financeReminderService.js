import { PUSH_AUDIENCE_TYPES, PUSH_SOURCES } from '../config/constants'
import { sendPushNow } from './pushAdminService'
import { formatDateLabel, formatRupeesShort } from '../utils/money'
import { markReminderSent } from './financeCollectionService'
import { listPaymentsForCollection } from './financePaymentService'
import { reminderAmount } from '../utils/financeLedger'

export async function sendCollectionReminder(collection, dues, { key, payments } = {}) {
  const pay = payments ?? (await listPaymentsForCollection(collection.id))
  const unpaid = (dues || []).filter((due) => reminderAmount(due, pay) > 0)
  if (!unpaid.length) {
    throw new Error('Everyone on this collection has already paid.')
  }
  const dueLabel = formatDateLabel(collection.dueDate)
  const title = collection.title || 'Room dues'
  await Promise.all(
    unpaid.map((due) => {
      const amount = reminderAmount(due, pay)
      return sendPushNow({
        title,
        body: dueLabel
          ? `Room dues ${formatRupeesShort(amount)} due on ${dueLabel}`
          : `Room dues ${formatRupeesShort(amount)}`,
        kind: 'custom',
        source: PUSH_SOURCES.FINANCE,
        relatedId: collection.id,
        audience: {
          type: PUSH_AUDIENCE_TYPES.USERS,
          userIds: [due.userId],
        },
        softFailNoTokens: true,
      })
    }),
  )
  if (key) {
    await markReminderSent(collection.id, key)
  }
}
