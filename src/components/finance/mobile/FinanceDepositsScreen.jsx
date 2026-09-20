import { useState } from 'react'
import { AdminEmptyPanel, AdminItemRowCard } from '../../admin/mobile'
import { DEPOSIT_MOVEMENT_TYPES } from '../../../config/constants'
import { displayName } from '../../../utils/financePeople'
import { formatRupees } from '../../../utils/money'
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
import { triggerSelectionHaptic } from '../../../utils/haptics'

export function FinanceDepositsScreen({
  users,
  settings,
  unpaidDues,
  userId,
  onDone,
}) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [action, setAction] = useState(null)
  const [amount, setAmount] = useState(0)

  const open = (person, type = DEPOSIT_MOVEMENT_TYPES.COLLECT) => {
    triggerSelectionHaptic()
    setAmount(suggestedDepositAmount(type, person, settings))
    setAction({ type, person })
  }

  const changeType = (type) => {
    if (!action?.person) return
    setAmount(suggestedDepositAmount(type, action.person, settings))
    setAction({ ...action, type })
  }

  const save = async () => {
    const fn =
      action.type === DEPOSIT_MOVEMENT_TYPES.REPAY
        ? repayDeposit
        : action.type === DEPOSIT_MOVEMENT_TYPES.TOPUP
          ? topUpDeposit
          : action.type === DEPOSIT_MOVEMENT_TYPES.ADJUST
            ? adjustDeposit
            : collectDeposit
    const { ok, error, stale } = await run(() =>
      fn(action.person.id, amount, {
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

  const expected = settings?.standardDepositPaise || 0

  return (
    <div className="finance-mobile finance-mobile-list">
      {users.length === 0 ? (
        <AdminEmptyPanel title="No people" hint="Approved room members will appear here." />
      ) : (
        users.map((u) => {
          const balance = u.deposit.balancePaise || 0
          const short = expected > 0 && balance < expected
          return (
            <AdminItemRowCard
              key={u.id}
              title={displayName(u)}
              subtitle={`${formatRupees(balance)} held`}
              badge={short ? 'Low' : null}
              badgeTone={short ? 'is-warn' : ''}
              onClick={() => open(u)}
            />
          )
        })
      )}

      <DepositAmountSheet
        open={Boolean(action)}
        onClose={() => setAction(null)}
        title={action ? depositActionTitle(action.type, displayName(action.person)) : ''}
        type={action?.type}
        onTypeChange={changeType}
        amountPaise={amount}
        onChangePaise={setAmount}
        amountKey={action ? `${action.type}-${action.person.id}` : 'idle'}
        allowNegative={action?.type === DEPOSIT_MOVEMENT_TYPES.ADJUST}
        busy={busy}
        compact
        onSave={save}
      >
        {action?.type === DEPOSIT_MOVEMENT_TYPES.REPAY ? (
          <RepayWarning person={action.person} unpaidDues={unpaidDues} />
        ) : null}
      </DepositAmountSheet>
    </div>
  )
}
