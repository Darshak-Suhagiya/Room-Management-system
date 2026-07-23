import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { AdminVoteTypeSegment } from '../../admin/mobile/AdminVoteTypeSegment'
import { defaultVoteTypeForCategory } from '../../../config/voteTypes'

export function CatalogAddItemSheet({
  open,
  onClose,
  categoryId,
  onAdd,
  saving = false,
}) {
  const [en, setEn] = useState('')
  const [gu, setGu] = useState('')
  const [voteType, setVoteType] = useState(defaultVoteTypeForCategory(categoryId))
  const [notes, setNotes] = useState('')
  const [recipe, setRecipe] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (!open) return
    setEn('')
    setGu('')
    setVoteType(defaultVoteTypeForCategory(categoryId))
    setNotes('')
    setRecipe('')
    setShowDetails(false)
  }, [open, categoryId])

  const invalid = !gu.trim() || !en.trim()

  return (
    <Modal open={open} onClose={onClose} title="Add dish" subtitle="New menu item" busy={saving}>
      <form
        className="admin-mobile-sheet-form mobile-section-gap"
        onSubmit={(e) => {
          e.preventDefault()
          if (invalid) return
          onAdd?.({
            categoryId,
            en: en.trim(),
            gu: gu.trim(),
            voteType,
            notes: notes.trim(),
            recipe: recipe.trim(),
          })
        }}
      >
        <label className="field-stack">
          <span className="field-stack-label">Gujarati name</span>
          <input className="app-input" value={gu} onChange={(e) => setGu(e.target.value)} required />
        </label>
        <label className="field-stack">
          <span className="field-stack-label">English name</span>
          <input className="app-input" value={en} onChange={(e) => setEn(e.target.value)} required />
        </label>
        <AdminVoteTypeSegment value={voteType} onChange={setVoteType} />
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? 'Hide details' : 'Notes / recipe'}
        </button>
        {showDetails && (
          <>
            <label className="field-stack">
              <span className="field-stack-label">Notes</span>
              <textarea className="app-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <label className="field-stack">
              <span className="field-stack-label">Recipe</span>
              <textarea className="app-textarea" rows={3} value={recipe} onChange={(e) => setRecipe(e.target.value)} />
            </label>
          </>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={saving || invalid}>
          {saving ? 'Adding…' : 'Add dish'}
        </button>
      </form>
    </Modal>
  )
}
