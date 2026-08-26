import { REVIEW_RATING_LABELS } from '../../utils/menuReviewUtils'
import { formatDisplayDateGu } from '../../utils/mealDateUtils'

function SlotLabel({ slot }) {
  return slot === 'morning' ? 'Morning' : 'Evening'
}

function RatingBadge({ rating }) {
  if (!rating) return null
  return (
    <span className={`review-rating-badge rating-${rating}`}>
      {REVIEW_RATING_LABELS[rating] ?? rating}
    </span>
  )
}

export function AnalyticsDishDetail({
  row,
  history,
  historyMode,
  onHistoryModeChange,
  showTitle = true,
}) {
  if (!row) {
    return (
      <p className="muted">
        Select an item in the list to see cook history and feedback.
      </p>
    )
  }

  return (
    <>
      {showTitle && (
        <>
          <h3>{row.gu}</h3>
          {row.en ? <p className="muted">{row.en}</p> : null}
          <p className="muted">{row.categoryLabel}</p>
        </>
      )}
      <div className="analytics-detail-summary">
        <span>
          <strong>{row.timesMade}</strong> times made
        </span>
        <span className="analytics-rating-summary">
          <span className="review-count-pill rating-good">{row.good}</span>
          <span className="review-count-pill rating-okay">{row.okay}</span>
          <span className="review-count-pill rating-bad">{row.bad}</span>
        </span>
      </div>

      <div className="analytics-history-modes" role="group" aria-label="History mode">
        <button
          type="button"
          className={`btn btn-sm ${historyMode === 'last5' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onHistoryModeChange('last5')}
        >
          Last 5 cooks
        </button>
        <button
          type="button"
          className={`btn btn-sm ${historyMode === 'range' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onHistoryModeChange('range')}
        >
          All in range
        </button>
      </div>

      {history.length === 0 ? (
        <p className="muted">
          {row.timesMade === 0
            ? 'This item was never planned in the selected window.'
            : 'No cook occasions found.'}
        </p>
      ) : (
        <ul className="analytics-history-list">
          {history.map((occ) => (
            <li key={`${occ.date}-${occ.slot}`} className="analytics-history-item">
              <details className="analytics-history-details" open={occ.reviews.length > 0}>
                <summary className="analytics-history-head">
                  <strong>{formatDisplayDateGu(occ.date)}</strong>
                  <span className="muted">
                    <SlotLabel slot={occ.slot} />
                    {occ.reviews.length > 0
                      ? ` · ${occ.reviews.length} review${occ.reviews.length === 1 ? '' : 's'}`
                      : ''}
                  </span>
                </summary>
                {occ.reviews.length === 0 ? (
                  <p className="muted analytics-history-empty">No reviews for this meal.</p>
                ) : (
                  <ul className="analytics-review-list">
                    {occ.reviews.map((rev) => (
                      <li key={`${rev.userId}-${occ.date}-${occ.slot}`}>
                        <div className="analytics-review-meta">
                          <span>{rev.displayName}</span>
                          <RatingBadge rating={rev.rating} />
                        </div>
                        {rev.text ? (
                          <p className="analytics-review-text">{rev.text}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
