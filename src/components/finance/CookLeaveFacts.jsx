import { cookLeaveFactRows, formatCookLeaveDate, leavePeriodLine } from '../../utils/cookLeave'
import { formatRupees } from '../../utils/money'

export function CookLeaveFacts({
  cookLeave,
  leaveEntries,
  emptyLeaves = 'No leave dates stored.',
  compact = false,
}) {
  if (!cookLeave?.enabled) return null
  const rows = cookLeaveFactRows(cookLeave)
  const entries = Array.isArray(leaveEntries)
    ? leaveEntries
    : cookLeave.leaveEntries || []

  return (
    <div className={`finance-cook-leave-facts-wrap${compact ? ' is-compact' : ''}`}>
      {rows.length > 0 ? (
        <dl className="finance-fact-grid finance-cook-leave-facts">
          {rows.map((row) => (
            <div key={row.key} className="finance-fact finance-cook-leave-fact">
              <dt>{row.label}</dt>
              <dd>
                {row.kind === 'money' ? formatRupees(row.value) : row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {entries.length === 0 ? (
        <p className="muted">{emptyLeaves}</p>
      ) : (
        <ul className="finance-cook-leave-list">
          {entries.map((entry) => (
            <li key={`${entry.date}-${entry.period}`}>
              <span className="finance-cook-leave-date">
                {formatCookLeaveDate(entry.date) || entry.label || '—'}
              </span>
              <span className="finance-cook-leave-period">
                {leavePeriodLine(entry.period) || entry.period || ''}
              </span>
              <span className="finance-cook-leave-reason">
                {entry.reason || '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
