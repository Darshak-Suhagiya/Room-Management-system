/** Notice shown under a meal slot header (morning/evening). */
export function MenuSlotNote({ note, slot, className = '' }) {
  const text = (note ?? '').trim()
  if (!text) return null

  const slotClass =
    slot === 'morning' || slot === 'evening' ? `menu-slot-note-${slot}` : ''

  return (
    <div
      className={`menu-slot-note ${slotClass} ${className}`.trim()}
      role="note"
      aria-label="Menu notice"
    >
      <span className="menu-slot-note-label">Notice</span>
      <p className="menu-slot-note-text">{text}</p>
    </div>
  )
}
