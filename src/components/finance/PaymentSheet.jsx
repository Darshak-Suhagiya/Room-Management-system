import { Modal } from '../ui/Modal'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '../../config/constants'
import { FinanceAmountField } from './FinanceAmountField'
import { formatRupees } from '../../utils/money'

export function PaymentSheet({
  open,
  onClose,
  busy = false,
  title = 'Record payment',
  personName,
  remainingPaise = 0,
  amountPaise,
  onChangePaise,
  method,
  onMethodChange,
  note,
  onNoteChange,
  paidOn,
  onPaidOnChange,
  onConfirm,
  compact = false,
  hideMethod = false,
  hint,
  confirmLabel = 'Save payment',
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} busy={busy} artKey="finance">
      {personName ? <p className="muted">{personName}</p> : null}
      {hint ? (
        <p className="muted">{hint}</p>
      ) : remainingPaise > 0 ? (
        <p className="muted">Still to pay {formatRupees(remainingPaise)}. Partial amounts are allowed.</p>
      ) : (
        <p className="muted">This collection is covered. Extra stays here until close, then it moves to the wallet.</p>
      )}
      <FinanceAmountField
        label="Amount"
        valuePaise={amountPaise}
        onChangePaise={onChangePaise}
      />
      <label className="field-stack">
        <span className="field-stack-label">Paid on</span>
        <input
          className="app-input"
          type="date"
          value={paidOn}
          onChange={(e) => onPaidOnChange(e.target.value)}
        />
      </label>
      {hideMethod ? null : (
        <label className="field-stack">
          <span className="field-stack-label">Method</span>
          <select className="app-input" value={method} onChange={(e) => onMethodChange(e.target.value)}>
            {Object.values(PAYMENT_METHODS).map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field-stack">
        <span className="field-stack-label">Note</span>
        <input className="app-input" value={note} onChange={(e) => onNoteChange(e.target.value)} />
      </label>
      {compact ? (
        <div className="finance-sheet-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy || !amountPaise}
            onClick={onConfirm}
          >
            {busy ? 'Saving…' : confirmLabel}
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
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !amountPaise}
            onClick={onConfirm}
          >
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      )}
    </Modal>
  )
}
