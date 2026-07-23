import { Info as IconInfo } from 'lucide-react'
import { Modal } from './ui/Modal'

/** Modal showing catalog notes + recipe for Maharaj / admin. */
export function MenuItemDetailModal({ item, onClose }) {
  if (!item) return null

  const notes = (item.notes ?? '').trim()
  const recipe = (item.recipe ?? '').trim()

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={item.gu}
      subtitle={item.en || undefined}
    >
      {notes ? (
        <section className="cook-detail-section">
          <h3 className="modal-section-heading">Notes</h3>
          <p className="cook-detail-text">{notes}</p>
        </section>
      ) : null}
      {recipe ? (
        <section className="cook-detail-section">
          <h3 className="modal-section-heading">Recipe</h3>
          <p className="cook-detail-text cook-detail-recipe">{recipe}</p>
        </section>
      ) : null}
      {!notes && !recipe && (
        <p className="muted">No notes or recipe for this item.</p>
      )}
    </Modal>
  )
}

export function hasCookItemDetails(item) {
  return Boolean((item?.notes ?? '').trim() || (item?.recipe ?? '').trim())
}

export function CookItemInfoButton({ item, onOpen, className = '' }) {
  if (!hasCookItemDetails(item)) return null
  return (
    <button
      type="button"
      className={`btn btn-icon btn-ghost cook-item-info-btn ${className}`.trim()}
      title="Notes & recipe"
      aria-label={`Notes and recipe for ${item.gu}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(item)
      }}
    >
      <IconInfo size={16} />
    </button>
  )
}
