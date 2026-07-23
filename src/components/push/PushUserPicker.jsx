import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Modal } from '../ui/Modal'
import { ALL_ROLES, ROLE_LABELS } from '../../config/rolePermissions'

function UserPickerList({ users, selectedIds, onToggle }) {
  return (
    <ul className="seva-person-sheet-list" role="listbox" aria-label="Users">
      {users.map((u) => {
        const checked = selectedIds.includes(u.id)
        return (
          <li key={u.id} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={checked}
              className={`seva-person-sheet-option push-user-sheet-option${checked ? ' is-selected' : ''}`}
              onClick={() => onToggle(u.id)}
            >
              <span>{u.displayName || u.email}</span>
              {checked && <span className="push-user-sheet-check">✓</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function PushUserPickerModal({ open, users, selectedIds, onToggle, onClose }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const name = (u.displayName || u.email || '').toLowerCase()
      const role = (ROLE_LABELS[u.role] || u.role || '').toLowerCase()
      return name.includes(q) || role.includes(q)
    })
  }, [users, query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select recipients"
      subtitle={`${selectedIds.length} selected`}
      wide
    >
      <label className="seva-person-sheet-search">
        <Search size={18} aria-hidden />
        <input
          type="search"
          placeholder="Search users…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
        />
      </label>
      {filtered.length === 0 ? (
        <p className="muted">No users match your search.</p>
      ) : (
        <UserPickerList
          users={filtered}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
      )}
      <div className="push-user-picker-modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done ({selectedIds.length})
        </button>
      </div>
    </Modal>
  )
}

export function PushUserPickerField({ users, selectedIds, onToggle }) {
  const isMobile = useMediaQuery('(max-width: 899px)')
  const [modalOpen, setModalOpen] = useState(false)

  if (isMobile) {
    const summary =
      selectedIds.length === 0
        ? 'Tap to choose users'
        : `${selectedIds.length} user${selectedIds.length === 1 ? '' : 's'} selected`

    return (
      <>
        <button
          type="button"
          className="push-user-picker-trigger"
          onClick={() => setModalOpen(true)}
        >
          {summary}
        </button>
        {selectedIds.length > 0 && (
          <div className="chip-row push-user-picker-summary">
            {selectedIds.slice(0, 4).map((id) => {
              const u = users.find((x) => x.id === id)
              return (
                <span key={id} className="checkbox-chip is-readonly">
                  {u?.displayName || u?.email || id}
                </span>
              )
            })}
            {selectedIds.length > 4 && (
              <span className="muted">+{selectedIds.length - 4} more</span>
            )}
          </div>
        )}
        <PushUserPickerModal
          open={modalOpen}
          users={users}
          selectedIds={selectedIds}
          onToggle={onToggle}
          onClose={() => setModalOpen(false)}
        />
      </>
    )
  }

  return (
    <div className="push-user-picker">
      {users.map((u) => (
        <label key={u.id} className="checkbox-chip">
          <input
            type="checkbox"
            checked={selectedIds.includes(u.id)}
            onChange={() => onToggle(u.id)}
          />
          {u.displayName || u.email || u.id}
        </label>
      ))}
    </div>
  )
}
