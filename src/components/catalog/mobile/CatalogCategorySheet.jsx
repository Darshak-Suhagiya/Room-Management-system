import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '../../ui/Modal'

export function CatalogCategorySheet({
  open,
  onClose,
  category,
  itemCount = 0,
  onSave,
  onDeleteRequest,
  saving = false,
}) {
  const [labelEn, setLabelEn] = useState('')
  const [labelGu, setLabelGu] = useState('')
  const isNew = !category

  useEffect(() => {
    if (isNew) {
      setLabelEn('')
      setLabelGu('')
      return
    }
    setLabelEn(category.labelEn ?? '')
    setLabelGu(category.labelGu ?? '')
  }, [category, isNew])

  const invalid = !labelEn.trim() || !labelGu.trim()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'Add category' : 'Edit category'}
      subtitle={isNew ? 'New menu category' : category?.labelEn}
      busy={saving}
    >
      <form
        className="admin-mobile-sheet-form mobile-section-gap"
        onSubmit={(e) => {
          e.preventDefault()
          if (invalid) return
          onSave?.({ labelEn: labelEn.trim(), labelGu: labelGu.trim() })
        }}
      >
        <label className="field-stack">
          <span className="field-stack-label">Gujarati label</span>
          <input
            className="app-input"
            value={labelGu}
            onChange={(e) => setLabelGu(e.target.value)}
            required
          />
        </label>
        <label className="field-stack">
          <span className="field-stack-label">English label</span>
          <input
            className="app-input"
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={saving || invalid}>
          {saving ? 'Saving…' : isNew ? 'Add category' : 'Save category'}
        </button>
        {!isNew && (
          <button
            type="button"
            className="btn btn-ghost btn-block admin-mobile-danger-btn"
            disabled={saving}
            onClick={() => onDeleteRequest?.(category)}
          >
            <Trash2 size={16} aria-hidden />
            Delete category{itemCount > 0 ? ` (${itemCount} items)` : ''}
          </button>
        )}
      </form>
    </Modal>
  )
}
