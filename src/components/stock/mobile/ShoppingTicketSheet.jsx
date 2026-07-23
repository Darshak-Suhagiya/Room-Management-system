import { useEffect, useMemo, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { AdminConfirmSheet, AdminItemRowCard, AdminSearchField } from '../../admin/mobile'
import { ShoppingLineMobileRow } from './ShoppingLineMobileRow'
import { SHOPPING_TICKET_STATUS } from '../../../config/constants'
import { useSaveMutation } from '../../../hooks/useSaveMutation'
import { listItemsInGroups } from '../../../services/shoppingService'
import {
  matchShoppingLineSearch,
  matchStockItemSearch,
} from '../../../utils/stockSearch'

function statusPill(status) {
  if (status === SHOPPING_TICKET_STATUS.DONE) {
    return { label: 'Done', tone: 'is-ok' }
  }
  if (status === SHOPPING_TICKET_STATUS.CANCELLED) {
    return { label: 'Cancelled', tone: 'is-muted' }
  }
  return { label: 'Open', tone: 'is-open' }
}

export function ShoppingTicketRowCard({ ticket, groups, onOpen }) {
  const groupNames = ticket.groupIds
    .map((id) => groups.find((g) => g.id === id)?.name || id)
    .join(', ')
  const checkedCount = ticket.lines.filter((l) => l.checked).length
  const pill = statusPill(ticket.status)
  const open = ticket.status === SHOPPING_TICKET_STATUS.OPEN

  return (
    <AdminItemRowCard
      title={groupNames || 'Shopping'}
      subtitle={
        open && ticket.lines.length > 0
          ? `${checkedCount}/${ticket.lines.length} bought`
          : ticket.createdAt
            ? new Date(ticket.createdAt).toLocaleDateString()
            : undefined
      }
      badge={pill.label}
      badgeTone={pill.tone}
      onClick={onOpen}
    />
  )
}

export function ShoppingTicketSheet({
  open: sheetOpen,
  onClose,
  ticket,
  groups,
  users,
  userId,
  canManage,
  catalog,
  onCheckLine,
  onUncheckLine,
  onMarkUnavailable,
  onUnmarkUnavailable,
  onToggleAssignee,
  onAddTicketLine,
  onCancelTicket,
}) {
  const checkSave = useSaveMutation()
  const cancelSave = useSaveMutation()
  const [showAssignees, setShowAssignees] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [lineQuery, setLineQuery] = useState('')
  const [addQuery, setAddQuery] = useState('')
  const [addableItems, setAddableItems] = useState([])
  const [addLoading, setAddLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const catalogById = useMemo(() => {
    const map = new Map()
    for (const item of catalog?.items || []) map.set(item.id, item)
    return map
  }, [catalog])

  useEffect(() => {
    if (!sheetOpen) {
      setExpandedId(null)
      setLineQuery('')
      setShowAdd(false)
      setShowAssignees(false)
    }
  }, [sheetOpen])

  useEffect(() => {
    if (!sheetOpen || !ticket || !showAdd || !canManage) return undefined
    let cancelled = false
    setAddLoading(true)
    listItemsInGroups(ticket.groupIds)
      .then((items) => {
        if (!cancelled) setAddableItems(items)
      })
      .catch(() => {
        if (!cancelled) setAddableItems([])
      })
      .finally(() => {
        if (!cancelled) setAddLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sheetOpen, ticket, showAdd, canManage])

  if (!ticket) return null

  const isOpen = ticket.status === SHOPPING_TICKET_STATUS.OPEN
  const canEdit =
    (isOpen || ticket.status === SHOPPING_TICKET_STATUS.DONE) &&
    (canManage || ticket.assigneeIds?.includes(userId))
  const canShop =
    ticket.status !== SHOPPING_TICKET_STATUS.CANCELLED && canEdit

  const pendingLines = ticket.lines.filter((l) => !l.checked && !l.unavailable)
  const unavailableLines = ticket.lines.filter((l) => l.unavailable && !l.checked)
  const doneLines = ticket.lines.filter((l) => l.checked)

  const filteredPending = pendingLines.filter((l) =>
    matchShoppingLineSearch(l, lineQuery, catalogById),
  )
  const filteredUnavailable = unavailableLines.filter((l) =>
    matchShoppingLineSearch(l, lineQuery, catalogById),
  )
  const filteredDone = doneLines.filter((l) =>
    matchShoppingLineSearch(l, lineQuery, catalogById),
  )

  const checkedCount = doneLines.length
  const totalCount = ticket.lines.length
  const progressPct =
    totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  const groupLabel = groups
    .filter((g) => ticket.groupIds.includes(g.id))
    .map((g) => g.name)
    .join(', ')

  const selectedIds = new Set(ticket.lines.map((l) => l.itemId))
  const filteredAddable = addableItems
    .filter((i) => !selectedIds.has(i.id))
    .filter((i) => matchStockItemSearch(i, addQuery, catalogById))

  const toggleExpand = (itemId) => {
    setExpandedId((cur) => (cur === itemId ? null : itemId))
  }

  const lineProps = {
    canEdit: canShop,
    open: ticket.status !== SHOPPING_TICKET_STATUS.CANCELLED,
    busy: checkSave.busy,
    onCheck: async (itemId, qty) => {
      await checkSave.run(() => onCheckLine?.(itemId, qty))
      setExpandedId(null)
    },
    onUncheck: async (itemId) => {
      await checkSave.run(() => onUncheckLine?.(itemId))
    },
    onMarkUnavailable: async (itemId) => {
      await checkSave.run(() => onMarkUnavailable?.(itemId))
      setExpandedId(null)
    },
    onUnmarkUnavailable: async (itemId) => {
      await checkSave.run(() => onUnmarkUnavailable?.(itemId))
    },
  }

  return (
    <>
      <Modal
        open={sheetOpen}
        onClose={onClose}
        title="Shopping ticket"
        subtitle={groupLabel}
        fullScreenMobile
      >
        <div className="admin-mobile-shop-ticket mobile-section-gap">
          {isOpen && totalCount > 0 && (
            <div className="admin-mobile-shop-progress">
              <div className="shopping-progress-track">
                <div
                  className="shopping-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="muted">
                {checkedCount}/{totalCount} bought
                {unavailableLines.length > 0
                  ? ` · ${unavailableLines.length} unavailable`
                  : ''}
              </span>
            </div>
          )}

          <AdminSearchField
            value={lineQuery}
            onChange={setLineQuery}
            placeholder="Search English / Gujarati…"
          />

          {canManage && isOpen && (
            <div className="admin-mobile-shop-sheet-actions">
              <button
                type="button"
                className="btn btn-secondary btn-block"
                disabled={checkSave.busy || cancelSave.busy}
                onClick={() => setShowAssignees((v) => !v)}
              >
                <Users size={16} aria-hidden />{' '}
                {showAssignees ? 'Hide assignees' : 'Assign shoppers'}
              </button>
              {onAddTicketLine && (
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  disabled={checkSave.busy || cancelSave.busy}
                  onClick={() => setShowAdd((v) => !v)}
                >
                  <Plus size={16} aria-hidden />{' '}
                  {showAdd ? 'Hide add items' : 'Add item'}
                </button>
              )}
              {onCancelTicket && (
                <button
                  type="button"
                  className="btn btn-ghost btn-block admin-mobile-danger-btn"
                  disabled={checkSave.busy || cancelSave.busy}
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancel ticket
                </button>
              )}
            </div>
          )}

          {showAssignees && (
            <div className="push-user-picker">
              {users.map((u) => (
                <label key={u.id} className="checkbox-chip">
                  <input
                    type="checkbox"
                    checked={ticket.assigneeIds.includes(u.id)}
                    onChange={() => onToggleAssignee?.(u.id)}
                  />
                  <span>{u.displayName || u.email}</span>
                </label>
              ))}
            </div>
          )}

          {showAdd && canManage && isOpen && (
            <div className="admin-mobile-shop-add mobile-section-gap">
              <AdminSearchField
                value={addQuery}
                onChange={setAddQuery}
                placeholder="Search English / Gujarati…"
              />
              {addLoading ? (
                <p className="muted">Loading items…</p>
              ) : filteredAddable.length === 0 ? (
                <p className="muted">No matching items to add.</p>
              ) : (
                <ul className="admin-mobile-shop-add-list">
                  {filteredAddable.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-block admin-mobile-shop-add-btn"
                        disabled={checkSave.busy}
                        onClick={async () => {
                          await checkSave.run(() => onAddTicketLine?.(item))
                        }}
                      >
                        <Plus size={14} aria-hidden /> {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <ul className="admin-mobile-shop-lines">
            {filteredPending.map((line) => (
              <li key={line.itemId}>
                <ShoppingLineMobileRow
                  line={line}
                  expanded={expandedId === line.itemId}
                  onToggleExpand={toggleExpand}
                  {...lineProps}
                />
              </li>
            ))}
            {filteredPending.length === 0 &&
              !lineQuery.trim() &&
              pendingLines.length === 0 &&
              totalCount > 0 && (
                <li className="muted admin-mobile-shop-empty">All items resolved.</li>
              )}
            {filteredPending.length === 0 && lineQuery.trim() && (
              <li className="muted admin-mobile-shop-empty">No matching items.</li>
            )}
          </ul>

          {filteredUnavailable.length > 0 && (
            <details className="admin-mobile-shop-unavailable">
              <summary>Unavailable ({filteredUnavailable.length})</summary>
              <ul className="admin-mobile-shop-lines is-done">
                {filteredUnavailable.map((line) => (
                  <li key={line.itemId}>
                    <ShoppingLineMobileRow line={line} {...lineProps} />
                  </li>
                ))}
              </ul>
            </details>
          )}

          {filteredDone.length > 0 && (
            <details className="admin-mobile-shop-bought" open>
              <summary>Bought ({filteredDone.length})</summary>
              <ul className="admin-mobile-shop-lines is-done">
                {filteredDone.map((line) => (
                  <li key={line.itemId}>
                    <ShoppingLineMobileRow line={line} {...lineProps} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </Modal>

      <AdminConfirmSheet
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel ticket?"
        message="This shopping ticket will be marked cancelled."
        confirmLabel="Cancel ticket"
        destructive
        busy={cancelSave.busy}
        onConfirm={async () => {
          const { ok, stale } = await cancelSave.run(() =>
            onCancelTicket?.(ticket),
          )
          if (!ok || stale) return
          setConfirmCancel(false)
          onClose?.()
        }}
      />
    </>
  )
}
