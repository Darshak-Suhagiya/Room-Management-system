import { useState } from 'react'
import { AdminEmptyPanel, AdminItemRowCard } from '../../admin/mobile'
import { MobileNestedScreen } from '../../mobile/MobileNestedScreen'
import { FinanceCollectionDetailScreen } from './FinanceCollectionDetailScreen'
import { FinanceLoadMore } from '../FinanceLoadMore'
import {
  formatDateLabel,
  formatPeriodLabel,
  formatRupees,
  formatRupeesShort,
  formatSignedRupees,
  movementDateLabel,
} from '../../../utils/money'
import { WALLET_MOVEMENT_REASON_LABELS, MEMBER_WALLET_REASON_LABELS } from '../../../config/constants'
import { useFinanceHistory } from '../../../hooks/useFinanceHistory'

export function FinanceHistoryScreen({
  statementsByUser,
  wallet,
  users = [],
  userId,
  actorName,
  canManage,
  onDone,
}) {
  const [section, setSection] = useState('collections')
  const [pickedId, setPickedId] = useState(null)
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
  const statement = statementsByUser[userId]

  return (
    <div className="finance-mobile mobile-section-gap">
      <div className="mobile-segmented" role="tablist" aria-label="History">
        {[
          { id: 'collections', label: 'Collections' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'money', label: 'Money' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-segmented-btn${section === item.id ? ' is-active' : ''}`}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {section === 'collections' ? (
        loadingCollections && collections.length === 0 ? (
          <p className="muted">Loading history…</p>
        ) : collections.length === 0 ? (
          <AdminEmptyPanel title="No collections" hint="Issued collections will show here." />
        ) : (
          <>
            {collections.map((c) => (
              <AdminItemRowCard
                key={c.id}
                title={c.title}
                subtitle={`${formatPeriodLabel(c.periodId)} · ${formatRupeesShort(c.totalDuePaise)}`}
                badge={c.status}
                onClick={() => setPickedId(c.id)}
              />
            ))}
            <FinanceLoadMore
              shown={collections.length}
              hasMore={hasMoreCollections}
              loading={loadingMoreCollections}
              onClick={loadMoreCollections}
            />
          </>
        )
      ) : null}

      {section === 'expenses' ? (
        loadingExpenses && expenses.length === 0 ? (
          <p className="muted">Loading history…</p>
        ) : expenses.length === 0 ? (
          <AdminEmptyPanel title="No expenses" hint="Saved expenses will show here." />
        ) : (
          <>
            {expenses.map((expense) => {
              const col = collections.find((c) => c.id === expense.collectionId)
              return (
                <AdminItemRowCard
                  key={expense.id}
                  title={expense.name}
                  subtitle={`${formatPeriodLabel(expense.periodId)} · ${formatRupeesShort(expense.amountPaise)}${
              expense.fromFundPaise > 0 ? ` · ${formatRupeesShort(expense.fromFundPaise)} fund` : ''
            }${col ? ` · ${col.title}` : ''}`}
                  badge={expense.status}
                  onClick={col ? () => setPickedId(col.id) : undefined}
                />
              )
            })}
            <FinanceLoadMore
              shown={expenses.length}
              hasMore={hasMoreExpenses}
              loading={loadingMoreExpenses}
              onClick={loadMoreExpenses}
            />
          </>
        )
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
              <ul className="finance-ledger is-stacked">
                {walletMovements.map((m) => (
                  <li key={m.id}>
                    <span>
                      {WALLET_MOVEMENT_REASON_LABELS[m.reason] || m.reason}
                      {' · '}
                      {movementDateLabel(m)}
                      {m.note ? ` · ${m.note}` : ''}
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
          <section className="rail-card finance-card">
            <h3>My wallet</h3>
            {statement ? (
              <>
                <p>
                  {statement.balancePaise >= 0
                    ? `Credit ${formatRupees(statement.creditPaise)}`
                    : `Remaining ${formatRupees(statement.arrearsPaise)}`}
                </p>
                <ul className="finance-ledger is-stacked">
                  {statement.lines.map((line) => (
                    <li key={line.id}>
                      <span>
                        {MEMBER_WALLET_REASON_LABELS[line.reason || line.type] || line.type}
                        {line.collectionTitle ? ` · ${line.collectionTitle}` : ''}
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

      <MobileNestedScreen
        open={Boolean(active)}
        onClose={() => setPickedId(null)}
        title={active?.title || 'Collection'}
        subtitle={active ? formatDateLabel(active.dueDate) : ''}
        artKey="finance"
      >
        <FinanceCollectionDetailScreen
          collection={active}
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
          onClose={() => setPickedId(null)}
        />
      </MobileNestedScreen>
    </div>
  )
}
