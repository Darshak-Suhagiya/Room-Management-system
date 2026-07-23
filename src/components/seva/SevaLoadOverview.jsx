import { Scale } from 'lucide-react'
import { computePersonLoads } from '../../utils/sevaLoadUtils'

export function SevaLoadOverview({ config, linkedPersonId }) {
  const loads = computePersonLoads(config)
  const columns = config.loadColumns ?? []
  const ranked = [...(config.people ?? [])].sort(
    (a, b) => (loads[b.id]?.Total ?? 0) - (loads[a.id]?.Total ?? 0),
  )

  return (
    <section className="seva-load-overview">
      <header className="seva-section-head">
        <span className="seva-section-icon" aria-hidden>
          <Scale size={18} />
        </span>
        <div>
          <h3>Load per person</h3>
          <p className="muted">How seva is balanced across the week.</p>
        </div>
      </header>

      <div className="seva-load-table-wrap">
        <table className="seva-load-table-modern">
          <thead>
            <tr>
              <th className="col-name">Person</th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
              <th className="col-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((person) => {
              const row = loads[person.id] ?? {}
              const isYou = person.id === linkedPersonId
              return (
                <tr key={person.id} className={isYou ? 'is-you' : ''}>
                  <td className="col-name">
                    <span className="seva-load-name">
                      {person.name}
                      {isYou ? (
                        <span className="seva-you-badge">You</span>
                      ) : null}
                    </span>
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="col-num">
                      {row[col] ?? 0}
                    </td>
                  ))}
                  <td className="col-total">{row.Total ?? 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
