import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import { MEAL_SLOTS } from '../../../config/menuItems'
import {
  REVIEW_RATINGS,
  REVIEW_RATING_LABELS,
} from '../../../utils/menuReviewUtils'
import { PlanningFeedbackSheet } from './PlanningFeedbackSheet'

function summarizeHistoryRatings(history) {
  let good = 0
  let okay = 0
  let bad = 0
  for (const occ of history ?? []) {
    for (const r of occ.reviews ?? []) {
      if (r.rating === REVIEW_RATINGS.GOOD) good += 1
      else if (r.rating === REVIEW_RATINGS.OKAY) okay += 1
      else if (r.rating === REVIEW_RATINGS.BAD) bad += 1
    }
  }
  return { good, okay, bad, total: good + okay + bad }
}

export function PlanningPreviewSheet({
  open,
  onClose,
  draft,
  catalog,
  itemHistoryById = {},
}) {
  const [feedbackItem, setFeedbackItem] = useState(null)

  const slots = []
  if (draft?.hasMorning && draft.morning) {
    slots.push({ key: 'morning', label: MEAL_SLOTS.morning.labelEn, data: draft.morning })
  }
  if (draft?.hasEvening && draft.evening) {
    slots.push({ key: 'evening', label: MEAL_SLOTS.evening.labelEn, data: draft.evening })
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Preview & feedback"
        subtitle="Selected dishes and review history"
      >
        {slots.length === 0 ? (
          <p className="muted">Select dishes to preview feedback history.</p>
        ) : (
          <div className="admin-mobile-plan-preview-sheet">
            {slots.map(({ key, label, data }) => (
              <section key={key} className={`admin-mobile-plan-preview-slot slot-panel-${key}`}>
                <h4 className="admin-mobile-plan-preview-slot-title">{label}</h4>
                {catalog.categories.map((cat) => {
                  const ids = data[cat.id] ?? []
                  if (ids.length === 0) return null
                  return (
                    <div key={cat.id} className="admin-mobile-plan-preview-cat">
                      <p className="admin-mobile-plan-preview-cat-title muted">{cat.labelGu}</p>
                      <ul className="admin-mobile-plan-preview-items">
                        {ids.map((id) => {
                          const item = catalog.items.find((i) => i.id === id)
                          const history = itemHistoryById[id] ?? []
                          const counts = summarizeHistoryRatings(history)
                          return (
                            <li key={id}>
                              <button
                                type="button"
                                className="admin-mobile-plan-preview-item-btn"
                                disabled={history.length === 0}
                                onClick={() =>
                                  setFeedbackItem({
                                    item: item ?? { id, gu: id },
                                    history,
                                  })
                                }
                              >
                                <span className="admin-mobile-plan-preview-item-name">
                                  {item?.gu ?? id}
                                </span>
                                {history.length === 0 ? (
                                  <span className="muted">No history</span>
                                ) : counts.total === 0 ? (
                                  <span className="muted">No ratings yet</span>
                                ) : (
                                  <span className="admin-mobile-plan-preview-pills">
                                    <span className="review-count-pill rating-good">
                                      Good {counts.good}
                                    </span>
                                    <span className="review-count-pill rating-bad">
                                      Bad {counts.bad}
                                    </span>
                                  </span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        )}
      </Modal>

      <PlanningFeedbackSheet
        open={Boolean(feedbackItem)}
        onClose={() => setFeedbackItem(null)}
        item={feedbackItem?.item}
        history={feedbackItem?.history ?? []}
      />
    </>
  )
}
