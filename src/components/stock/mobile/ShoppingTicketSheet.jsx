import { useState } from 'react'
import { Users } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { AdminConfirmSheet, AdminItemRowCard } from '../../admin/mobile'
import { ShoppingLineMobileRow } from './ShoppingLineMobileRow'
import { SHOPPING_TICKET_STATUS } from '../../../config/constants'
import { useSaveMutation } from '../../../hooks/useSaveMutation'

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
  onCheckLine,
  onToggleAssignee,
  onCancelTicket,
}) {
  const checkSave = useSaveMutation()
  const cancelSave = useSaveMutation()
  const [showAssignees, setShowAssignees] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  if (!ticket) return null

  const isOpen = ticket.status === SHOPPING_TICKET_STATUS.OPEN
  const canEdit =
    isOpen && (canManage || ticket.assigneeIds?.includes(userId))

  const pendingLines = ticket.lines.filter((l) => !l.checked)
  const doneLines = ticket.lines.filter((l) => l.checked)
  const checkedCount = doneLines.length
  const totalCount = ticket.lines.length
  const progressPct =
    totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  const groupLabel = groups
    .filter((g) => ticket.groupIds.includes(g.id))
    .map((g) => g.name)
    .join(', ')

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
              </span>
            </div>
          )}

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

          <ul className="admin-mobile-shop-lines">
            {pendingLines.map((line) => (
              <li key={line.itemId} className="admin-mobile-shop-line rail-card">
                <strong className="admin-mobile-shop-line-name">{line.name}</strong>
                <ShoppingLineMobileRow
                  line={line}
                  canEdit={canEdit}
                  open={isOpen}
                  busy={checkSave.busy}
                  onCheck={async (itemId, qty) => {
                    await checkSave.run(() => onCheckLine?.(itemId, qty))
                  }}
                />
              </li>
            ))}
          </ul>

          {doneLines.length > 0 && (
            <details className="admin-mobile-shop-bought">
              <summary>Bought ({doneLines.length})</summary>
              <ul className="admin-mobile-shop-lines is-done">
                {doneLines.map((line) => (
                  <li key={line.itemId} className="admin-mobile-shop-line rail-card">
                    <strong className="admin-mobile-shop-line-name">{line.name}</strong>
                    <ShoppingLineMobileRow
                      line={line}
                      canEdit={false}
                      open={false}
                      busy={false}
                    />
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
