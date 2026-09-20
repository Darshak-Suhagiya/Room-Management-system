import { PAYMENT_METHOD_LABELS, WALLET_REPAYMENT_STATUS } from '../../config/constants'
import { formatDateLabel, formatRupees } from '../../utils/money'
import {
  approveWalletRepayment,
  rejectWalletRepayment,
} from '../../services/financeWalletRepaymentService'
import { useSaveMutation } from '../../hooks/useSaveMutation'
import { useToast } from '../../contexts/ToastContext'
import { FinanceFacts } from './FinanceFacts'

export function WalletRepaymentRequestsCard({
  requests = [],
  userId,
  actorName,
  locked = false,
  block = false,
  compact = false,
  onDone,
}) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const pending = (requests || []).filter(
    (item) => item.status === WALLET_REPAYMENT_STATUS.PENDING,
  )
  const disabled = locked || busy

  const decide = async (item, action) => {
    const { ok, error, stale } = await run(() =>
      action === 'approve'
        ? approveWalletRepayment(item.id, { actorId: userId, actorName })
        : rejectWalletRepayment(item.id, { actorId: userId, actorName }),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success(action === 'approve' ? 'Repayment recorded' : 'Request rejected')
    onDone?.()
  }

  return (
    <section className={`rail-card finance-card finance-stack${compact ? ' is-compact' : ''}`}>
      <h3>Wallet repayment requests</h3>
      {pending.length === 0 ? (
        <p className="muted">No pending repayments.</p>
      ) : (
        <ul className="finance-due-cards">
          {pending.map((item) => (
            <li key={item.id} className="finance-due-card">
              <div className="finance-due-card-head">
                <strong>{item.userName || 'Member'}</strong>
                <span>{formatRupees(item.amountPaise)}</span>
              </div>
              <FinanceFacts
                rows={[
                  {
                    key: 'method',
                    label: 'Method',
                    value: PAYMENT_METHOD_LABELS[item.method] || item.method || 'Other',
                  },
                  item.paidOn
                    ? { key: 'paidOn', label: 'Paid on', value: formatDateLabel(item.paidOn) }
                    : null,
                ].filter(Boolean)}
              />
              {item.note ? <p className="muted">{item.note}</p> : null}
              <div className={block ? 'finance-sheet-actions' : 'finance-wizard-actions'}>
                <button
                  type="button"
                  className={`btn btn-primary ${block ? 'btn-block' : 'btn-sm'}`}
                  disabled={disabled}
                  onClick={() => decide(item, 'approve')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost ${block ? 'btn-block' : 'btn-sm'}`}
                  disabled={disabled}
                  onClick={() => decide(item, 'reject')}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
