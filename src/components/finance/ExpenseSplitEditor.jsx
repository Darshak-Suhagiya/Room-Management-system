import {
  FINANCE_SPLIT_MODE_LABELS,
  FINANCE_SPLIT_MODES,
} from '../../config/constants'
import { formatRupees, formatRupeesShort, sumPaise } from '../../utils/money'
import { expenseBillablePaise } from '../../utils/financeSplit'
import { displayName } from '../../utils/financePeople'
import { FinanceAmountField } from './FinanceAmountField'

export function ExpenseSplitEditor({ expense, users, onChange, compact = false }) {
  const included = expense.includedUserIds || []
  const mode = expense.splitMode || FINANCE_SPLIT_MODES.EQUAL
  const billablePaise = expenseBillablePaise(expense)
  const manualSum = sumPaise(included.map((id) => expense.manualPaise?.[id] || 0))
  const manualOff = billablePaise - manualSum

  const patch = (partial) => onChange({ ...expense, ...partial })

  const togglePerson = (userId) => {
    const has = included.includes(userId)
    patch({
      includedUserIds: has
        ? included.filter((id) => id !== userId)
        : [...included, userId],
    })
  }

  return (
    <div className="finance-stack">
      <div
        className={compact ? 'mobile-segmented' : 'segmented-control'}
        role="group"
        aria-label="Split mode"
      >
        {Object.values(FINANCE_SPLIT_MODES).map((nextMode) => (
          <button
            key={nextMode}
            type="button"
            className={`${compact ? 'mobile-segmented-btn' : 'segmented-btn'}${
              mode === nextMode ? ' is-active' : ''
            }`}
            onClick={() => patch({ splitMode: nextMode })}
          >
            {FINANCE_SPLIT_MODE_LABELS[nextMode]}
          </button>
        ))}
      </div>

      <p className="field-stack-label">Who is in</p>
      <div className="finance-people-grid">
        {users.map((u) => (
          <label key={u.id} className="finance-check-row">
            <input
              type="checkbox"
              checked={included.includes(u.id)}
              onChange={() => togglePerson(u.id)}
            />
            {displayName(u)}
            {u.status === 'deactivated' ? (
              <span className="muted"> (left)</span>
            ) : null}
          </label>
        ))}
      </div>

      {mode === FINANCE_SPLIT_MODES.SHARES ? (
        <div className="finance-stack">
          <p className="muted">Share weights (larger number = larger share).</p>
          {included.map((id) => {
            const user = users.find((u) => u.id === id)
            return (
              <label key={id} className="field-stack">
                <span className="field-stack-label">{displayName(user)}</span>
                <input
                  className="app-input"
                  type="number"
                  min="1"
                  step="1"
                  value={expense.shares?.[id] ?? 1}
                  onChange={(e) =>
                    patch({
                      shares: {
                        ...(expense.shares || {}),
                        [id]: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </label>
            )
          })}
        </div>
      ) : null}

      {mode === FINANCE_SPLIT_MODES.MANUAL ? (
        <div className="finance-stack">
          <p className={manualOff === 0 ? 'muted' : 'form-error'}>
            Assigned {formatRupees(manualSum)} of {formatRupees(billablePaise)}
            {manualOff === 0 ? '' : ` · off by ${formatRupeesShort(Math.abs(manualOff))}`}
          </p>
          {included.map((id) => {
            const user = users.find((u) => u.id === id)
            return (
              <FinanceAmountField
                key={id}
                label={displayName(user)}
                valuePaise={expense.manualPaise?.[id] || 0}
                onChangePaise={(value) =>
                  patch({
                    manualPaise: {
                      ...(expense.manualPaise || {}),
                      [id]: value || 0,
                    },
                  })
                }
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
