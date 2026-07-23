import { ChevronRight, UtensilsCrossed } from 'lucide-react'
import { triggerSelectionHaptic } from '../../../utils/haptics'

function countSelectedDishes(draft) {
  let count = 0
  if (draft?.hasMorning && draft.morning) {
    for (const ids of Object.values(draft.morning)) {
      if (Array.isArray(ids)) count += ids.length
    }
  }
  if (draft?.hasEvening && draft.evening) {
    for (const ids of Object.values(draft.evening)) {
      if (Array.isArray(ids)) count += ids.length
    }
  }
  return count
}

export function PlanningPreviewEntryRow({ draft, itemHistoryById, onOpen }) {
  const dishCount = countSelectedDishes(draft)
  const withFeedback = Object.keys(itemHistoryById ?? {}).filter(
    (id) => (itemHistoryById[id] ?? []).length > 0,
  ).length

  const subtitle =
    dishCount === 0
      ? 'Select dishes to see feedback history'
      : `${dishCount} dish${dishCount === 1 ? '' : 'es'}${withFeedback > 0 ? ` · ${withFeedback} with feedback` : ''}`

  return (
    <button
      type="button"
      className="admin-mobile-plan-preview-entry"
      onClick={() => {
        triggerSelectionHaptic()
        onOpen()
      }}
    >
      <span className="admin-mobile-plan-preview-entry-icon" aria-hidden>
        <UtensilsCrossed size={20} />
      </span>
      <span className="admin-mobile-plan-preview-entry-text">
        <span className="admin-mobile-plan-preview-entry-title">Preview & feedback</span>
        <span className="muted">{subtitle}</span>
      </span>
      <ChevronRight size={18} className="admin-mobile-row-chevron" aria-hidden />
    </button>
  )
}
