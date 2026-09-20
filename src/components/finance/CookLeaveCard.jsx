import { useEffect, useRef, useState } from 'react'
import { listMaharajUsers } from '../../services/userService'
import { listLeavesForPersonMonth, summarizeLeaves } from '../../services/leaveService'
import { displayName } from '../../utils/financePeople'
import {
  applyCookLeavePatch,
  daysInMonthFor,
  enableCookLeave,
} from '../../utils/cookLeave'
import {
  expenseBillablePaise,
  expenseFromFundPaise,
  expenseGrossPaise,
  withClampedFromFund,
} from '../../utils/financeSplit'
import { formatDateTime, formatPeriodLabel, formatRupees } from '../../utils/money'
import { FinanceAmountField } from './FinanceAmountField'
import { CookLeaveFacts } from './CookLeaveFacts'

const DESTINATIONS = [
  { id: 'less', label: 'Members pay less', shortLabel: 'Pay less' },
  { id: 'fund', label: 'Goes to room fund', shortLabel: 'To fund' },
  { id: 'split', label: 'Split', shortLabel: 'Split' },
]

export function ExpenseAmountFields({ expense, onChange, compact = false }) {
  const enabled = Boolean(expense.cookLeave?.enabled)
  const update = (recipe) => {
    onChange((prev) => recipe(prev && typeof prev === 'object' ? prev : expense))
  }
  const grossPaise = expenseGrossPaise(expense)
  const fromFundPaise = expenseFromFundPaise(expense)
  const billablePaise = expenseBillablePaise(expense)
  return (
    <>
      <FinanceAmountField
        label={enabled ? 'Cook salary (full month)' : 'Amount'}
        valuePaise={enabled ? expense.cookLeave.salaryPaise : expense.amountPaise}
        onChangePaise={(value) => {
          if (enabled) update((current) => applyCookLeavePatch(current, { salaryPaise: value }))
          else update((current) => withClampedFromFund({ ...current, amountPaise: value }))
        }}
      />
      <CookLeaveCard expense={expense} onChange={onChange} compact={compact} />
      <FinanceAmountField
        label="From room fund"
        valuePaise={fromFundPaise}
        onChangePaise={(value) =>
          update((current) => withClampedFromFund({ ...current, fromFundPaise: value || 0 }))
        }
        hint={
          grossPaise > 0
            ? `Up to ${formatRupees(grossPaise)}. The rest is split among people.`
            : 'Enter the expense amount first.'
        }
      />
      <p className="finance-cook-leave-billed">
        People pay {formatRupees(billablePaise)}
        {fromFundPaise > 0 ? ` · room fund ${formatRupees(fromFundPaise)}` : ''}
      </p>
    </>
  )
}

export function CookLeaveCard({ expense, onChange, compact = false }) {
  const [cooks, setCooks] = useState([])
  const [loadingCooks, setLoadingCooks] = useState(true)
  const [loadingLeaves, setLoadingLeaves] = useState(false)
  const [error, setError] = useState('')
  const autoEnabled = useRef(false)
  const autoLoadKey = useRef('')
  const cookLeave = expense.cookLeave
  const enabled = Boolean(cookLeave?.enabled)

  const update = (recipe) => {
    onChange((prev) => recipe(prev && typeof prev === 'object' ? prev : expense))
  }

  useEffect(() => {
    let cancelled = false
    listMaharajUsers()
      .then((rows) => {
        if (!cancelled) setCooks(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load cooks.')
      })
      .finally(() => {
        if (!cancelled) setLoadingCooks(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (autoEnabled.current) return
    if (expense.templateId !== 'cook' || expense.cookLeave != null) return
    autoEnabled.current = true
    update((current) => enableCookLeave(current))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enable once when opening a cook template
  }, [expense.templateId, expense.cookLeave])

  const patch = (partial) => update((current) => applyCookLeavePatch(current, partial))

  const loadLeaves = async (cook, monthId) => {
    if (!cook?.id || !monthId) return
    setLoadingLeaves(true)
    setError('')
    try {
      const leaves = await listLeavesForPersonMonth(cook.id, monthId)
      const summary = summarizeLeaves(leaves)
      update((current) =>
        applyCookLeavePatch(current, {
          cookUserId: cook.id,
          cookName: displayName(cook),
          monthId,
          daysInMonth: current.cookLeave?.daysInMonth || daysInMonthFor(monthId),
          leaveDays: summary.leaveDays,
          leaveEntries: leaves.map((leave) => ({
            date: leave.date,
            period: leave.period,
            reason: leave.reason || '',
          })),
          leavesLoadedAt: new Date().toISOString(),
        }),
      )
    } catch (err) {
      setError(err.message || 'Could not load leaves.')
    } finally {
      setLoadingLeaves(false)
    }
  }

  useEffect(() => {
    if (!enabled || loadingCooks || cooks.length === 0) return
    if (cookLeave.leavesLoadedAt) return
    const selected =
      cooks.find((cook) => cook.id === cookLeave.cookUserId) || (cooks.length === 1 ? cooks[0] : null)
    if (!selected) return
    const monthId = cookLeave.monthId || expense.periodId
    if (!monthId) return
    const key = `${selected.id}|${monthId}`
    if (autoLoadKey.current === key) return
    autoLoadKey.current = key
    loadLeaves(selected, monthId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per cook+month until user reloads
  }, [enabled, loadingCooks, cooks, cookLeave?.cookUserId, cookLeave?.leavesLoadedAt, cookLeave?.monthId])

  const selectedCook =
    cooks.find((cook) => cook.id === cookLeave?.cookUserId) ||
    (cooks.length === 1 ? cooks[0] : null)
  const monthId = cookLeave?.monthId || expense.periodId || ''
  const destination = cookLeave?.destination || 'less'

  return (
    <section className="finance-cook-leave finance-stack">
      <div className="finance-cook-leave-head">
        <h4>Maharaj leave</h4>
        <label className="finance-check-row">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              if (e.target.checked) update((current) => enableCookLeave(current))
              else update((current) => applyCookLeavePatch(current, { enabled: false }))
            }}
          />
          Count leaves
        </label>
      </div>

      {enabled ? (
        <>
          <div className="finance-cook-leave-row">
            {cooks.length > 1 ? (
              <label className="field-stack">
                <span className="field-stack-label">Cook</span>
                <select
                  className="app-input"
                  value={cookLeave.cookUserId || ''}
                  onChange={(e) => {
                    const cook = cooks.find((row) => row.id === e.target.value)
                    if (!cook) return
                    loadLeaves(cook, monthId)
                  }}
                >
                  <option value="">Select cook</option>
                  {cooks.map((cook) => (
                    <option key={cook.id} value={cook.id}>
                      {displayName(cook)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="muted">
                {loadingCooks
                  ? 'Loading cook…'
                  : selectedCook
                    ? `Cook: ${displayName(selectedCook)}`
                    : 'No Maharaj user found. Add one in Users first.'}
              </p>
            )}
            <label className="field-stack">
              <span className="field-stack-label">Leave month</span>
              <input
                className="app-input"
                type="month"
                value={monthId}
                onChange={(e) => {
                  const nextMonth = e.target.value
                  autoLoadKey.current = ''
                  update((current) =>
                    applyCookLeavePatch(current, {
                      monthId: nextMonth,
                      daysInMonth: daysInMonthFor(nextMonth),
                      leaveEntries: [],
                      leavesLoadedAt: null,
                      leaveDays: 0,
                    }),
                  )
                }}
              />
            </label>
            <label className="field-stack">
              <span className="field-stack-label">Days in month</span>
              <input
                className="app-input"
                type="number"
                min="1"
                max="31"
                step="1"
                value={cookLeave.daysInMonth || daysInMonthFor(monthId)}
                onChange={(e) => patch({ daysInMonth: Number(e.target.value) || 1 })}
              />
            </label>
            <label className="field-stack">
              <span className="field-stack-label">Waive days</span>
              <input
                className="app-input"
                type="number"
                min="0"
                max={cookLeave.leaveDays || 0}
                step="0.5"
                value={cookLeave.waivedDays ?? 0}
                onChange={(e) => patch({ waivedDays: Number(e.target.value) || 0 })}
              />
            </label>
          </div>
          <div className="finance-chip-row">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => patch({ waivedDays: 0 })}
            >
              Waive none
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => patch({ waivedDays: cookLeave.leaveDays || 0 })}
            >
              Waive all
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={loadingLeaves || !selectedCook || !monthId}
              onClick={() => loadLeaves(selectedCook, monthId)}
            >
              {loadingLeaves ? 'Loading…' : 'Reload leaves'}
            </button>
          </div>
          {cookLeave.leavesLoadedAt ? (
            <p className="muted">
              As of {formatDateTime(cookLeave.leavesLoadedAt)}
              {monthId ? ` · ${formatPeriodLabel(monthId)}` : ''}
            </p>
          ) : null}

          {(cookLeave.deductionPaise || 0) > 0 ? (
            <>
              <p className="field-stack-label">Cut money</p>
              <div
                className={`${compact ? 'mobile-segmented' : 'segmented-control'} finance-cook-leave-dest${
                  compact ? ' is-compact' : ''
                }`}
                role="group"
                aria-label="Where the cut money goes"
              >
                {DESTINATIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${compact ? 'mobile-segmented-btn' : 'segmented-btn'}${
                      destination === item.id ? ' is-active' : ''
                    }`}
                    onClick={() => patch({ destination: item.id })}
                  >
                    {compact ? item.shortLabel : item.label}
                  </button>
                ))}
              </div>
              {destination === 'split' ? (
                <FinanceAmountField
                  label="Amount to room fund"
                  valuePaise={cookLeave.toFundPaise || 0}
                  onChangePaise={(value) => patch({ destination: 'split', toFundPaise: value })}
                  hint={`Up to ${formatRupees(cookLeave.deductionPaise || 0)} of the cut. The rest reduces the bill.`}
                />
              ) : null}
            </>
          ) : null}

          <div className="finance-cook-leave-summary">
            <CookLeaveFacts
              cookLeave={cookLeave}
              compact={compact}
              emptyLeaves={
                loadingLeaves
                  ? 'Loading leaves…'
                  : `No leaves recorded for this cook in ${formatPeriodLabel(monthId) || 'this month'}.`
              }
            />
            <p className="finance-cook-leave-billed">
              After leave {formatRupees(cookLeave.billedPaise || 0)}
            </p>
          </div>
        </>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
    </section>
  )
}
