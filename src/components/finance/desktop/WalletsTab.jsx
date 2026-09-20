import { useMemo, useState } from 'react'
import { MEMBER_WALLET_REASON_LABELS } from '../../../config/constants'
import { walletRowsForPeople } from '../../../utils/financeLedger'
import { formatDateTime, formatRupees, formatSignedRupees } from '../../../utils/money'
import { FinanceStatCard } from '../FinanceStatCard'
import { FinanceStatusPill } from '../FinanceStatusPill'
import { MemberWalletAdjustCard } from '../MemberWalletAdjustCard'
import { WalletBackfillCard } from '../WalletBackfillCard'
import { WalletRepaymentRequestsCard } from '../WalletRepaymentRequestsCard'

function amountClass(paise) {
  if (paise > 0) return 'finance-amt-credit'
  if (paise < 0) return 'finance-amt-arrears'
  return undefined
}

export function WalletsTab({
  users = [],
  statementsByUser = {},
  userId,
  actorName,
  canManage = false,
  walletRepayments = [],
  onDone,
}) {
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [fixing, setFixing] = useState(false)
  const rows = useMemo(
    () => walletRowsForPeople({ users, statementsByUser }),
    [users, statementsByUser],
  )
  const totalCredit = rows.reduce((sum, row) => sum + row.creditPaise, 0)
  const totalOwed = rows.reduce((sum, row) => sum + row.arrearsPaise, 0)
  const selected = rows.find((row) => row.userId === selectedUserId)

  const toggleRow = (id) => {
    setSelectedUserId((current) => (current === id ? null : id))
  }

  return (
    <div className="finance-stack">
      <div className="finance-stat-grid">
        <FinanceStatCard label="Total credit" amountPaise={totalCredit} />
        <FinanceStatCard label="Total owed" amountPaise={totalOwed} />
      </div>

      {canManage ? (
        <WalletRepaymentRequestsCard
          requests={walletRepayments}
          userId={userId}
          actorName={actorName}
          locked={fixing}
          onDone={onDone}
        />
      ) : null}

      {rows.length === 0 ? (
        <p className="muted">No people to show wallets for.</p>
      ) : (
        <div className="finance-table-wrap">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Balance</th>
                <th>Status</th>
                <th className="finance-table-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const open = row.userId === selectedUserId
                return (
                  <tr
                    key={row.userId}
                    className={`finance-wallets-row${row.userId === userId ? ' is-mine' : ''}`}
                    onClick={() => toggleRow(row.userId)}
                  >
                    <td>{row.userName}</td>
                    <td>
                      <span className={amountClass(row.balancePaise)}>
                        {formatSignedRupees(row.balancePaise)}
                      </span>
                    </td>
                    <td>
                      <FinanceStatusPill status={row.status} />
                    </td>
                    <td className="finance-table-actions">
                      <span className="finance-table-actions-inner">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          aria-expanded={open}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleRow(row.userId)
                          }}
                        >
                          {open ? 'Hide' : 'View'}
                        </button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <section className="rail-card finance-card">
          <h3>{selected.userName}</h3>
          <p>
            Balance{' '}
            <strong className={amountClass(selected.balancePaise)}>
              {selected.balancePaise >= 0
                ? `credit ${formatRupees(selected.creditPaise)}`
                : `owed ${formatRupees(selected.arrearsPaise)}`}
            </strong>
          </p>
          {selected.lines.length === 0 ? (
            <p className="muted">No personal wallet activity yet.</p>
          ) : (
            <ul className="finance-ledger">
              {selected.lines.map((line) => (
                <li key={line.id}>
                  <span>
                    {MEMBER_WALLET_REASON_LABELS[line.reason || line.type] || line.type}
                    {line.collectionTitle ? ` · ${line.collectionTitle}` : ''}
                    {line.at ? ` · ${formatDateTime(line.at)}` : ''}
                    {line.note ? ` · ${line.note}` : ''}
                  </span>
                  <span className={amountClass(line.amountPaise)}>
                    {formatSignedRupees(line.amountPaise)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {canManage ? (
        <>
          <WalletBackfillCard
            userId={userId}
            actorName={actorName}
            locked={false}
            onBusyChange={setFixing}
            onDone={onDone}
          />
          <MemberWalletAdjustCard
            users={users}
            userId={userId}
            actorName={actorName}
            locked={fixing}
            onDone={onDone}
          />
        </>
      ) : null}
    </div>
  )
}
