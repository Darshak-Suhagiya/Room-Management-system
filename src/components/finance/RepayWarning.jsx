import { formatRupees } from '../../utils/money'

export function RepayWarning({ person, unpaidDues }) {
  const outstanding = (unpaidDues || [])
    .filter((d) => d.userId === person?.id)
    .reduce((s, d) => s + (d.roundedDuePaise || 0), 0)
  const suggested = Math.max(0, (person?.deposit?.balancePaise || 0) - outstanding)
  return (
    <div className="finance-warning" role="status">
      <p>
        Unpaid dues: {formatRupees(outstanding)}. Suggested repay {formatRupees(suggested)}.
        Enter the amount yourself.
      </p>
    </div>
  )
}
