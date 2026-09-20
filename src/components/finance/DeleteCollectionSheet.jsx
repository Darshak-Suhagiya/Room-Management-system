import { formatRupees } from '../../utils/money'

export function DeleteCollectionSheet({
  open,
  onClose,
  busy = false,
  compact = false,
  preview = null,
  onConfirm,
}) {
  if (!open) return null
  const peopleCount = preview?.peopleCount || 0
  const livePaymentCount = preview?.livePaymentCount || 0
  const memberPaidPaise = preview?.memberPaidPaise || 0
  const fundPaidPaise = preview?.fundPaidPaise || 0
  const expenseNames = preview?.expenseNames || []
  const hasEntries = preview?.hasEntries === true

  return (
    <div className="finance-stack">
      <p>
        This removes the collection and everything on it. Expenses go back to draft so you can
        issue them again.
      </p>
      {hasEntries ? (
        <p className="finance-amt-arrears">
          There are already entries on this collection. It is still open, so leftover has not been
          moved to wallets and remaining shares have not been covered from the room fund. Payments
          recorded here will be deleted.
        </p>
      ) : (
        <p className="muted">Nothing has been paid on this collection yet.</p>
      )}
      <ul className="finance-ledger">
        <li>
          <span>People billed</span>
          <span>{peopleCount}</span>
        </li>
        <li>
          <span>Payments</span>
          <span>
            {livePaymentCount}
            {memberPaidPaise > 0 ? ` · ${formatRupees(memberPaidPaise)}` : ''}
          </span>
        </li>
        {fundPaidPaise > 0 ? (
          <li>
            <span>Paid from room fund</span>
            <span>{formatRupees(fundPaidPaise)}</span>
          </li>
        ) : null}
      </ul>
      {expenseNames.length > 0 ? (
        <p>
          Expenses returning to draft:{' '}
          <strong>{expenseNames.join(', ')}</strong>
        </p>
      ) : null}
      {compact ? (
        <div className="finance-sheet-actions">
          <button
            type="button"
            className="btn btn-danger btn-block"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Deleting…' : 'Delete collection'}
          </button>
          <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="finance-wizard-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={onConfirm}>
            {busy ? 'Deleting…' : 'Delete collection'}
          </button>
        </div>
      )}
    </div>
  )
}
