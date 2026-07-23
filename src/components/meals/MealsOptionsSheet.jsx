import { Link } from 'react-router-dom'
import {
  BarChart3 as IconAnalytics,
  ChevronRight,
  Table as IconTable,
} from 'lucide-react'
import { Modal } from '../ui/Modal'

/**
 * Labeled bottom sheet for mobile My Meals options.
 */
export function MealsOptionsSheet({
  open,
  onClose,
  canSeeMealReviews,
  canSeeMenuAnalytics,
  showOthersFeedback,
  onToggleOthersFeedback,
}) {
  const links = [
    { to: '/menus', label: 'All menus', description: 'Browse every planned menu', icon: IconTable },
    canSeeMenuAnalytics && {
      to: '/analytics',
      label: 'Menu Analytics',
      description: 'Dish frequency and feedback',
      icon: IconAnalytics,
    },
  ].filter(Boolean)

  const hasContent = links.length > 0 || canSeeMealReviews
  if (!hasContent) return null

  return (
    <Modal open={open} onClose={onClose} title="Meal options">
      <div className="meals-options-sheet">
        {canSeeMealReviews && (
          <section className="meals-options-section">
            <h3 className="meals-options-section-title">Feedback</h3>
            <label className="meals-options-toggle-row feedback-switch">
              <div>
                <span className="meals-options-toggle-label">Show everyone&apos;s feedback</span>
                <p className="meals-options-toggle-desc muted">
                  See ratings and comments from other members on each dish.
                </p>
              </div>
              <span className="feedback-switch-control">
                <input
                  type="checkbox"
                  role="switch"
                  checked={showOthersFeedback}
                  onChange={onToggleOthersFeedback}
                  aria-label="Show everyone's feedback"
                />
                <span className="feedback-switch-track" aria-hidden>
                  <span className="feedback-switch-thumb" />
                </span>
              </span>
            </label>
          </section>
        )}

        {links.length > 0 && (
          <section className="meals-options-section">
            <h3 className="meals-options-section-title">Links</h3>
            <ul className="meals-options-link-list">
              {links.map(({ to, label, description, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="meals-options-link"
                    onClick={onClose}
                  >
                    <Icon size={20} className="meals-options-link-icon" aria-hidden />
                    <span className="meals-options-link-text">
                      <span className="meals-options-link-label">{label}</span>
                      <span className="meals-options-link-desc">{description}</span>
                    </span>
                    <ChevronRight size={18} className="meals-options-link-chevron" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  )
}
