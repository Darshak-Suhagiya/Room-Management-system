import { useState } from 'react'
import {
  WALLET_MOVEMENT_REASONS,
  WALLET_MOVEMENT_REASON_LABELS,
} from '../../../config/constants'
import { currentDateId, formatSignedRupees, movementDateLabel } from '../../../utils/money'
import { FinanceAmountField } from '../FinanceAmountField'
import { FinanceStatCard } from '../FinanceStatCard'
import { FundFixCard } from '../FundFixCard'
import { FinanceResetCard } from '../FinanceResetCard'
import { applyWalletMovement } from '../../../services/roomWalletService'
import { saveFinanceSettings } from '../../../services/financeSettingsService'
import { useSaveMutation } from '../../../hooks/useSaveMutation'
import { useToast } from '../../../contexts/ToastContext'

export function FundTab({
  wallet,
  movements,
  settings,
  userId,
  actorName,
  canManage = true,
  pendingFundFixes = 0,
  onDone,
}) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [fixing, setFixing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const locked = busy || fixing || resetting
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState(WALLET_MOVEMENT_REASONS.CONTRIBUTION)
  const [note, setNote] = useState('')
  const [occurredOn, setOccurredOn] = useState(currentDateId())
  const [standard, setStandard] = useState(settings?.standardDepositPaise || 0)

  const saveMove = async (sign) => {
    const { ok, error, stale } = await run(() =>
      applyWalletMovement({
        amountPaise: sign * Math.abs(amount),
        reason,
        note,
        occurredOn,
        actorId: userId,
        actorName,
      }),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Fund updated')
    setAmount(0)
    onDone()
  }

  const saveSettings = async () => {
    const { ok, error, stale } = await run(() =>
      saveFinanceSettings({ standardDepositPaise: standard }, userId),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Settings saved')
    onDone()
  }

  return (
    <div className="finance-fund finance-stack">
      <FinanceStatCard
        label="Room fund"
        amountPaise={wallet.balancePaise}
        hint="Shared house fund, including rounding extras and shortfalls."
      />
      {canManage ? (
        <>
          <FundFixCard
            pendingCount={pendingFundFixes}
            userId={userId}
            actorName={actorName}
            locked={busy || resetting}
            onBusyChange={setFixing}
            onDone={onDone}
          />
          <FinanceResetCard
            userId={userId}
            locked={busy || fixing}
            onBusyChange={setResetting}
            onDone={onDone}
          />
          <section className="rail-card finance-card finance-stack">
            <h3>Move money</h3>
            <FinanceAmountField label="Amount" valuePaise={amount} onChangePaise={setAmount} />
            <label className="field-stack">
              <span className="field-stack-label">Date</span>
              <input
                className="app-input"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
            </label>
            <label className="field-stack">
              <span className="field-stack-label">Reason</span>
              <select className="app-input" value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value={WALLET_MOVEMENT_REASONS.CONTRIBUTION}>Contribution</option>
                <option value={WALLET_MOVEMENT_REASONS.EXPENSE}>Expense</option>
                <option value={WALLET_MOVEMENT_REASONS.REFUND}>Refund</option>
                <option value={WALLET_MOVEMENT_REASONS.ADJUST}>Adjust</option>
              </select>
            </label>
            <label className="field-stack">
              <span className="field-stack-label">Note</span>
              <input className="app-input" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="finance-wizard-actions">
              <button type="button" className="btn btn-primary" disabled={locked} onClick={() => saveMove(1)}>
                {busy ? <span className="btn-spinner" aria-hidden /> : null}
                Add to fund
              </button>
              <button type="button" className="btn btn-secondary" disabled={locked} onClick={() => saveMove(-1)}>
                Spend from fund
              </button>
            </div>
          </section>
          <section className="rail-card finance-card finance-stack">
            <h3>Standard deposit</h3>
            <FinanceAmountField
              label="Expected per person"
              valuePaise={standard}
              onChangePaise={setStandard}
            />
            <button type="button" className="btn btn-ghost" disabled={locked} onClick={saveSettings}>
              Save standard deposit
            </button>
          </section>
        </>
      ) : null}
      <section className="rail-card finance-card">
        <h3>Ledger</h3>
        {movements.length === 0 ? (
          <p className="muted">No fund movements yet.</p>
        ) : (
          <ul className="finance-ledger">
            {movements.map((m) => (
              <li key={m.id}>
                <span>
                  {WALLET_MOVEMENT_REASON_LABELS[m.reason] || m.reason}
                  {' · '}
                  {movementDateLabel(m)}
                  {m.note ? ` · ${m.note}` : ''}
                  {m.createdByName ? ` · ${m.createdByName}` : ''}
                </span>
                <span>{formatSignedRupees(m.amountPaise)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
