export function SevaGroupDefinitions({
  dailyGroups,
  editable,
  onEditGroup,
  onRemoveGroup,
}) {
  return (
    <section className="seva-section seva-defs-section">
      <table className="seva-table seva-defs-table">
        <tbody>
          {dailyGroups.map((group) => (
            <tr key={group.id}>
              <th className="seva-code-cell">
                {editable ? (
                  <input
                    type="text"
                    className="seva-code-input"
                    value={group.code}
                    onChange={(e) =>
                      onEditGroup(group.id, { code: e.target.value })
                    }
                  />
                ) : (
                  group.code
                )}
              </th>
              <td className="seva-desc-cell">
                {editable ? (
                  <textarea
                    className="seva-desc-input"
                    value={group.description}
                    rows={2}
                    onChange={(e) =>
                      onEditGroup(group.id, { description: e.target.value })
                    }
                  />
                ) : (
                  group.description
                )}
              </td>
              {editable && (
                <td className="seva-def-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onRemoveGroup(group.id)}
                  >
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
