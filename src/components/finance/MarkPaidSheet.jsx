import { Modal } from '../ui/Modal'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '../../config/constants'

export function MarkPaidSheet({
  open,
  onClose,
  busy = false,
  method,
  onMethodChange,
  note,
  onNoteChange,
  onConfirm,
  compact = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title="Mark paid" busy={busy} artKey="finance">
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
      <label className="field-stack">
        <span className="field-stack-label">Note</span>
        <input className="app-input" value={note} onChange={(e) => onNoteChange(e.target.value)} />
      </label>
      {compact ? (
        <div className="finance-sheet-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Saving…' : 'Confirm'}
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
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onConfirm}>
            {busy ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      )}
    </Modal>
  )
}
