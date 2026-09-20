import { FinanceStatCard } from '../FinanceStatCard'
import { formatRupeesShort } from '../../../utils/money'
import { financePersonName } from '../../../utils/financePeople'

export function OverviewTab({
  wallet,
  totals,
  unpaidDues,
  users,
  statementsByUser,
  userId,
}) {
  const mine = statementsByUser?.[userId]

  return (
    <div className="finance-overview finance-stack">
      <div className="finance-stat-grid">
        <FinanceStatCard label="Room fund" amountPaise={wallet.balancePaise} />
        <FinanceStatCard label="Deposits held" amountPaise={totals.depositsHeld} />
        <FinanceStatCard label="Issued this period" amountPaise={totals.issuedPaise} />
        <FinanceStatCard label="Collected" amountPaise={totals.collectedPaise} />
        {mine ? (
          <FinanceStatCard
            label={mine.balancePaise >= 0 ? 'My credit' : 'My remaining'}
            amountPaise={mine.balancePaise >= 0 ? mine.creditPaise : mine.arrearsPaise}
            hint="From closed collections only. Open collections stay in their own bucket."
          />
        ) : null}
      </div>
      <section className="rail-card finance-card">
        <h3>Unpaid on open collections</h3>
        {unpaidDues.length === 0 ? (
          <p className="muted">Everyone is paid up on open collection shares.</p>
        ) : (
          <ul className="finance-due-list">
            {unpaidDues.map((d) => (
              <li key={d.id}>
                <span>{financePersonName(d.userId, { users, fallback: d.userName })}</span>
                <span>{formatRupeesShort(d.outstandingPaise || d.payablePaise || d.roundedDuePaise)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
