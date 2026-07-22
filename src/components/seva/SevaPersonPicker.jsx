import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Modal } from '../ui/Modal'

function PersonList({ people, onSelect }) {
  return (
    <ul className="seva-person-sheet-list" role="listbox" aria-label="Members">
      {people.map((p) => (
        <li key={p.id} role="presentation">
          <button
            type="button"
            role="option"
            className="seva-person-sheet-option"
            onClick={() => onSelect(p.id)}
          >
            {p.name}
          </button>
        </li>
      ))}
    </ul>
  )
}

function DesktopPersonPicker({ people, onSelect, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [onClose])

  return (
    <div className="seva-person-picker" ref={ref}>
      <select
        autoFocus
        className="seva-person-picker-select"
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value
          if (id) onSelect(id)
          else onClose()
        }}
      >
        <option value="">Select member…</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function MobilePersonPickerSheet({ people, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return people
    return people.filter((p) => p.name.toLowerCase().includes(q))
  }, [people, query])

  return (
    <Modal open onClose={onClose} title="Assign member">
      <label className="seva-person-sheet-search">
        <Search size={18} aria-hidden />
        <input
          type="search"
          autoFocus
          placeholder="Search members…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search members"
        />
      </label>
      {filtered.length === 0 ? (
        <p className="muted">No members match your search.</p>
      ) : (
        <PersonList
          people={filtered}
          onSelect={(id) => {
            onSelect(id)
            onClose()
          }}
        />
      )}
    </Modal>
  )
}

export function SevaPersonPicker({ people, onSelect, onClose }) {
  const isMobile = useMediaQuery('(max-width: 899px)')

  if (isMobile) {
    return (
      <MobilePersonPickerSheet
        people={people}
        onSelect={onSelect}
        onClose={onClose}
      />
    )
  }

  return (
    <DesktopPersonPicker people={people} onSelect={onSelect} onClose={onClose} />
  )
}

export function usePersonPicker() {
  const [open, setOpen] = useState(false)
  return {
    open,
    openPicker: () => setOpen(true),
    closePicker: () => setOpen(false),
  }
}
