import { SevaPersonChip } from './SevaPersonChip'

export function SevaPeoplePanel({
  people,
  users,
  editable,
  onAddPerson,
  onRemovePerson,
  onLinkUser,
  onRenamePerson,
}) {
  return (
    <section className="seva-section seva-people-panel seva-no-print">
      <h3 className="seva-section-title">Members (drag or click a cell to assign)</h3>
      <table className="seva-table seva-people-table">
        <thead>
          <tr>
            <th>Drag</th>
            <th>Name</th>
            <th>Account link</th>
            {editable && <th />}
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id}>
              <td>
                <SevaPersonChip
                  person={person}
                  editable={editable}
                  dragPayload={{
                    personId: person.id,
                    note: '',
                    from: { type: 'pool' },
                  }}
                />
              </td>
              <td>
                {editable ? (
                  <input
                    type="text"
                    className="seva-person-name-input"
                    value={person.name}
                    onChange={(e) => onRenamePerson(person.id, e.target.value)}
                  />
                ) : (
                  person.name
                )}
              </td>
              <td>
                {editable ? (
                  <select
                    className="seva-link-select"
                    value={person.userId ?? ''}
                    onChange={(e) =>
                      onLinkUser(person.id, e.target.value || null)
                    }
                  >
                    <option value="">No account link</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName ?? u.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  person.userId && (
                    <span className="seva-linked-badge">Linked</span>
                  )
                )}
              </td>
              {editable && (
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onRemovePerson(person.id)}
                  >
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onAddPerson}
        >
          + Add member
        </button>
      )}
    </section>
  )
}
