import { useMemo, useState } from 'react'
import {
  DEFAULT_ROUND_PRESETS,
  EXPENSE_STATUS,
  FINANCE_SPLIT_MODES,
} from '../../config/constants'
import { buildCollectionPreview } from '../../utils/financeSplit'
import {
  addDaysToDateId,
  formatPeriodLabel,
  formatRupees,
  formatRupeesShort,
} from '../../utils/money'
import { formatDateId } from '../../utils/mealDateUtils'
import { defaultIncludedUserIds, displayName } from '../../utils/financePeople'
import { carryInAppliedPaise } from '../../utils/financeLedger'
import { ExpenseSplitEditor } from './ExpenseSplitEditor'
import { FinanceAmountField } from './FinanceAmountField'
import { CookLeaveFacts } from './CookLeaveFacts'

function withDefaults(expense, users) {
  return {
    ...expense,
    includedUserIds:
      expense.includedUserIds?.length > 0
        ? expense.includedUserIds
        : defaultIncludedUserIds(users),
    splitMode: expense.splitMode || FINANCE_SPLIT_MODES.EQUAL,
    shares: expense.shares || {},
    manualPaise: expense.manualPaise || {},
  }
}

export function IssueWizard({
  expenses,
  users,
  settings,
  wallet,
  memberWallets = [],
  onIssue,
  busy,
  footer,
  compact = false,
  periodId,
}) {
  const drafts = useMemo(
    () =>
      (expenses || [])
        .filter((e) => e.status !== EXPENSE_STATUS.ISSUED)
        .map((e) => withDefaults(e, users)),
    [expenses, users],
  )
  const presets = settings?.roundPresets?.length
    ? settings.roundPresets
    : DEFAULT_ROUND_PRESETS
  const [step, setStep] = useState(0)
  const [selectedIds, setSelectedIds] = useState(null)
  const [edits, setEdits] = useState({})
  const [roundId, setRoundId] = useState(presets[0]?.id || 'exact')
  const [overrides, setOverrides] = useState({})
  const [dueDate, setDueDate] = useState(() =>
    addDaysToDateId(formatDateId(new Date()), settings?.defaultDueDays ?? 7),
  )
  const [title, setTitle] = useState('')
  const [sendReminders, setSendReminders] = useState(true)
  const [error, setError] = useState('')

  const localExpenses = drafts.map((expense) => edits[expense.id] || expense)
  const defaultSelected = drafts
    .filter((e) => !periodId || e.periodId === periodId)
    .map((e) => e.id)
  const activeSelectedIds = selectedIds ?? defaultSelected
  const selected = localExpenses.filter((e) => activeSelectedIds.includes(e.id))
  const roundRule = presets.find((p) => p.id === roundId) || presets[0]
  const groupedDrafts = (() => {
    const groups = new Map()
    for (const expense of localExpenses) {
      const key = expense.periodId || 'unknown'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(expense)
    }
    return [...groups.entries()].sort(([a], [b]) => String(b).localeCompare(String(a)))
  })()

  const preview = (() => {
    try {
      return buildCollectionPreview(selected, roundRule, overrides, {
        allUserIds: users.map((u) => u.id),
      })
    } catch (err) {
      return { error: err.message, dues: [], fundImpactPaise: 0, totalDuePaise: 0 }
    }
  })()

  const walletByUser = useMemo(() => {
    const map = new Map()
    for (const item of memberWallets || []) {
      map.set(item.userId || item.id, item.balancePaise || 0)
    }
    return map
  }, [memberWallets])

  const fromFundPaise = preview.fromFundPaise || 0
  const fundAfterIssue = (wallet?.balancePaise || 0) - fromFundPaise

  const next = () => {
    setError('')
    if (step === 0 && selected.length === 0) {
      setError('Pick at least one expense.')
      return
    }
    if (step === 1 && preview.error) {
      setError(preview.error)
      return
    }
    setStep((s) => Math.min(3, s + 1))
  }

  const submit = async () => {
    setError('')
    try {
      await onIssue({
        title,
        expenses: selected,
        roundRule,
        overrides,
        dueDate,
        sendReminders,
        users,
      })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="finance-wizard">
      <p className="muted finance-wizard-step">Step {step + 1} of 4</p>
      {error ? <p className="form-error">{error}</p> : null}

      {step === 0 && (
        <div className="finance-stack">
          <p className="muted">
            Expenses from any month can be added. Drafts that are already issued will not appear.
          </p>
          {localExpenses.length === 0 ? (
            <p className="muted">No draft expenses yet.</p>
          ) : (
            groupedDrafts.map(([groupPeriod, rows]) => (
              <section key={groupPeriod} className="finance-stack">
                <p className="field-stack-label">{formatPeriodLabel(groupPeriod) || groupPeriod}</p>
                {rows.map((e) => (
                  <label key={e.id} className="finance-check-row">
                    <input
                      type="checkbox"
                      checked={activeSelectedIds.includes(e.id)}
                      onChange={() =>
                        setSelectedIds((ids) => {
                          const current = ids ?? defaultSelected
                          return current.includes(e.id)
                            ? current.filter((id) => id !== e.id)
                            : [...current, e.id]
                        })
                      }
                    />
                    <span>
                      <strong>{e.name}</strong>
                      <span className="muted"> {formatRupeesShort(e.amountPaise)}</span>
                      {e.fromFundPaise > 0 ? (
                        <span className="muted">
                          {' '}
                          · {formatRupeesShort(e.fromFundPaise)} from fund
                        </span>
                      ) : null}
                      {e.cookLeave?.enabled ? (
                        <span className="muted"> · leaves counted</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </section>
            ))
          )}
        </div>
      )}

      {step === 1 && (
        <div className="finance-stack">
          {selected.map((expense) => (
            <section key={expense.id} className="rail-card finance-card">
              <h4>
                {expense.name}{' '}
                <span className="muted">{formatRupeesShort(expense.amountPaise)}</span>
                {expense.fromFundPaise > 0 ? (
                  <span className="muted">
                    {' '}
                    · {formatRupeesShort(expense.fromFundPaise)} from fund
                  </span>
                ) : null}
              </h4>
              <p className="muted">
                {formatPeriodLabel(expense.periodId)}
                {expense.date ? ` · ${expense.date}` : ''}
              </p>
              {expense.cookLeave?.enabled ? (
                <CookLeaveFacts cookLeave={expense.cookLeave} compact={compact} />
              ) : null}
              <ExpenseSplitEditor
                expense={expense}
                users={users}
                compact={compact}
                onChange={(nextExpense) =>
                  setEdits((prev) => ({ ...prev, [nextExpense.id]: nextExpense }))
                }
              />
            </section>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="finance-stack">
          <div className="finance-chip-row">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${roundId === p.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setRoundId(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preview.error ? (
            <p className="form-error">{preview.error}</p>
          ) : (
            <>
              <p>
                Exact {formatRupees(preview.totalExactPaise)} → due{' '}
                {formatRupees(preview.totalDuePaise)}.
              </p>
              {preview.fundImpactPaise > 0 ? (
                <p>
                  Extra {formatRupees(preview.fundImpactPaise)} will go to the room fund as
                  each person pays in full (fund now{' '}
                  {formatRupeesShort(wallet?.balancePaise)}).
                </p>
              ) : preview.fundImpactPaise < 0 ? (
                <p>
                  Shortfall {formatRupees(Math.abs(preview.fundImpactPaise))} will be taken
                  from the room fund as each person pays in full (fund now{' '}
                  {formatRupeesShort(wallet?.balancePaise)}).
                </p>
              ) : (
                <p className="muted">No rounding. People pay their exact share.</p>
              )}
              {fromFundPaise > 0 ? (
                <p>
                  Room fund pays {formatRupees(fromFundPaise)} now. Fund after issue{' '}
                  {formatRupeesShort(fundAfterIssue)}. Received will include this.
                </p>
              ) : null}
              {preview.cookLeaveFundPaise > 0 ? (
                <p>
                  {formatRupees(preview.cookLeaveFundPaise)} of cook-leave money will go to the
                  room fund when this collection closes.
                </p>
              ) : null}
              <ul className="finance-due-list finance-due-override-list">
                {preview.dues.map((d) => {
                  const walletBefore = walletByUser.get(d.userId) || 0
                  const applied = carryInAppliedPaise(walletBefore, d.roundedDuePaise)
                  const toPayNow = Math.max(0, (d.roundedDuePaise || 0) - applied)
                  return (
                  <li key={d.userId}>
                    <span>
                      {displayName(users.find((u) => u.id === d.userId))}
                      <span className="muted">
                        {' '}
                        {formatRupeesShort(d.exactSharePaise)} →{' '}
                        <strong>{formatRupeesShort(d.roundedDuePaise)}</strong>
                        {' · '}
                        wallet {formatRupeesShort(walletBefore)} → to pay{' '}
                        <strong>{formatRupeesShort(toPayNow)}</strong>
                      </span>
                    </span>
                    <FinanceAmountField
                      key={`${roundId}-${d.userId}`}
                      label="Override"
                      valuePaise={overrides[d.userId]}
                      emptyValue={null}
                      hint={
                        overrides[d.userId] == null
                          ? 'Optional — leave empty to keep the rounded amount'
                          : undefined
                      }
                      onChangePaise={(value) =>
                        setOverrides((prev) => {
                          const nextOverrides = { ...prev }
                          if (value == null) delete nextOverrides[d.userId]
                          else nextOverrides[d.userId] = value
                          return nextOverrides
                        })
                      }
                    />
                  </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="finance-stack">
          <label className="field-stack">
            <span className="field-stack-label">Title</span>
            <input
              className="app-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="August dues"
            />
          </label>
          <label className="field-stack">
            <span className="field-stack-label">Due date</span>
            <input
              className="app-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <label className="finance-check-row">
            <input
              type="checkbox"
              checked={sendReminders}
              onChange={(e) => setSendReminders(e.target.checked)}
            />
            Send due-date reminders
          </label>
          <p>
            {preview.personCount} people · {formatRupees(preview.totalDuePaise)} total
          </p>
        </div>
      )}

      {footer ? (
        footer({
          step,
          setStep,
          next,
          submit,
          busy,
          canNext: step < 3,
          canSubmit: step === 3 && !preview.error,
        })
      ) : (
        <div className="finance-wizard-actions">
          {step > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : null}
          {step < 3 ? (
            <button type="button" className="btn btn-primary" onClick={next}>
              Next
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
              {busy ? 'Issuing…' : 'Issue collection'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
