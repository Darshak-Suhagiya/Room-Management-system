export function FinanceFacts({ rows = [], className = '' }) {
  if (!rows.length) return null
  return (
    <dl className={`finance-fact-grid ${className}`.trim()}>
      {rows.map((row) => (
        <div key={row.key} className="finance-fact">
          <dt>{row.label}</dt>
          <dd className={row.tone ? `is-${row.tone}` : undefined}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
