import { useEffect, useRef } from 'react'
import { MobileFilterBar } from '../../mobile/MobileFilterBar'
import { triggerSelectionHaptic } from '../../../utils/haptics'

export function AdminCategoryStrip({
  items,
  selectedId,
  onSelect,
  className = '',
}) {
  const selectedRef = useRef(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [selectedId])

  if (!items?.length) return null

  return (
    <MobileFilterBar className={`admin-mobile-category-strip ${className}`.trim()}>
      <div className="admin-mobile-category-scroll" role="tablist" aria-label="Categories">
        {items.map((item) => {
          const selected = item.id === selectedId
          return (
            <button
              key={item.id}
              ref={selected ? selectedRef : null}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`admin-mobile-category-chip${selected ? ' is-selected' : ''}`}
              onClick={() => {
                triggerSelectionHaptic()
                onSelect(item.id)
              }}
            >
              {item.label}
              {item.count != null && (
                <span className="admin-mobile-category-count">{item.count}</span>
              )}
            </button>
          )
        })}
      </div>
    </MobileFilterBar>
  )
}
