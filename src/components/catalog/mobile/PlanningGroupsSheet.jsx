import { Modal } from '../../ui/Modal'
import { useState, useCallback } from 'react'
import { PlanningViewGroupsEditor } from '../../PlanningViewGroupsEditor'

export function PlanningGroupsSheet({ open, onClose, category, items, onSaved, onError }) {
  const [busy, setBusy] = useState(false)
  const onBusyChange = useCallback((next) => setBusy(Boolean(next)), [])

  if (!category) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Planning groups"
      subtitle={`${category.labelGu} · ${category.labelEn}`}
      busy={busy}
    >
      <div className="admin-mobile-planning-groups-sheet">
        <PlanningViewGroupsEditor
          category={category}
          items={items}
          onBusyChange={onBusyChange}
          onSaved={(msg) => {
            onSaved?.(msg)
            onClose?.()
          }}
          onError={onError}
        />
      </div>
    </Modal>
  )
}
