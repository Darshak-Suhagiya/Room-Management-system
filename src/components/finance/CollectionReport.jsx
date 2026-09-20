import {
  DUE_STATUS,
  FINANCE_SPLIT_MODE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_SOURCE_LABELS,
  PAYMENT_SOURCES,
  WALLET_MOVEMENT_REASON_LABELS,
} from '../../config/constants'
import { isExpenseFromFundPayment } from '../../utils/financeLedger'
import {
  formatDateLabel,
  formatDateTime,
  formatPeriodLabel,
  formatRupees,
  formatRupeesShort,
  formatSignedRupees,
  movementDateLabel,
} from '../../utils/money'
import { FinanceStatusPill } from './FinanceStatusPill'
import { FinanceStatCard } from './FinanceStatCard'
import { CookLeaveFacts } from './CookLeaveFacts'
import { FinanceFacts } from './FinanceFacts'

function fundFactRows(report) {
  if (!report?.totals) return []
  const closed = report.collection?.status === 'closed'
  const impact = report.totals.fundImpactPaise || 0
  const covered = report.totals.fundCoveredPaise || 0
  const recovered = report.totals.fundRecoveredPaise || 0
  const added = report.totals.appliedFundPaise || 0
  const cookLeaveToFund = report.totals.cookLeaveToFundPaise || 0
  const fromFund = report.totals.fromFundPaise || 0
  const rows = []
  if (impact) {
    rows.push({
      key: 'rounding',
      label: 'Rounding expected',
      value: formatSignedRupees(impact),
    })
    rows.push({
      key: 'added',
      label: 'Added so far',
      value: formatSignedRupees(added),
    })
  } else {
    rows.push({ key: 'rounding', label: 'Rounding', value: 'None' })
  }
  if (fromFund) {
    rows.push({
      key: 'fromFund',
      label: 'From room fund',
      value: formatRupees(fromFund),
    })
  }
  if (cookLeaveToFund) {
    rows.push({
      key: 'cookLeave',
      label: closed ? 'Cook leave to fund' : 'Cook leave at close',
      value: formatRupees(cookLeaveToFund),
    })
  }
  if (covered) {
    rows.push({
      key: 'covered',
      label: closed ? 'Covered (owes room)' : 'Covered so far',
      value: formatRupees(covered),
    })
  }
  if (recovered) {
    rows.push({
      key: 'recovered',
      label: closed ? 'Recovered' : 'Recover at close',
      value: formatRupees(recovered),
    })
  }
  return rows
}

function walletAppliedCopy(row) {
  if (!row.previousBalancePaise) return '—'
  return formatSignedRupees(row.previousBalancePaise)
}

function leftoverCopy(row, closed) {
  if (closed) {
    const settled = row.settledPaise || 0
    if (!settled) return '—'
    if (settled < 0) return formatRupees(-settled)
    return formatSignedRupees(settled)
  }
  return row.leftoverCreditPaise > 0 ? formatSignedRupees(row.leftoverCreditPaise) : '—'
}

function leftoverLabel(row, closed) {
  if (!closed) return 'Extra'
  if ((row.settledPaise || 0) < 0) return 'Owes room'
  return 'To wallet'
}

function leftoverTone(row, closed) {
  const value = closed ? row.settledPaise : row.leftoverCreditPaise
  if (!value) return undefined
  return value > 0 ? 'credit' : 'arrears'
}

function personActionState(row, { closed, userId, canManage }) {
  const mine = row.userId === userId
  return {
    mine,
    canPay: !closed && (canManage || mine) && row.status !== 'waived',
    canPayFromFund:
      !closed && canManage && row.status !== 'waived' && (row.fundCoverPaise || 0) > 0,
    canWaive: !closed && canManage && row.status !== 'waived' && row.outstandingPaise > 0,
    canUnwaive: !closed && canManage && row.status === 'waived',
  }
}

function personExtraFactRows(row, closed) {
  const rows = []
  if (row.roundingDeltaPaise) {
    rows.push({
      key: 'exact',
      label: 'Exact',
      value: formatRupeesShort(row.exactSharePaise),
    })
    rows.push({
      key: 'rounding',
      label: 'Rounding',
      value: formatSignedRupees(row.roundingDeltaPaise),
    })
  }
  if (row.previousBalancePaise) {
    const credit = row.creditPaise > 0
    const arrears = row.arrearsPaise > 0
    rows.push({
      key: 'wallet',
      label: 'Wallet',
      value: walletAppliedCopy(row),
      tone: credit ? 'credit' : arrears ? 'arrears' : undefined,
    })
  }
  if ((row.fundPaidPaise || 0) > 0) {
    rows.push({
      key: 'fromFund',
      label: 'From fund',
      value: formatRupeesShort(row.fundPaidPaise),
    })
  }
  const leftover = leftoverCopy(row, closed)
  if (leftover !== '—') {
    rows.push({
      key: 'leftover',
      label: leftoverLabel(row, closed),
      value: leftover,
      tone: leftoverTone(row, closed),
    })
  } else if (row.status === DUE_STATUS.COVERED && (row.fundPaidPaise || 0) > 0) {
    rows.push({
      key: 'owesRoom',
      label: 'Owes room',
      value: formatRupeesShort(row.fundPaidPaise),
      tone: 'arrears',
    })
  }
  return rows
}

function personCardFactRows(row, closed) {
  const rows = [
    { key: 'due', label: 'Due', value: formatRupees(row.roundedDuePaise) },
    {
      key: 'toPay',
      label: 'To pay',
      value: formatRupees(row.toPayPaise > 0 ? row.toPayPaise : 0),
    },
    {
      key: 'paid',
      label: 'Paid',
      value: formatRupees(row.memberPaidPaise ?? row.paidPaise),
    },
    ...personExtraFactRows(row, closed),
  ]
  if (closed && (row.fundRecoverPaise || 0) > 0) {
    rows.push({
      key: 'recovered',
      label: 'Recovered',
      value: formatRupees(row.fundRecoverPaise),
    })
  }
  return rows
}

function expenseFactRows(expense) {
  const billed = expense.billablePaise ?? expense.amountPaise - (expense.fromFundPaise || 0)
  const rows = [
    { key: 'period', label: 'Period', value: formatPeriodLabel(expense.periodId) },
  ]
  if (expense.date) {
    rows.push({ key: 'date', label: 'Date', value: formatDateLabel(expense.date) })
  }
  rows.push({
    key: 'split',
    label: 'Split',
    value: FINANCE_SPLIT_MODE_LABELS[expense.splitMode] || expense.splitMode,
  })
  if (expense.fromFundPaise > 0) {
    rows.push({
      key: 'fromFund',
      label: 'From fund',
      value: formatRupeesShort(expense.fromFundPaise),
    })
    rows.push({
      key: 'billed',
      label: 'People billed',
      value: formatRupeesShort(billed),
    })
  }
  rows.push({
    key: 'people',
    label: 'People',
    value: String(expense.includedNames?.length || 0),
  })
  return rows
}

function NameChips({ names }) {
  if (!names?.length) return null
  return (
    <ul className="finance-chip-row finance-name-chips">
      {names.map((name) => (
        <li key={name} className="finance-name-chip">
          {name}
        </li>
      ))}
    </ul>
  )
}

function LedgerList({ compact, children }) {
  return (
    <ul className={`finance-ledger${compact ? ' is-stacked' : ''}`}>{children}</ul>
  )
}

function PersonActions({
  row,
  closed,
  userId,
  canManage,
  compact = false,
  onRecordPayment,
  onPayFromFund,
  onWaive,
  onUnwaive,
}) {
  const { mine, canPay, canPayFromFund, canWaive, canUnwaive } = personActionState(row, {
    closed,
    userId,
    canManage,
  })
  if (!canPay && !canPayFromFund && !canWaive && !canUnwaive) return null
  const size = compact ? '' : ' btn-sm'
  const block = compact ? ' btn-block' : ''
  return (
    <span className={compact ? 'finance-person-actions' : 'finance-table-actions-inner'}>
      {canPay ? (
        <button
          type="button"
          className={`btn btn-primary${size}${block}`}
          onClick={() => onRecordPayment?.(row)}
        >
          {mine && !canManage ? 'I paid' : compact ? 'Record payment' : 'Record'}
        </button>
      ) : null}
      {canPayFromFund ? (
        <button
          type="button"
          className={`btn btn-secondary${size}${block}`}
          onClick={() => onPayFromFund?.(row)}
        >
          {compact ? 'Pay from room fund' : 'From fund'}
        </button>
      ) : null}
      {canWaive ? (
        <button
          type="button"
          className={`btn btn-ghost${size}${block}`}
          onClick={() => onWaive?.(row)}
        >
          Waive
        </button>
      ) : null}
      {canUnwaive ? (
        <button
          type="button"
          className={`btn btn-ghost${size}${block}`}
          onClick={() => onUnwaive?.(row)}
        >
          Unwaive
        </button>
      ) : null}
    </span>
  )
}

export function CollectionReport({
  report,
  userId,
  canManage = false,
  frozen = false,
  compact = false,
  onRecordPayment,
  onPayFromFund,
  onVoidPayment,
  onWaive,
  onUnwaive,
}) {
  if (!report?.collection) return null
  const {
    collection,
    expenses,
    cookLeaves = [],
    people,
    payments,
    fundMovements = [],
    walletRepayments = [],
    totals,
  } = report
  const closed = frozen || collection.status === 'closed'
  const extraWallets = people.filter((row) =>
    closed ? (row.settledPaise || 0) !== 0 : (row.leftoverCreditPaise || 0) > 0,
  )
  const actionProps = {
    closed,
    userId,
    canManage,
    onRecordPayment,
    onPayFromFund,
    onWaive,
    onUnwaive,
  }

  return (
    <div className={`finance-report finance-stack${compact ? ' is-compact' : ''}`}>
      <div className="finance-stat-grid">
        <FinanceStatCard label="Expenses" amountPaise={totals.totalExpensePaise} />
        <FinanceStatCard label="Exact shares" amountPaise={totals.totalExactPaise} />
        <FinanceStatCard label="Due" amountPaise={totals.totalDuePaise} />
        <FinanceStatCard label="Received" amountPaise={totals.receivedPaise} />
        {totals.fromFundPaise > 0 ? (
          <FinanceStatCard label="From room fund" amountPaise={totals.fromFundPaise} />
        ) : null}
        {totals.cookLeaveToFundPaise > 0 ? (
          <FinanceStatCard label="Cook leave to fund" amountPaise={totals.cookLeaveToFundPaise} />
        ) : null}
      </div>

      <section className="rail-card finance-card finance-stack">
        <h3>Expenses in this collection</h3>
        {expenses.length === 0 ? (
          <p className="muted">No stored expense snapshot. Older collections only kept the split totals.</p>
        ) : (
          expenses.map((expense) => (
            <article key={expense.expenseId} className="finance-expense-snap finance-stack">
              <div className="finance-row-head">
                <strong>{expense.name}</strong>
                <span>{formatRupeesShort(expense.amountPaise)}</span>
              </div>
              <FinanceFacts rows={expenseFactRows(expense)} />
              {expense.note ? <p>{expense.note}</p> : null}
              <NameChips names={expense.includedNames} />
              {expense.excludedNames?.length ? (
                <p className="muted">Not included: {expense.excludedNames.join(', ')}</p>
              ) : null}
              <ul className="finance-breakdown">
                {expense.perUser.map((row) => (
                  <li key={row.userId}>
                    {row.name} · {formatRupeesShort(row.sharePaise)}
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>

      {cookLeaves.length > 0 ? (
        <section className="rail-card finance-card finance-stack">
          <h3>Cook leave</h3>
          {cookLeaves.map((item) => (
            <article key={item.expenseId || item.monthId} className="finance-expense-snap finance-stack">
              <div className="finance-row-head">
                <strong>{item.cookName || 'Cook'}</strong>
                <span>{item.expenseName}</span>
              </div>
              <FinanceFacts
                rows={[
                  { key: 'period', label: 'Period', value: formatPeriodLabel(item.monthId) },
                  ...(item.toFundPaise > 0
                    ? [
                        {
                          key: 'toFund',
                          label: closed ? 'Held in fund' : 'To fund at close',
                          value: formatRupees(item.toFundPaise),
                        },
                      ]
                    : []),
                ]}
              />
              <CookLeaveFacts
                cookLeave={item}
                leaveEntries={item.leaveLines || item.leaveEntries}
                compact={compact}
              />
            </article>
          ))}
        </section>
      ) : null}

      <section className="rail-card finance-card finance-stack">
        <h3>Room fund</h3>
        <FinanceFacts rows={fundFactRows(report)} />
        {fundMovements.length === 0 && walletRepayments.length === 0 ? (
          <p className="muted">No room-fund movement recorded for this collection yet.</p>
        ) : (
          <LedgerList compact={compact}>
            {fundMovements.map((movement) => (
              <li key={movement.id}>
                <span>
                  {WALLET_MOVEMENT_REASON_LABELS[movement.reason] || movement.reason || 'Fund'}
                  {movement.userName ? ` · ${movement.userName}` : ''}
                  {' · '}
                  {movementDateLabel(movement)}
                  {movement.note ? ` · ${movement.note}` : ''}
                </span>
                <span>{formatSignedRupees(movement.amountPaise)}</span>
              </li>
            ))}
          </LedgerList>
        )}
        {walletRepayments.length > 0 ? (
          <>
            <h4>Wallet repayments before this collection</h4>
            <LedgerList compact={compact}>
              {walletRepayments.map((movement) => (
                <li key={movement.id}>
                  <span>
                    {movement.userName || 'Member'}
                    {' · '}
                    {movementDateLabel(movement)}
                    {movement.note ? ` · ${movement.note}` : ''}
                  </span>
                  <span>{formatSignedRupees(movement.amountPaise)}</span>
                </li>
              ))}
            </LedgerList>
          </>
        ) : null}
      </section>

      <section className="rail-card finance-card finance-stack">
        <h3>Who pays what</h3>
        {compact ? (
          <ul className="finance-due-cards">
            {people.map((row) => (
              <li key={row.id} className="finance-due-card">
                <div className="finance-due-card-head">
                  <strong>{row.userName}</strong>
                  <FinanceStatusPill status={row.status} />
                </div>
                <FinanceFacts rows={personCardFactRows(row, closed)} />
                {row.breakdown?.length ? (
                  <ul className="finance-breakdown">
                    {row.breakdown.map((line) => (
                      <li key={line.expenseId}>
                        {line.name} · {formatRupeesShort(line.sharePaise)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <PersonActions row={row} compact {...actionProps} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="finance-table-wrap">
            <table className="finance-table finance-table-people">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Due</th>
                  <th>To pay</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th className="finance-table-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {people.map((row) => {
                  const extras = personExtraFactRows(row, closed)
                  return (
                    <tr key={row.id} className={row.userId === userId ? 'is-mine' : undefined}>
                      <td>
                        <div className="finance-person-cell">
                          <strong>{row.userName}</strong>
                          <FinanceFacts rows={extras} className="is-inline" />
                        </div>
                      </td>
                      <td>{formatRupeesShort(row.roundedDuePaise)}</td>
                      <td>
                        {formatRupeesShort(row.toPayPaise > 0 ? row.toPayPaise : 0)}
                      </td>
                      <td>{formatRupeesShort(row.memberPaidPaise ?? row.paidPaise)}</td>
                      <td>
                        <FinanceStatusPill status={row.status} />
                      </td>
                      <td className="finance-table-actions">
                        <PersonActions row={row} {...actionProps} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rail-card finance-card finance-stack">
        <h3>{closed ? 'Wallets after close' : 'Extra on this collection'}</h3>
        {extraWallets.length === 0 ? (
          <p className="muted">
            {closed
              ? 'No leftover or room-wallet debt was recorded.'
              : 'Nobody has extra on this collection yet.'}
          </p>
        ) : (
          <LedgerList compact={compact}>
            {extraWallets.map((row) => {
              const settled = closed ? row.settledPaise : row.leftoverCreditPaise
              const owesRoom = closed && (row.settledPaise || 0) < 0
              return (
                <li key={`wallet-${row.id}`}>
                  <span>
                    {row.userName}
                    {owesRoom
                      ? ` · room fund covered ${formatRupees(row.fundPaidPaise || -row.settledPaise)} · owes room`
                      : ` · paid ${formatRupees(row.memberPaidPaise ?? row.paidPaise)} of ${formatRupees(row.payablePaise)}`}
                  </span>
                  <span>
                    {owesRoom ? formatRupees(-row.settledPaise) : formatSignedRupees(settled)}
                  </span>
                </li>
              )
            })}
          </LedgerList>
        )}
      </section>

      <section className="rail-card finance-card finance-stack">
        <h3>Payments</h3>
        {payments.length === 0 ? (
          <p className="muted">No payments recorded yet.</p>
        ) : (
          <LedgerList compact={compact}>
            {payments.map((payment) => (
              <li key={payment.id} className={payment.voided ? 'is-voided' : undefined}>
                <span>
                  <strong>
                    {isExpenseFromFundPayment(payment) ? 'Room fund' : payment.userName || 'Member'}
                  </strong>
                  {' · '}
                  {formatDateLabel(payment.paidOn) || formatDateTime(payment.createdAt)}
                  {payment.method
                    ? ` · ${PAYMENT_METHOD_LABELS[payment.method] || payment.method}`
                    : ''}
                  {payment.source === PAYMENT_SOURCES.ROOM_FUND
                    ? ` · ${PAYMENT_SOURCE_LABELS[PAYMENT_SOURCES.ROOM_FUND]}`
                    : ''}
                  {payment.recordedByName ? ` · by ${payment.recordedByName}` : ''}
                  {payment.note ? ` · ${payment.note}` : ''}
                  {payment.voided ? ' · voided' : ''}
                </span>
                <span>
                  {formatRupeesShort(payment.amountPaise)}
                  {canManage &&
                  !closed &&
                  !payment.voided &&
                  !isExpenseFromFundPayment(payment) ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => onVoidPayment?.(payment)}
                    >
                      Void
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </LedgerList>
        )}
      </section>
    </div>
  )
}
