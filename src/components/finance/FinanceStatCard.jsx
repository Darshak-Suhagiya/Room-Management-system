import { formatRupees, formatRupeesShort } from '../../utils/money'

export function FinanceStatCard({
  label,
  amountPaise,
  short = false,
  hint,
  className = '',
}) {
  const format = short ? formatRupeesShort : formatRupees
  return (
    <article className={`rail-card finance-card finance-stat-card ${className}`.trim()}>
      <p className="muted finance-stat-label">{label}</p>
      <p className="finance-stat">{format(amountPaise || 0)}</p>
      {hint ? <p className="muted finance-stat-hint">{hint}</p> : null}
    </article>
  )
}
