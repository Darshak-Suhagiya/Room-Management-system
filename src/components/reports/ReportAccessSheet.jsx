import { useState } from 'react'
import { ROLE_LABELS } from '../../config/rolePermissions'
import { Modal } from '../ui/Modal'

export function ReportAccessSheet({
  open,
  onClose,
  people,
  allowedUserIds,
  onToggle,
}) {
  const [pendingId, setPendingId] = useState(null)
  const [formError, setFormError] = useState('')

  const toggle = async (person) => {
    const allowed = !allowedUserIds.includes(person.id)
    setPendingId(person.id)
    setFormError('')
    try {
      await onToggle(person.id, allowed)
    } catch (err) {
      setFormError(err.message || 'Could not update access.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Who can use Reports"
      subtitle="Admins always have this page. Turn it on or off for anyone else."
      wide
      artKey="reports"
      className="reports-sheet"
    >
      <div className="reports-form">
        {formError ? <p className="form-error">{formError}</p> : null}
        {people.length === 0 ? (
          <p className="muted">No other approved people to grant.</p>
        ) : (
          <div className="reports-access-list">
            {people.map((person) => {
              const checked = allowedUserIds.includes(person.id)
              const role = ROLE_LABELS[person.role] || person.role
              return (
                <label key={person.id} className="checkbox-chip">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={pendingId === person.id}
                    onChange={() => toggle(person)}
                  />
                  <span>
                    {person.displayName || person.email}
                    {role ? <small> {role}</small> : null}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
