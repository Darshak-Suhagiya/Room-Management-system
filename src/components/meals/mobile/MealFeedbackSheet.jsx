import { useMemo, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { getReviewableItems } from '../../../utils/menuVoteUtils'
import {
  collectSlotItemReviews,
  getItemReview,
  hasReviewContent,
} from '../../../utils/menuReviewUtils'
import { MealFeedbackDishRow } from './MealFeedbackDishRow'

export function MealFeedbackSheet({
  open,
  onClose,
  slotLabel,
  canReview,
  canLeaveOwnReview,
  showOthersFeedback,
  onToggleOthersFeedback,
  plannedItems,
  participation,
  othersParticipations,
  userId,
  dateId,
  slot,
  displayName,
}) {
  const [expandedDishId, setExpandedDishId] = useState(null)

  const votes = participation?.votes ?? {}
  const dishItems = useMemo(() => {
    if (canLeaveOwnReview) {
      return getReviewableItems(plannedItems, votes)
    }
    if (showOthersFeedback) {
      return plannedItems
    }
    return []
  }, [canLeaveOwnReview, showOthersFeedback, plannedItems, votes])

  const handleToggleDish = (itemId) => {
    setExpandedDishId((prev) => (prev === itemId ? null : itemId))
  }

  const handleClose = () => {
    setExpandedDishId(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`${slotLabel} · Reviews`}
      subtitle={
        canLeaveOwnReview
          ? 'Rate dishes you ate today'
          : showOthersFeedback
            ? 'Browse feedback from other members'
            : 'Complete your vote to leave feedback'
      }
    >
      <div className="meal-feedback-sheet">
        {canReview && (
          <label className="meal-feedback-sheet-toggle feedback-switch">
            <span className="feedback-switch-label">Show everyone&apos;s feedback</span>
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
        )}

        {dishItems.length === 0 ? (
          <p className="meal-feedback-sheet-empty muted">
            {canLeaveOwnReview
              ? 'No dishes to review — mark what you ate when voting.'
              : showOthersFeedback
                ? 'No dishes planned for this meal.'
                : 'Turn on “Show everyone’s feedback” or complete your vote first.'}
          </p>
        ) : (
          <ul className="meal-feedback-dish-list">
            {dishItems.map((item) => {
              const ownReview = getItemReview(participation?.reviews, item.id)
              const others = collectSlotItemReviews(othersParticipations, item.id)
              return (
                <li key={item.id}>
                  <MealFeedbackDishRow
                    key={`${item.id}-${ownReview?.updatedAt ?? 'new'}`}
                    item={item}
                    expanded={expandedDishId === item.id}
                    onToggle={() => handleToggleDish(item.id)}
                    canEdit={canLeaveOwnReview}
                    userId={userId}
                    dateId={dateId}
                    slot={slot}
                    displayName={displayName}
                    review={ownReview}
                    othersReviews={others}
                    showOthers={showOthersFeedback}
                    currentUserId={userId}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}

/** Count rated reviewable dishes for entry row progress. */
export function getFeedbackProgress(plannedItems, participation) {
  const votes = participation?.votes ?? {}
  const reviewable = getReviewableItems(plannedItems, votes)
  const rated = reviewable.filter((item) =>
    hasReviewContent(getItemReview(participation?.reviews, item.id)),
  ).length
  return { ratedCount: rated, totalCount: reviewable.length }
}
