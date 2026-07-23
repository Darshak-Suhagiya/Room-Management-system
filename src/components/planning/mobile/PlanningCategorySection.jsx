import { getPlanningViewSections } from '../../../utils/planningViewGroups'
import { PlanningDishToggleRow } from './PlanningDishToggleRow'

export function PlanningCategorySection({
  category,
  items,
  selected,
  onToggle,
  cookCounts,
  sentimentByItem,
  defaultOpen = false,
}) {
  if (items.length === 0) return null

  const sections = getPlanningViewSections(category, items)
  const selectedCount = (selected ?? []).length

  return (
    <details className="admin-mobile-plan-category" open={defaultOpen || selectedCount > 0}>
      <summary className="admin-mobile-plan-category-summary">
        <span>{category.labelGu}</span>
        {selectedCount > 0 && (
          <span className="admin-mobile-plan-category-count">{selectedCount}</span>
        )}
      </summary>
      <div className="admin-mobile-plan-category-body">
        {sections.map((section) => (
          <div key={section.id ?? 'flat'} className="admin-mobile-plan-group">
            {section.label && (
              <p className="admin-mobile-plan-group-title muted">{section.label}</p>
            )}
            <div className="admin-mobile-plan-dish-list">
              {section.items.map((item) => (
                <PlanningDishToggleRow
                  key={item.id}
                  item={item}
                  selected={(selected ?? []).includes(item.id)}
                  onToggle={onToggle}
                  cookCount={cookCounts[item.id] ?? 0}
                  sentimentByItem={sentimentByItem}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}
