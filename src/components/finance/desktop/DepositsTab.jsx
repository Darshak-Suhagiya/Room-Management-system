import { useState } from 'react'
import { DEPOSIT_MOVEMENT_TYPES } from '../../../config/constants'
import { formatRupees } from '../../../utils/money'
import { displayName } from '../../../utils/financePeople'
import { DepositAmountSheet } from '../DepositAmountSheet'
import { depositActionTitle, suggestedDepositAmount } from '../depositActions'
import { RepayWarning } from '../RepayWarning'
import {
  collectDeposit,
  repayDeposit,
  topUpDeposit,
  adjustDeposit,
} from '../../../services/depositService'
import { useSaveMutation } from '../../../hooks/useSaveMutation'
import { useToast } from '../../../contexts/ToastContext'

export function DepositsTab({ users, settings, userId, unpaidDues, onDone }) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [action, setAction] = useState(null)
  const [amount, setAmount] = useState(0)

  const open = (type, person) => {
    setAmount(suggestedDepositAmount(type, person, settings))
    setAction({ type, person })
  }

  const save = async () => {
    const person = action.person
    const fn =
      action.type === DEPOSIT_MOVEMENT_TYPES.REPAY
        ? repayDeposit
        : action.type === DEPOSIT_MOVEMENT_TYPES.TOPUP
          ? topUpDeposit
          : action.type === DEPOSIT_MOVEMENT_TYPES.ADJUST
            ? adjustDeposit
            : collectDeposit
    const { ok, error, stale } = await run(() =>
      fn(person.id, amount, {
        actorId: userId,
        expectedPaise: settings?.standardDepositPaise,
      }),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Deposit updated')
    setAction(null)
    onDone()
  }

  return (
    <div className="finance-stack">
      <div className="finance-table-wrap">
        <table className="finance-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Balance</th>
              <th>Expected</th>
              <th className="finance-table-actions" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{displayName(u)}</td>
                <td>{formatRupees(u.deposit.balancePaise)}</td>
                <td>{formatRupees(u.deposit.expectedPaise || settings?.standardDepositPaise || 0)}</td>
                <td className="finance-table-actions">
                  <span className="finance-table-actions-inner">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => open(DEPOSIT_MOVEMENT_TYPES.COLLECT, u)}
                    >
                      Collect
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => open(DEPOSIT_MOVEMENT_TYPES.REPAY, u)}
                    >
                      Repay
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => open(DEPOSIT_MOVEMENT_TYPES.TOPUP, u)}
                    >
                      Top up
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => open(DEPOSIT_MOVEMENT_TYPES.ADJUST, u)}
                    >
                      Adjust
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DepositAmountSheet
        open={Boolean(action)}
        onClose={() => setAction(null)}
        title={action ? depositActionTitle(action.type, displayName(action.person)) : ''}
        type={action?.type}
        amountPaise={amount}
        onChangePaise={setAmount}
        amountKey={action ? `${action.type}-${action.person.id}` : 'idle'}
        allowNegative={action?.type === DEPOSIT_MOVEMENT_TYPES.ADJUST}
        busy={busy}
        onSave={save}
      >
        {action?.type === DEPOSIT_MOVEMENT_TYPES.REPAY ? (
          <RepayWarning person={action.person} unpaidDues={unpaidDues} />
        ) : null}
      </DepositAmountSheet>
    </div>
  )
}
