import { useEffect, useRef } from 'react'

/**
 * Generic horizontal chip strip for dates, weeks, or any selectable items.
 */
export function MobileDayStrip({
  items = [],
  selectedId,
  onSelect,
  ariaLabel = 'Select item',
  renderChip,
  trailing,
}) {
  const chipRefs = useRef({})

  useEffect(() => {
    if (!selectedId) return
    const el = chipRefs.current[selectedId]
    if (el) {
      el.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedId, items.length])

  if (items.length === 0 && !trailing) return null

  return (
    <div className="mobile-day-strip-wrap">
      <div className="mobile-day-strip" role="tablist" aria-label={ariaLabel}>
        {items.map((item) => {
          const isSelected = item.id === selectedId
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) chipRefs.current[item.id] = node
              }}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={item.ariaLabel ?? item.label}
              className={[
                'mobile-day-chip',
                isSelected ? 'is-selected' : '',
                item.isToday ? 'is-today' : '',
                item.className ?? '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(item.id)}
            >
              {renderChip ? renderChip(item, isSelected) : item.label}
            </button>
          )
        })}
      </div>
      {trailing}
    </div>
  )
}
