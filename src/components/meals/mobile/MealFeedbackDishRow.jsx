import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  REVIEW_RATING_LABELS,
  hasReviewContent,
  isReviewWindowOpen,
  normalizeReviewRating,
} from '../../../utils/menuReviewUtils'
import { saveMealItemReview } from '../../../services/participationService'
import { useToast } from '../../../contexts/ToastContext'
import { OthersItemReviews } from '../../MealItemReview'
import { MobileRatingChips } from './MobileRatingChips'
import { MobileReviewNoteField } from './MobileReviewNoteField'

function CollapsedRatingLabel({ review }) {
  const rating = normalizeReviewRating(review?.rating)
  if (rating) {
    return (
      <span className={`meal-feedback-dish-rating rating-${rating}`}>
        {REVIEW_RATING_LABELS[rating]}
      </span>
    )
  }
  return <span className="meal-feedback-dish-rating is-unrated">Not rated</span>
}

export function MealFeedbackDishRow({
  item,
  expanded,
  onToggle,
  canEdit,
  userId,
  dateId,
  slot,
  displayName,
  review,
  othersReviews = [],
  showOthers,
  currentUserId,
}) {
  const toast = useToast()
  const windowOpen = isReviewWindowOpen(dateId)
  const [rating, setRating] = useState(() => normalizeReviewRating(review?.rating))
  const [text, setText] = useState(() => review?.text ?? '')
  const [saving, setSaving] = useState(false)
  const [baseline, setBaseline] = useState(() => ({
    rating: normalizeReviewRating(review?.rating),
    text: review?.text ?? '',
  }))

  const othersCount = othersReviews.filter(
    (r) => r.userId !== currentUserId && hasReviewContent(r),
  ).length

  const persist = async (nextRating, nextText) => {
    if (!windowOpen || !canEdit) return
    setSaving(true)
    try {
      await saveMealItemReview({
        userId,
        dateId,
        slot,
        itemId: item.id,
        rating: nextRating,
        text: nextText,
        displayName,
      })
      setBaseline({ rating: nextRating, text: nextText })
    } catch (err) {
      toast.error(err.message)
      setRating(baseline.rating)
      setText(baseline.text)
    } finally {
      setSaving(false)
    }
  }

  const handleRatingChange = (nextRating) => {
    setRating(nextRating)
    persist(nextRating, text)
  }

  const handleNoteBlur = () => {
    if (
      text.trim() === (baseline.text ?? '').trim() &&
      normalizeReviewRating(baseline.rating) === rating
    ) {
      return
    }
    persist(rating, text)
  }

  const showEditor = canEdit && windowOpen
  const showReadonlyOwn =
    canEdit && !windowOpen && hasReviewContent({ rating, text })

  return (
    <div className={`meal-feedback-dish-row${expanded ? ' is-expanded' : ''}`}>
      <button
        type="button"
        className="meal-feedback-dish-row-head"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <ChevronDown
          size={18}
          className="meal-feedback-dish-chevron"
          aria-hidden
        />
        <span className="meal-feedback-dish-name">{item.gu}</span>
        <span className="meal-feedback-dish-meta">
          {canEdit ? (
            <CollapsedRatingLabel review={{ rating, text }} />
          ) : null}
          {showOthers && othersCount > 0 && (
            <span className="meal-feedback-dish-others-badge">{othersCount}</span>
          )}
        </span>
      </button>

      {expanded && (
        <div className="meal-feedback-dish-body">
          {showEditor && (
            <>
              <MobileRatingChips
                value={rating}
                onChange={handleRatingChange}
                disabled={saving}
              />
              <MobileReviewNoteField
                value={text}
                onChange={setText}
                onBlur={handleNoteBlur}
                disabled={saving}
              />
            </>
          )}

          {showReadonlyOwn && (
            <div className="item-review-readonly meal-feedback-dish-readonly">
              <CollapsedRatingLabel review={{ rating, text }} />
              {text.trim() && (
                <p className="review-text-readonly">{text.trim()}</p>
              )}
              <p className="review-window-ended muted">Review period ended</p>
            </div>
          )}

          {!canEdit && !showOthers && (
            <p className="muted meal-feedback-dish-hint">
              Vote on this meal to leave your own feedback.
            </p>
          )}

          {showOthers && (
            <div className="review-others-wrap meal-feedback-dish-others">
              <span className="review-others-label">
                Everyone&apos;s feedback
                {othersCount > 0 ? ` (${othersCount})` : ''}
              </span>
              <OthersItemReviews
                reviews={othersReviews}
                currentUserId={currentUserId}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
