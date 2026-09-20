import { useState } from 'react'
import { FinanceStatusPill } from '../FinanceStatusPill'
import { CollectionDetail } from '../CollectionDetail'
import { FinanceLoadMore } from '../FinanceLoadMore'
import { Modal } from '../../ui/Modal'
import {
  formatDateLabel,
  formatPeriodLabel,
  formatRupees,
  formatRupeesShort,
  formatSignedRupees,
  movementDateLabel,
} from '../../../utils/money'
import { financePersonName } from '../../../utils/financePeople'
import { WALLET_MOVEMENT_REASON_LABELS, MEMBER_WALLET_REASON_LABELS } from '../../../config/constants'
import { EXPENSE_STATUS } from '../../../config/constants'
import { useFinanceHistory } from '../../../hooks/useFinanceHistory'

export function HistoryTab({
  statementsByUser,
  wallet,
  users,
  userId,
  actorName,
  canManage,
  onDone,
}) {
  const [section, setSection] = useState('collections')
  const [pickedId, setPickedId] = useState(null)
  const [personId, setPersonId] = useState(userId || '')
  const history = useFinanceHistory({
    enabled: true,
    users,
    statementsByUser,
  })
  const {
    collections,
    expenses,
    walletMovements,
    duesByCollection,
    paymentsByCollection,
    reportByCollection,
    error,
    loadingCollections,
    loadingExpenses,
    loadingMovements,
    loadingMoreCollections,
    loadingMoreExpenses,
    loadingMoreMovements,
    hasMoreCollections,
    hasMoreExpenses,
    hasMoreMovements,
    loadMoreCollections,
    loadMoreExpenses,
    loadMoreMovements,
    refresh,
  } = history
  const handleDone = async () => {
    await onDone?.()
    await refresh()
  }
  const active = collections.find((c) => c.id === pickedId)
  const report = pickedId ? reportByCollection?.[pickedId] : null
  const statement = statementsByUser[personId]
  const peopleIds = canManage
    ? (users || []).map((person) => person.id)
    : [userId].filter(Boolean)

  return (
    <div className="finance-stack">
      <div className="finance-chip-row" role="tablist" aria-label="History">
        {[
          { id: 'collections', label: 'Collections' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'money', label: 'Money' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`btn btn-sm ${section === item.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {section === 'collections' ? (
        <ul className="finance-stack">
          {loadingCollections && collections.length === 0 ? (
            <p className="muted">Loading history…</p>
          ) : collections.length === 0 ? (
            <p className="muted">No collections yet.</p>
          ) : (
            collections.map((c) => {
              const totals = reportByCollection[c.id]?.totals
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className="rail-card finance-card finance-card-btn"
                    onClick={() => setPickedId(c.id)}
                  >
                    <span className="finance-row-head">
                      <span>
                        <strong>{c.title}</strong>
                        <p className="muted">
                          {formatPeriodLabel(c.periodId)} · {formatRupees(c.totalDuePaise)}
                          {totals ? ` · received ${formatRupees(totals.receivedPaise)}` : ''}
                          {c.dueDate ? ` · due ${formatDateLabel(c.dueDate)}` : ''}
                        </p>
                      </span>
                      <FinanceStatusPill status={c.status} />
                    </span>
                  </button>
                </li>
              )
            })
          )}
          <li>
            <FinanceLoadMore
              shown={collections.length}
              hasMore={hasMoreCollections}
              loading={loadingMoreCollections}
              onClick={loadMoreCollections}
            />
          </li>
        </ul>
      ) : null}

      {section === 'expenses' ? (
        <div className="finance-stack">
          {loadingExpenses && expenses.length === 0 ? (
            <p className="muted">Loading history…</p>
          ) : expenses.length === 0 ? (
            <p className="muted">No expenses yet.</p>
          ) : (
            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Collection</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => {
                    const col = collections.find((c) => c.id === expense.collectionId)
                    return (
                      <tr key={expense.id}>
                        <td>{expense.name}</td>
                        <td>{formatPeriodLabel(expense.periodId)}</td>
                        <td>
                          {formatRupeesShort(expense.amountPaise)}
                          {expense.fromFundPaise > 0
                            ? ` · ${formatRupeesShort(expense.fromFundPaise)} fund`
                            : ''}
                        </td>
                        <td>
                          <FinanceStatusPill status={expense.status} />
                        </td>
                        <td>
                          {col ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setPickedId(col.id)}
                            >
                              {col.title}
                            </button>
                          ) : expense.status === EXPENSE_STATUS.DRAFT ? (
                            'Draft'
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <FinanceLoadMore
            shown={expenses.length}
            hasMore={hasMoreExpenses}
            loading={loadingMoreExpenses}
            onClick={loadMoreExpenses}
          />
        </div>
      ) : null}

      {section === 'money' ? (
        <div className="finance-stack">
          <section className="rail-card finance-card">
            <h3>Room fund</h3>
            {loadingMovements && walletMovements.length === 0 ? (
              <p className="muted">Loading history…</p>
            ) : walletMovements.length === 0 ? (
              <p className="muted">No fund movements yet.</p>
            ) : (
              <ul className="finance-ledger">
                {walletMovements.map((m) => (
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
            <FinanceLoadMore
              shown={walletMovements.length}
              hasMore={hasMoreMovements}
              loading={loadingMoreMovements}
              onClick={loadMoreMovements}
            />
          </section>
          <section className="rail-card finance-card finance-stack">
            <h3>Personal wallet</h3>
            {canManage ? (
              <label className="field-stack">
                <span className="field-stack-label">Person</span>
                <select
                  className="app-input"
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                >
                  <option value="">Select</option>
                  {peopleIds.map((id) => (
                    <option key={id} value={id}>
                      {financePersonName(id, { users, dues: Object.values(duesByCollection).flat() })}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {statement ? (
              <>
                <p>
                  Balance{' '}
                  <strong>
                    {statement.balancePaise >= 0
                      ? `credit ${formatRupees(statement.creditPaise)}`
                      : `remaining ${formatRupees(statement.arrearsPaise)}`}
                  </strong>
                </p>
                <ul className="finance-ledger">
                  {statement.lines.map((line) => (
                    <li key={line.id}>
                      <span>
                        {MEMBER_WALLET_REASON_LABELS[line.reason || line.type] || line.type}
                        {line.collectionTitle ? ` · ${line.collectionTitle}` : ''}
                        {line.note ? ` · ${line.note}` : ''}
                      </span>
                      <span>{formatSignedRupees(line.amountPaise)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="muted">No personal wallet activity yet.</p>
            )}
          </section>
        </div>
      ) : null}

      <Modal open={Boolean(active)} onClose={() => setPickedId(null)} title={active?.title || 'Collection'} extraWide artKey="finance">
        {report ? (
          <CollectionDetail
            report={report}
            dues={duesByCollection[pickedId] || []}
            payments={paymentsByCollection[pickedId] || []}
            statementsByUser={statementsByUser}
            wallet={wallet}
            walletMovements={walletMovements}
            userId={userId}
            actorName={actorName}
            canManage={canManage}
            onDone={handleDone}
            onClosed={() => setPickedId(null)}
          />
        ) : null}
      </Modal>
    </div>
  )
}
