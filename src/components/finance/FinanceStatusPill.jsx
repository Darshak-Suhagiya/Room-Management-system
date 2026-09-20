export function FinanceStatusPill({ status }) {
  const value = String(status || '').toLowerCase()
  return <span className={`finance-pill is-${value}`}>{value || '—'}</span>
}
