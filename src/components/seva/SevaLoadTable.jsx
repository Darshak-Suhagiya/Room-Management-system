import { computePersonLoads } from '../../utils/sevaLoadUtils'

export function SevaLoadTable({ config }) {
  const loads = computePersonLoads(config)
  const { people, loadColumns } = config

  return (
    <section className="seva-section seva-load-section">
      <h3 className="seva-section-title">Seva load per person</h3>
      <table className="seva-table seva-load-table">
        <thead>
          <tr>
            <th />
            {loadColumns.map((col) => (
              <th key={col}>{col}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id}>
              <th className="seva-person-name">{person.name}</th>
              {loadColumns.map((col) => (
                <td key={col} className="seva-load-num">
                  {loads[person.id]?.[col] ?? 0}
                </td>
              ))}
              <td className="seva-load-num seva-load-total">
                {loads[person.id]?.Total ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
