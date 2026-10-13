import { useMemo, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { isAdminRole, isObserverRole, ROLE_LABELS } from '../../config/rolePermissions'
import { Modal } from '../ui/Modal'

function personLabel(person) {
  return person.displayName || person.email || 'Member'
}

function personRole(person) {
  return ROLE_LABELS[person.role] || person.role || ''
}

function AccessRow({ person, actionLabel, busy, locked, adding, onAction }) {
  const role = personRole(person)
  return (
    <div className={`reports-access-person${busy ? ' is-busy' : ''}`}>
      <span className="reports-access-person-copy">
        <strong>{personLabel(person)}</strong>
        {role ? <small>{role}</small> : null}
      </span>
      <button
        type="button"
        className={`btn btn-sm${adding ? ' btn-primary' : ' btn-secondary'}`}
        disabled={locked}
        onClick={() => onAction(person)}
      >
        {busy ? <Loader2 size={14} className="reports-access-spin" aria-hidden /> : null}
        {busy ? (adding ? 'Adding…' : 'Removing…') : actionLabel}
      </button>
    </div>
  )
}

export function ReportAccessSheet({
  open,
  onClose,
  people,
  allowedUserIds,
  onToggle,
}) {
  const [query, setQuery] = useState('')
  const [pendingId, setPendingId] = useState(null)
  const [formError, setFormError] = useState('')
  const needle = query.trim().toLowerCase()
  const busy = Boolean(pendingId)

  const candidates = useMemo(
    () =>
      (people ?? []).filter(
        (person) => !isAdminRole(person) && !isObserverRole(person),
      ),
    [people],
  )

  const granted = useMemo(
    () =>
      candidates.filter((person) => allowedUserIds.includes(person.id)),
    [candidates, allowedUserIds],
  )

  const searchMatches = useMemo(() => {
    if (!needle) return []
    return candidates.filter((person) => {
      if (allowedUserIds.includes(person.id)) return false
      return `${person.displayName || ''} ${person.email || ''}`
        .toLowerCase()
        .includes(needle)
    })
  }, [candidates, allowedUserIds, needle])

  const closeSheet = () => {
    if (busy) return
    setQuery('')
    setFormError('')
    setPendingId(null)
    onClose()
  }

  const setAccess = async (person, allowed) => {
    if (busy) return
    setPendingId(person.id)
    setFormError('')
    try {
      await onToggle(person.id, allowed)
      if (allowed) setQuery('')
    } catch (err) {
      setFormError(err.message || 'Could not update access.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={closeSheet}
      title="Who can see everyone's records"
      subtitle="Admins and observers already can. Grant a member to let them see everyone's answers, notes, and analytics."
      wide
      busy={busy}
      artKey="reports"
      className="reports-sheet"
    >
      <div className="reports-form reports-access-sections">
        {formError ? <p className="form-error">{formError}</p> : null}

        <section>
          <h3>Can see everyone</h3>
          {granted.length === 0 ? (
            <p className="muted">No extra viewers yet.</p>
          ) : (
            <div className="reports-access-people">
              {granted.map((person) => (
                <AccessRow
                  key={person.id}
                  person={person}
                  actionLabel="Remove"
                  adding={false}
                  busy={pendingId === person.id}
                  locked={busy}
                  onAction={() => setAccess(person, false)}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h3>Add a person</h3>
          <label className="reports-access-search">
            <Search size={18} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
              aria-label="Search by name or email"
              disabled={busy}
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                className="reports-access-search-clear"
                aria-label="Clear search"
                disabled={busy}
                onClick={() => setQuery('')}
              >
                <X size={16} aria-hidden />
              </button>
            ) : null}
          </label>
          {!needle ? (
            <p className="muted">Search by name to add someone.</p>
          ) : searchMatches.length === 0 ? (
            <p className="muted">No one matches.</p>
          ) : (
            <div className="reports-access-people">
              {searchMatches.map((person) => (
                <AccessRow
                  key={person.id}
                  person={person}
                  actionLabel="Add"
                  adding
                  busy={pendingId === person.id}
                  locked={busy}
                  onAction={() => setAccess(person, true)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}
