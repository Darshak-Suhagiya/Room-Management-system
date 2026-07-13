import { Info as IconInfo, X as IconX } from 'lucide-react'

/** Modal showing catalog notes + recipe for Maharaj / admin. */
export function MenuItemDetailModal({ item, onClose }) {
  if (!item) return null
  const notes = (item.notes ?? '').trim()
  const recipe = (item.recipe ?? '').trim()

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-item-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="menu-item-detail-title">{item.gu}</h2>
            {item.en ? <p className="modal-subtitle">{item.en}</p> : null}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
        </header>
        <div className="modal-body">
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
        </div>
      </div>
    </div>
  )
}

export function hasCookItemDetails(item) {
  return Boolean((item?.notes ?? '').trim() || (item?.recipe ?? '').trim())
}

export function CookItemInfoButton({ item, onOpen }) {
  if (!hasCookItemDetails(item)) return null
  return (
    <span
      className="cook-item-info-btn"
      role="button"
      tabIndex={0}
      title="Notes & recipe"
      aria-label={`Notes and recipe for ${item.gu}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(item)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onOpen(item)
        }
      }}
    >
      <IconInfo size={16} />
    </span>
  )
}
