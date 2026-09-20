import { useMemo, useState } from 'react'
import { MEMBER_WALLET_REASON_LABELS } from '../../../config/constants'
import { walletRowsForPeople } from '../../../utils/financeLedger'
import { formatDateTime, formatSignedRupees } from '../../../utils/money'
import { AdminEmptyPanel } from '../../admin/mobile'
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

export function FinanceWalletsScreen({
  users = [],
  statementsByUser = {},
  userId,
  actorName,
  canManage = false,
  walletRepayments = [],
  onDone,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [fixing, setFixing] = useState(false)
  const rows = useMemo(
    () => walletRowsForPeople({ users, statementsByUser }),
    [users, statementsByUser],
  )
  const totalCredit = rows.reduce((sum, row) => sum + row.creditPaise, 0)
  const totalOwed = rows.reduce((sum, row) => sum + row.arrearsPaise, 0)

  return (
    <div className="finance-mobile mobile-section-gap">
      <div className="finance-stat-grid">
        <FinanceStatCard label="Total credit" amountPaise={totalCredit} short />
        <FinanceStatCard label="Total owed" amountPaise={totalOwed} short />
      </div>

      {canManage ? (
        <WalletRepaymentRequestsCard
          requests={walletRepayments}
          userId={userId}
          actorName={actorName}
          locked={fixing}
          block
          compact
          onDone={onDone}
        />
      ) : null}

      {rows.length === 0 ? (
        <AdminEmptyPanel title="No wallets" hint="People in the room will show here with their wallet balance." />
      ) : (
        <ul className="finance-due-cards">
          {rows.map((row) => {
            const open = row.userId === expandedId
            return (
              <li key={row.userId} className="finance-due-card">
                <button
                  type="button"
                  className="finance-card-btn"
                  aria-expanded={open}
                  onClick={() => setExpandedId(open ? null : row.userId)}
                >
                  <div className="finance-due-card-head">
                    <strong>{row.userName}</strong>
                    <FinanceStatusPill status={row.status} />
                  </div>
                  <p className={amountClass(row.balancePaise)}>
                    {formatSignedRupees(row.balancePaise)}
                  </p>
                </button>
                {open ? (
                  row.lines.length === 0 ? (
                    <p className="muted">No personal wallet activity yet.</p>
                  ) : (
                    <ul className="finance-ledger is-stacked">
                      {row.lines.map((line) => (
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
                  )
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {canManage ? (
        <>
          <WalletBackfillCard
            userId={userId}
            actorName={actorName}
            locked={false}
            block
            compact
            onBusyChange={setFixing}
            onDone={onDone}
          />
          <MemberWalletAdjustCard
            users={users}
            userId={userId}
            actorName={actorName}
            locked={fixing}
            block
            compact
            onDone={onDone}
          />
        </>
      ) : null}
    </div>
  )
}
