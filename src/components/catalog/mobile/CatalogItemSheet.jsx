import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { AdminVoteTypeSegment } from '../../admin/mobile/AdminVoteTypeSegment'
import { defaultVoteTypeForCategory } from '../../../config/voteTypes'

export function CatalogItemSheet({
  open,
  onClose,
  item,
  onSave,
  onDeleteRequest,
  saving = false,
}) {
  const [en, setEn] = useState('')
  const [gu, setGu] = useState('')
  const [voteType, setVoteType] = useState(defaultVoteTypeForCategory(''))
  const [notes, setNotes] = useState('')
  const [recipe, setRecipe] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (!item) return
    setEn(item.en ?? '')
    setGu(item.gu ?? '')
    setVoteType(item.voteType ?? defaultVoteTypeForCategory(item.categoryId))
    setNotes(item.notes ?? '')
    setRecipe(item.recipe ?? '')
    setShowDetails(Boolean((item.notes ?? '').trim() || (item.recipe ?? '').trim()))
  }, [item])

  if (!item) return null

  const invalid = !gu.trim() || !en.trim()
  const baseVote = item.voteType ?? defaultVoteTypeForCategory(item.categoryId)
  const dirty =
    en.trim() !== (item.en ?? '').trim() ||
    gu.trim() !== (item.gu ?? '').trim() ||
    voteType !== baseVote ||
    notes.trim() !== (item.notes ?? '').trim() ||
    recipe.trim() !== (item.recipe ?? '').trim()

  return (
    <Modal open={open} onClose={onClose} title="Edit dish" subtitle={item.gu || item.en} busy={saving}>
      <div className="admin-mobile-catalog-sheet mobile-section-gap">
        <label className="field-stack">
          <span className="field-stack-label">Gujarati name</span>
          <input
            className={`app-input${invalid && dirty ? ' field-invalid' : ''}`}
            value={gu}
            onChange={(e) => setGu(e.target.value)}
            placeholder="Gujarati name"
          />
        </label>
        <label className="field-stack">
          <span className="field-stack-label">English name</span>
          <input
            className={`app-input${invalid && dirty ? ' field-invalid' : ''}`}
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder="English name"
          />
        </label>

        <AdminVoteTypeSegment value={voteType} onChange={setVoteType} />

        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? 'Hide notes / recipe' : 'Notes / recipe (Maharaj only)'}
        </button>

        {showDetails && (
          <div className="admin-mobile-catalog-details">
            <label className="field-stack">
              <span className="field-stack-label">Notes</span>
              <textarea
                className="app-textarea"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <label className="field-stack">
              <span className="field-stack-label">Recipe</span>
              <textarea
                className="app-textarea"
                rows={3}
                value={recipe}
                onChange={(e) => setRecipe(e.target.value)}
              />
            </label>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={saving || !dirty || invalid}
          onClick={() =>
            onSave?.({
              en: en.trim(),
              gu: gu.trim(),
              voteType,
              notes: notes.trim(),
              recipe: recipe.trim(),
            })
          }
        >
          {saving ? 'Saving…' : 'Save dish'}
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-block admin-mobile-danger-btn"
          disabled={saving}
          onClick={() => onDeleteRequest?.(item)}
        >
          <Trash2 size={16} aria-hidden /> Remove dish
        </button>
      </div>
    </Modal>
  )
}
