import {
  REVIEW_RATINGS,
  sentimentIndicator,
} from '../../../utils/menuReviewUtils'
import { triggerSelectionHaptic } from '../../../utils/haptics'

export function PlanningDishToggleRow({
  item,
  selected,
  onToggle,
  cookCount = 0,
  sentimentByItem = {},
}) {
  const sentiment = sentimentIndicator(sentimentByItem[item.id])
  const ariaLabel = item.en ? `${item.gu}, ${item.en}` : item.gu

  return (
    <button
      type="button"
      className={`admin-mobile-plan-dish-row${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={() => {
        triggerSelectionHaptic()
        onToggle(item.id)
      }}
    >
      <span className="admin-mobile-plan-dish-name">{item.gu}</span>
      <span className="admin-mobile-plan-dish-meta">
        {cookCount > 0 && (
          <span className="admin-mobile-plan-cook-count">×{cookCount}</span>
        )}
        {sentiment === REVIEW_RATINGS.GOOD && (
          <span className="sentiment-dot sentiment-good" title="Mostly good reviews" />
        )}
        {sentiment === REVIEW_RATINGS.BAD && (
          <span className="sentiment-dot sentiment-bad" title="Mostly bad reviews" />
        )}
      </span>
      <span
        className={`admin-mobile-plan-dish-check${selected ? ' is-on' : ''}`}
        aria-hidden
      >
        {selected ? '✓' : ''}
      </span>
    </button>
  )
}
