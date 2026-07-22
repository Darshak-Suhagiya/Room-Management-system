import { displayPersonName, getPersonById } from '../../utils/sevaLoadUtils'
import { useSevaPersonColor } from '../../contexts/SevaPersonColorContext'
import { useCoarsePointer } from '../../hooks/useCoarsePointer'

export function SevaPersonChip({
  person,
  note = '',
  editable,
  onRemove,
  dragPayload,
  className = '',
}) {
  const label = person
    ? displayPersonName(person, note)
    : note || '—'

  const personColors = useSevaPersonColor(editable ? person?.id : null)
  const coarsePointer = useCoarsePointer()

  const handleDragStart = (e) => {
    if (!editable || !dragPayload || coarsePointer) return
    e.dataTransfer.setData('application/seva-drag', JSON.stringify(dragPayload))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <span
      className={`seva-chip ${editable ? 'seva-chip-draggable' : ''} ${personColors ? 'seva-chip-person' : ''} ${className}`}
      style={
        personColors
          ? {
              backgroundColor: personColors.bg,
              borderColor: personColors.border,
              color: personColors.text,
            }
          : undefined
      }
      draggable={editable && !!dragPayload && !coarsePointer}
      onDragStart={handleDragStart}
    >
      <span className="seva-chip-label">{label}</span>
      {editable && onRemove && (
        <button
          type="button"
          className="seva-chip-remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  )
}

export function SevaPersonChipFromId({
  people,
  personId,
  note,
  ...props
}) {
  const person = getPersonById(people, personId)
  if (!personId && !note) {
    return <span className="seva-chip seva-chip-empty">—</span>
  }
  return <SevaPersonChip person={person} note={note} {...props} />
}
