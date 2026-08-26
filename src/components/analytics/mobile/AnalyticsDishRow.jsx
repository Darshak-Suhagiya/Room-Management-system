import { ChevronRight } from 'lucide-react'

export function AnalyticsDishRow({ row, onClick }) {
  return (
    <button type="button" className="analytics-mobile-dish-row" onClick={onClick}>
      <span className="analytics-mobile-dish-row-main">
        <strong>{row.gu}</strong>
        <span className="muted">{row.categoryLabel}</span>
      </span>
      <span className="analytics-mobile-dish-row-meta">
        <span className="analytics-mobile-made">Made {row.timesMade}</span>
        <span className="analytics-rating-summary">
          <span className="review-count-pill rating-good">{row.good}</span>
          <span className="review-count-pill rating-okay">{row.okay}</span>
          <span className="review-count-pill rating-bad">{row.bad}</span>
        </span>
      </span>
      <ChevronRight size={18} className="analytics-mobile-chevron" aria-hidden />
    </button>
  )
}
