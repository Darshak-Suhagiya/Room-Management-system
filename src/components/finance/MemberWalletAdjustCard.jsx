import { useState } from 'react'
import { MEMBER_WALLET_REASONS } from '../../config/constants'
import { applyMemberWalletMovement } from '../../services/memberWalletService'
import { useSaveMutation } from '../../hooks/useSaveMutation'
import { useToast } from '../../contexts/ToastContext'
import { FinanceAmountField } from './FinanceAmountField'
import { displayName } from '../../utils/financePeople'

export function MemberWalletAdjustCard({
  users = [],
  userId,
  actorName,
  locked = false,
  block = false,
  compact = false,
  onDone,
}) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [targetId, setTargetId] = useState('')
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')
  const disabled = locked || busy

  const save = async (sign) => {
    const trimmed = note.trim()
    if (!targetId) {
      toast.error('Pick a person.')
      return
    }
    if (!trimmed) {
      toast.error('A note is required for wallet adjustments.')
      return
    }
    if (!amount) {
      toast.error('Enter an amount.')
      return
    }
    const { ok, error, stale } = await run(() =>
      applyMemberWalletMovement({
        userId: targetId,
        amountPaise: sign * Math.abs(amount),
        reason: MEMBER_WALLET_REASONS.ADJUST,
        note: trimmed,
        actorId: userId,
        actorName,
      }),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Member wallet updated')
    setAmount(0)
    setNote('')
    onDone?.()
  }

  return (
    <section className="rail-card finance-card finance-stack">
      <h3>Adjust member wallet</h3>
      <p className="muted">
        {compact
          ? 'Corrections after close. Closed collections stay frozen.'
          : 'Use this for corrections after a collection is closed. Closed collections stay frozen.'}
      </p>
      <label className="field-stack">
        <span className="field-stack-label">Person</span>
        <select
          className="app-input"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">Select</option>
          {users.map((person) => (
            <option key={person.id} value={person.id}>
              {displayName(person)}
            </option>
          ))}
        </select>
      </label>
      <FinanceAmountField label="Amount" valuePaise={amount} onChangePaise={setAmount} />
      <label className="field-stack">
        <span className="field-stack-label">Note</span>
        <input
          className="app-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Required"
        />
      </label>
      <div className={block ? 'finance-sheet-actions' : 'finance-wizard-actions'}>
        <button
          type="button"
          className={`btn btn-primary${block ? ' btn-block' : ''}`}
          disabled={disabled}
          onClick={() => save(1)}
        >
          Add credit
        </button>
        <button
          type="button"
          className={`btn btn-secondary${block ? ' btn-block' : ''}`}
          disabled={disabled}
          onClick={() => save(-1)}
        >
          Add remaining
        </button>
      </div>
    </section>
  )
}
