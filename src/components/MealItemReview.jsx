import { useState } from 'react'
import {
  REVIEW_RATINGS,
  REVIEW_RATING_LABELS,
  hasReviewContent,
  isReviewWindowOpen,
  normalizeReviewRating,
} from '../utils/menuReviewUtils'
import { saveMealItemReview } from '../services/participationService'
import { useToast } from '../contexts/ToastContext'

const RATING_OPTIONS = [
  { value: REVIEW_RATINGS.GOOD, label: REVIEW_RATING_LABELS[REVIEW_RATINGS.GOOD] },
  { value: REVIEW_RATINGS.OKAY, label: REVIEW_RATING_LABELS[REVIEW_RATINGS.OKAY] },
  { value: REVIEW_RATINGS.BAD, label: REVIEW_RATING_LABELS[REVIEW_RATINGS.BAD] },
  { value: null, label: 'None' },
]

function RatingBadge({ rating }) {
  const normalized = normalizeReviewRating(rating)
  if (!normalized) return null
  return (
    <span className={`review-rating-badge rating-${normalized}`}>
      {REVIEW_RATING_LABELS[normalized]}
    </span>
  )
}

export function MealItemReviewEditor({
  userId,
  dateId,
  slot,
  itemId,
  displayName,
  review,
  disabled = false,
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

  const persist = async (nextRating, nextText) => {
    if (!windowOpen || disabled) return
    setSaving(true)
    try {
      await saveMealItemReview({
        userId,
        dateId,
        slot,
        itemId,
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

  if (!windowOpen) {
    if (!hasReviewContent(review)) {
      return (
        <p className="review-window-ended muted">Review period ended</p>
      )
    }
    return (
      <div className="item-review-readonly">
        <RatingBadge rating={review.rating} />
        {(review.text ?? '').trim() && (
          <p className="review-text-readonly">{review.text.trim()}</p>
        )}
        <p className="review-window-ended muted">Review period ended</p>
      </div>
    )
  }

  return (
    <div className="item-review-editor">
      <div className="segmented-control review-rating-seg" role="group" aria-label="Item rating">
        {RATING_OPTIONS.map((opt) => {
          const active =
            opt.value === null ? rating == null : rating === opt.value
          return (
            <button
              key={opt.label}
              type="button"
              className={`segmented-btn ${active ? 'is-active' : ''} ${
                opt.value ? `rating-${opt.value}` : ''
              }`}
              disabled={saving || disabled}
              onClick={() => {
                setRating(opt.value)
                persist(opt.value, text)
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      <label className="field-stack review-text-field">
        <span className="field-stack-label">Written review (optional)</span>
        <textarea
          className="app-textarea"
          rows={2}
          value={text}
          disabled={saving || disabled}
          placeholder="Share anything about this dish…"
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (
              text.trim() === (baseline.text ?? '').trim() &&
              normalizeReviewRating(baseline.rating) === rating
            ) {
              return
            }
            persist(rating, text)
          }}
        />
      </label>
    </div>
  )
}

export function OthersItemReviews({ reviews, currentUserId }) {
  const others = (reviews ?? []).filter(
    (r) => r.userId !== currentUserId && hasReviewContent(r),
  )
  if (others.length === 0) {
    return <p className="muted review-others-empty">No other feedback yet.</p>
  }
  return (
    <ul className="review-others-list">
      {others.map((r) => (
        <li key={r.userId}>
          <div className="review-others-head">
            <strong>{r.displayName || 'Member'}</strong>
            <RatingBadge rating={r.rating} />
          </div>
          {(r.text ?? '').trim() && (
            <p className="review-others-text">{r.text.trim()}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
