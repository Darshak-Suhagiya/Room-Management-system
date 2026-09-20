import { Modal } from '../ui/Modal'
import { DEPOSIT_MOVEMENT_TYPES } from '../../config/constants'
import { FinanceAmountField } from './FinanceAmountField'
import { DEPOSIT_ACTION_LABELS } from './depositActions'

export function DepositAmountSheet({
  open,
  onClose,
  title,
  type,
  onTypeChange,
  amountPaise,
  onChangePaise,
  amountKey,
  allowNegative = false,
  busy = false,
  onSave,
  compact = false,
  children,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} busy={busy} artKey="finance">
      {onTypeChange ? (
        <div className="finance-chip-row finance-deposit-type-seg" role="group" aria-label="Deposit action">
          {Object.values(DEPOSIT_MOVEMENT_TYPES).map((nextType) => (
            <button
              key={nextType}
              type="button"
              className={`btn btn-sm ${type === nextType ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onTypeChange(nextType)}
            >
              {DEPOSIT_ACTION_LABELS[nextType]}
            </button>
          ))}
        </div>
      ) : null}
      {children}
      <FinanceAmountField
        label="Amount"
        valuePaise={amountPaise}
        key={amountKey}
        onChangePaise={onChangePaise}
        allowNegative={allowNegative}
      />
      {compact ? (
        <div className="finance-sheet-actions">
          <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={onSave}>
            {busy ? 'Saving…' : 'Save'}
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
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onSave}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </Modal>
  )
}

