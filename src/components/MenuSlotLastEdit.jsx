const ACTION_LABELS = {
  added: 'Added',
  updated: 'Updated',
  deleted: 'Deleted',
}

function formatEditWhen(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatSlotEditLine(edit, slotLabel) {
  if (!edit?.displayName) return ''
  const verb = ACTION_LABELS[edit.action] || 'Updated'
  const prefix = slotLabel ? `${slotLabel} ` : ''
  const when = formatEditWhen(edit.at)
  const line = `${prefix}${verb} by ${edit.displayName}`
  return when ? `${line} · ${when}` : line
}

export function MenuSlotLastEdit({ edit, slotLabel, className = '' }) {
  const text = formatSlotEditLine(edit, slotLabel)
  if (!text) return null
  return (
    <p className={`menu-slot-last-edit ${className}`.trim()}>{text}</p>
  )
}

export function MenuSlotLastEditList({ slotEdits, className = '' }) {
  const morning = slotEdits?.morning
  const evening = slotEdits?.evening
  if (!morning && !evening) return null
  return (
    <div className={`menu-slot-last-edit-list ${className}`.trim()}>
      <MenuSlotLastEdit edit={morning} slotLabel="Morning" />
      <MenuSlotLastEdit edit={evening} slotLabel="Evening" />
    </div>
  )
}
