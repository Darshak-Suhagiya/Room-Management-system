import { WandSparkles, X } from 'lucide-react'
import './defaults.css'

/**
 * Members whose vote came from "Apply default votes", with who applied it.
 * Shared by the desktop modal and the mobile sheet (`variant` changes density).
 */
export function DefaultVotesList({
  people,
  canRemove = false,
  onRemove,
  removingUserId = null,
  variant = 'desktop',
}) {
  if (!people?.length) return null
  return (
    <section className={`default-votes-list default-votes-list-${variant}`}>
      <h4 className="default-votes-list-title">
        <WandSparkles size={14} aria-hidden />
        Default votes
        <span className="default-votes-list-count">{people.length}</span>
      </h4>
      <ul>
        {people.map((p) => (
          <li key={p.userId} className="default-votes-list-row">
            <span className="default-votes-list-text">
              <span className="default-votes-list-name">{p.name}</span>
              <span className="default-votes-list-meta">
                {p.notEating ? 'Not eating' : 'Eating'}
                {p.appliedBy ? ` · applied by ${p.appliedBy}` : ''}
              </span>
            </span>
            {canRemove && onRemove && (
              <button
                type="button"
                className="btn btn-ghost btn-sm default-votes-list-remove"
                disabled={removingUserId === p.userId}
                aria-label={`Remove default vote for ${p.name}`}
                onClick={() => onRemove(p)}
              >
                {removingUserId === p.userId ? (
                  '…'
                ) : (
                  <>
                    <X size={14} aria-hidden />
                    Remove
                  </>
                )}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
