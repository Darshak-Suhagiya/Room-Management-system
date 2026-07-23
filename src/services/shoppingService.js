import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import {
  COLLECTIONS,
  SHOPPING_TICKET_STATUS,
  STOCK_MOVEMENT_REASONS,
} from '../config/constants'
import { applyStockDelta, listStockItems, normalizeStockNumber } from './stockService'

function nowIso() {
  return new Date().toISOString()
}

function parseTicket(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    status: d.status || SHOPPING_TICKET_STATUS.OPEN,
    groupIds: Array.isArray(d.groupIds) ? d.groupIds : [],
    assigneeIds: Array.isArray(d.assigneeIds) ? d.assigneeIds : [],
    lines: Array.isArray(d.lines) ? d.lines : [],
    createdAt: d.createdAt ?? null,
    createdBy: d.createdBy ?? null,
    updatedAt: d.updatedAt ?? null,
  }
}

/** Build shopping lines for selected groups where stock is below need. */
export async function buildDeficitLines(groupIds) {
  const items = await listStockItems()
  return buildDeficitLinesFromItems(items, groupIds)
}

export function makeShoppingLineFromItem(item, qtyOverride = null) {
  const unit = item.unit
  const need = normalizeStockNumber(item.needPerIteration, unit)
  const qty = normalizeStockNumber(item.quantity, unit)
  const suggested = normalizeStockNumber(Math.max(0, need - qty), unit)
  const buyQty =
    qtyOverride != null
      ? normalizeStockNumber(qtyOverride, unit)
      : suggested
  return {
    itemId: item.id,
    groupId: item.groupId,
    name: item.name,
    unit,
    needPerIteration: need,
    currentQty: qty,
    suggestedQty: suggested,
    qty: Math.max(0, buyQty),
    menuItemIds: Array.isArray(item.menuItemIds) ? item.menuItemIds : [],
    checked: false,
    checkedAt: null,
    checkedBy: null,
    filledQty: null,
    unavailable: false,
    unavailableAt: null,
    unavailableBy: null,
  }
}

function isLineResolved(line) {
  return Boolean(line.checked || line.unavailable)
}

export function buildDeficitLinesFromItems(items, groupIds) {
  const groupSet = new Set(groupIds)
  const lines = []
  for (const item of items) {
    if (!groupSet.has(item.groupId)) continue
    const need = Number(item.needPerIteration) || 0
    const qty = Number(item.quantity) || 0
    if (need <= qty) continue
    lines.push(makeShoppingLineFromItem(item))
  }
  return lines.sort((a, b) => a.name.localeCompare(b.name))
}

/** All stock items in the selected groups (for preview add-item picker). */
export async function listItemsInGroups(groupIds) {
  const items = await listStockItems()
  const groupSet = new Set(groupIds)
  return items
    .filter((i) => groupSet.has(i.groupId))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function listShoppingTickets() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.SHOPPING_TICKETS))
  return snap.docs
    .map(parseTicket)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export async function getShoppingTicket(ticketId) {
  if (!isFirebaseConfigured || !db) return null
  const snap = await getDoc(doc(db, COLLECTIONS.SHOPPING_TICKETS, ticketId))
  if (!snap.exists()) return null
  return parseTicket(snap)
}

export async function createShoppingTicket({ groupIds, assigneeIds = [] }, userId) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')
  if (!groupIds?.length) throw new Error('Select at least one group')
  const lines = await buildDeficitLines(groupIds)
  return createShoppingTicketWithLines(
    { groupIds, lines, assigneeIds },
    userId,
  )
}

/** Create ticket from preview-edited lines (qty may differ from auto deficit). */
export async function createShoppingTicketWithLines(
  { groupIds, lines, assigneeIds = [] },
  userId,
) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')
  if (!groupIds?.length) throw new Error('Select at least one group')
  const cleaned = (lines || [])
    .map((line) => {
      const unit = line.unit
      return {
        ...line,
        currentQty: normalizeStockNumber(line.currentQty, unit),
        needPerIteration: normalizeStockNumber(line.needPerIteration, unit),
        suggestedQty: normalizeStockNumber(line.suggestedQty, unit),
        qty: Math.max(0, normalizeStockNumber(line.qty, unit)),
      }
    })
    .filter((line) => line.qty > 0)
  if (cleaned.length === 0) {
    throw new Error('Add at least one item with a buy amount greater than zero.')
  }
  const ref = doc(collection(db, COLLECTIONS.SHOPPING_TICKETS))
  const payload = {
    status: SHOPPING_TICKET_STATUS.OPEN,
    groupIds: [...groupIds],
    assigneeIds: [...new Set(assigneeIds)],
    lines: cleaned.map(({ groupId: _g, ...rest }) => rest),
    createdAt: nowIso(),
    createdBy: userId || null,
    updatedAt: nowIso(),
  }
  await setDoc(ref, payload)
  return { id: ref.id, ...payload }
}

export async function updateShoppingTicket(ticketId, patch) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')
  const data = { updatedAt: nowIso() }
  if (patch.assigneeIds != null) data.assigneeIds = [...new Set(patch.assigneeIds)]
  if (patch.status != null) data.status = patch.status
  if (patch.lines != null) data.lines = patch.lines
  await updateDoc(doc(db, COLLECTIONS.SHOPPING_TICKETS, ticketId), data)
}

export async function setTicketLineQty(ticketId, itemId, qty) {
  const ticket = await getShoppingTicket(ticketId)
  if (!ticket) throw new Error('Ticket not found')
  if (ticket.status !== SHOPPING_TICKET_STATUS.OPEN) {
    throw new Error('Ticket is closed')
  }
  const lines = ticket.lines.map((line) => {
    if (line.itemId !== itemId || line.checked) return line
    const n = Math.max(0, Number(qty) || 0)
    return { ...line, qty: n }
  })
  await updateShoppingTicket(ticketId, { lines })
  return getShoppingTicket(ticketId)
}

/**
 * Check a line and fill stock by that line's qty (idempotent if already checked).
 */
export async function checkTicketLine(ticketId, itemId, userId, qtyOverride = null) {
  const ticket = await getShoppingTicket(ticketId)
  if (!ticket) throw new Error('Ticket not found')
  if (ticket.status !== SHOPPING_TICKET_STATUS.OPEN) {
    throw new Error('Ticket is closed')
  }
  const line = ticket.lines.find((l) => l.itemId === itemId)
  if (!line) throw new Error('Line not found')
  if (line.checked) return ticket

  const fillQty = Math.max(
    0,
    qtyOverride != null ? Number(qtyOverride) || 0 : Number(line.qty) || 0,
  )

  // Persist qty if shopper adjusted it locally
  let lines = ticket.lines.map((l) =>
    l.itemId === itemId ? { ...l, qty: fillQty } : l,
  )

  if (fillQty > 0) {
    await applyStockDelta(itemId, fillQty, {
      reason: STOCK_MOVEMENT_REASONS.SHOPPING,
      userId,
      refType: 'shoppingTicket',
      refId: ticketId,
      note: `Shopping fill: ${line.name || itemId}`,
    })
  }

  lines = lines.map((l) =>
    l.itemId === itemId
      ? {
          ...l,
          qty: fillQty,
          filledQty: fillQty,
          checked: true,
          checkedAt: nowIso(),
          checkedBy: userId || null,
          unavailable: false,
          unavailableAt: null,
          unavailableBy: null,
        }
      : l,
  )
  const allDone = lines.every(isLineResolved)
  await updateShoppingTicket(ticketId, {
    lines,
    status: allDone ? SHOPPING_TICKET_STATUS.DONE : SHOPPING_TICKET_STATUS.OPEN,
  })
  return getShoppingTicket(ticketId)
}

/**
 * Uncheck a bought line and reverse the stock fill that was applied.
 */
export async function uncheckTicketLine(ticketId, itemId, userId) {
  const ticket = await getShoppingTicket(ticketId)
  if (!ticket) throw new Error('Ticket not found')
  if (
    ticket.status !== SHOPPING_TICKET_STATUS.OPEN &&
    ticket.status !== SHOPPING_TICKET_STATUS.DONE
  ) {
    throw new Error('Ticket is closed')
  }
  const line = ticket.lines.find((l) => l.itemId === itemId)
  if (!line) throw new Error('Line not found')
  if (!line.checked) return ticket

  const reverseQty = Math.max(
    0,
    Number(line.filledQty != null ? line.filledQty : line.qty) || 0,
  )

  if (reverseQty > 0) {
    await applyStockDelta(itemId, -reverseQty, {
      reason: STOCK_MOVEMENT_REASONS.SHOPPING,
      userId,
      refType: 'shoppingTicket',
      refId: ticketId,
      note: `Shopping uncheck: ${line.name || itemId}`,
    })
  }

  const lines = ticket.lines.map((l) =>
    l.itemId === itemId
      ? {
          ...l,
          checked: false,
          checkedAt: null,
          checkedBy: null,
          filledQty: null,
        }
      : l,
  )

  await updateShoppingTicket(ticketId, {
    lines,
    status: SHOPPING_TICKET_STATUS.OPEN,
  })
  return getShoppingTicket(ticketId)
}

/**
 * Mark a pending line as not available in the market (no stock fill).
 */
export async function markLineUnavailable(ticketId, itemId, userId) {
  const ticket = await getShoppingTicket(ticketId)
  if (!ticket) throw new Error('Ticket not found')
  if (ticket.status !== SHOPPING_TICKET_STATUS.OPEN) {
    throw new Error('Ticket is closed')
  }
  const line = ticket.lines.find((l) => l.itemId === itemId)
  if (!line) throw new Error('Line not found')
  if (line.checked) throw new Error('Uncheck the line before marking unavailable')
  if (line.unavailable) return ticket

  const lines = ticket.lines.map((l) =>
    l.itemId === itemId
      ? {
          ...l,
          unavailable: true,
          unavailableAt: nowIso(),
          unavailableBy: userId || null,
        }
      : l,
  )
  const allDone = lines.every(isLineResolved)
  await updateShoppingTicket(ticketId, {
    lines,
    status: allDone ? SHOPPING_TICKET_STATUS.DONE : SHOPPING_TICKET_STATUS.OPEN,
  })
  return getShoppingTicket(ticketId)
}

/**
 * Undo "not available" and return the line to pending.
 */
export async function unmarkLineUnavailable(ticketId, itemId) {
  const ticket = await getShoppingTicket(ticketId)
  if (!ticket) throw new Error('Ticket not found')
  if (
    ticket.status !== SHOPPING_TICKET_STATUS.OPEN &&
    ticket.status !== SHOPPING_TICKET_STATUS.DONE
  ) {
    throw new Error('Ticket is closed')
  }
  const line = ticket.lines.find((l) => l.itemId === itemId)
  if (!line) throw new Error('Line not found')
  if (!line.unavailable) return ticket

  const lines = ticket.lines.map((l) =>
    l.itemId === itemId
      ? {
          ...l,
          unavailable: false,
          unavailableAt: null,
          unavailableBy: null,
        }
      : l,
  )

  await updateShoppingTicket(ticketId, {
    lines,
    status: SHOPPING_TICKET_STATUS.OPEN,
  })
  return getShoppingTicket(ticketId)
}

export async function completeShoppingTicket(ticketId) {
  await updateShoppingTicket(ticketId, { status: SHOPPING_TICKET_STATUS.DONE })
  return getShoppingTicket(ticketId)
}

export async function cancelShoppingTicket(ticketId) {
  await updateShoppingTicket(ticketId, {
    status: SHOPPING_TICKET_STATUS.CANCELLED,
  })
  return getShoppingTicket(ticketId)
}

export async function deleteShoppingTicket(ticketId) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase is not configured')
  await deleteDoc(doc(db, COLLECTIONS.SHOPPING_TICKETS, ticketId))
}
