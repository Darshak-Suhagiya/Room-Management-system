import { useEffect, useRef, useState } from 'react'

export function SevaPersonPicker({ people, onSelect, onClose }) {
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

export function usePersonPicker() {
  const [open, setOpen] = useState(false)
  return {
    open,
    openPicker: () => setOpen(true),
    closePicker: () => setOpen(false),
  }
}
