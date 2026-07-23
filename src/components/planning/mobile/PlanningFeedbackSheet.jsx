import { Modal } from '../../ui/Modal'
import { MEAL_SLOTS } from '../../../config/menuItems'
import { formatDisplayDateGu } from '../../../utils/mealDateUtils'
import { REVIEW_RATING_LABELS } from '../../../utils/menuReviewUtils'

export function PlanningFeedbackSheet({ open, onClose, item, history = [] }) {
  if (!item) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item.gu}
      subtitle={`Last ${history.length || 0} cook${history.length === 1 ? '' : 's'} — person reviews`}
    >
      {history.length === 0 ? (
        <p className="muted">No past cook history for this dish yet.</p>
      ) : (
        <ul className="admin-mobile-plan-feedback-list">
          {history.map((occ) => (
            <li key={`${occ.date}-${occ.slot}`} className="admin-mobile-plan-feedback-occ">
              <h4 className="admin-mobile-plan-feedback-date">
                {formatDisplayDateGu(occ.date)} ·{' '}
                {MEAL_SLOTS[occ.slot]?.labelEn ?? occ.slot}
              </h4>
              {occ.reviews.length === 0 ? (
                <p className="muted">No reviews that day.</p>
              ) : (
                <ul className="admin-mobile-plan-feedback-reviews">
                  {occ.reviews.map((r) => (
                    <li key={r.userId} className="admin-mobile-plan-feedback-person">
                      <div className="admin-mobile-plan-feedback-who-row">
                        <strong>{r.displayName}</strong>
                        {r.rating && (
                          <span className={`review-rating-badge rating-${r.rating}`}>
                            {REVIEW_RATING_LABELS[r.rating]}
                          </span>
                        )}
                      </div>
                      {r.text ? <p className="muted">{r.text}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
