import { ChevronRight } from 'lucide-react'

export function MealFeedbackEntryRow({
  ratedCount = 0,
  totalCount = 0,
  onOpen,
  disabled = false,
  hint,
}) {
  const progressLabel =
    totalCount > 0 ? `${ratedCount}/${totalCount} rated` : null

  return (
    <div className="meal-feedback-entry-wrap">
      <button
        type="button"
        className="meal-feedback-entry-row"
        onClick={onOpen}
        disabled={disabled}
        aria-haspopup="dialog"
      >
        <span className="meal-feedback-entry-label">Reviews &amp; feedback</span>
        {progressLabel && (
          <span className="meal-feedback-entry-progress">{progressLabel}</span>
        )}
        <ChevronRight size={18} className="meal-feedback-entry-chevron" aria-hidden />
      </button>
      {hint && <p className="meal-feedback-entry-hint muted">{hint}</p>}
    </div>
  )
}
