import { useEffect, useMemo, useState } from 'react'
import { Package } from 'lucide-react'
import { StockQtySlider } from './StockQtySlider'
import { STOCK_UNIT_LABELS } from '../../config/constants'
import { formatStockQty } from '../../services/stockService'

/**
 * Planner sets how much of each linked stock item this meal will use.
 */
export function MenuPlanStockPanel({
  slotKey,
  slotLabel,
  linkedItems,
  usageMap,
  onChangeUsage,
}) {
  if (!linkedItems?.length) {
    return (
      <p className="muted stock-plan-empty">
        No stock items linked to the selected {slotLabel.toLowerCase()} dishes.
      </p>
    )
  }

  return (
    <div className="stock-plan-panel">
      <h4 className="stock-plan-panel-title">
        <Package size={16} aria-hidden /> Stock to consume — {slotLabel}
      </h4>
      <ul className="stock-plan-list">
        {linkedItems.map((item) => {
          const consume = Number(usageMap?.[item.id]) || 0
          const projected = Math.max(0, item.quantity - consume)
          const warn = consume > item.quantity
          return (
            <li key={item.id} className="stock-plan-row">
              <div className="stock-plan-row-head">
                <strong>{item.name}</strong>
                <span className="muted">
                  Now {formatStockQty(item.quantity, item.unit)}{' '}
                  {STOCK_UNIT_LABELS[item.unit]}
                  {' → '}
                  after {formatStockQty(projected, item.unit)}{' '}
                  {STOCK_UNIT_LABELS[item.unit]}
                </span>
              </div>
              <StockQtySlider
                value={consume}
                onChange={(v) => onChangeUsage(item.id, v)}
                needPerIteration={item.needPerIteration}
                unit={item.unit}
                label="Use this meal"
              />
              {warn && (
                <p className="form-error stock-plan-warn">
                  This uses more than current stock (will floor at 0).
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function useLinkedStockForSlots({
  hasMorning,
  hasEvening,
  morning,
  evening,
  stockItems,
}) {
  return useMemo(() => {
    const pickIds = (slot) => {
      if (!slot) return []
      const ids = []
      for (const arr of Object.values(slot)) {
        if (Array.isArray(arr)) ids.push(...arr)
      }
      return ids
    }
    const morningIds = hasMorning ? pickIds(morning) : []
    const eveningIds = hasEvening ? pickIds(evening) : []
    const linkFilter = (menuIds) => {
      const set = new Set(menuIds)
      return (stockItems || []).filter((item) =>
        (item.menuItemIds || []).some((id) => set.has(id)),
      )
    }
    return {
      morningLinked: linkFilter(morningIds),
      eveningLinked: linkFilter(eveningIds),
    }
  }, [hasMorning, hasEvening, morning, evening, stockItems])
}

/** Keep usage maps in sync when date / initial menu changes. */
export function useStockUsageState(initialMenu, dateId) {
  const [stockUsage, setStockUsage] = useState(() => ({
    morning: { ...(initialMenu?.stockUsage?.morning || {}) },
    evening: { ...(initialMenu?.stockUsage?.evening || {}) },
  }))

  useEffect(() => {
    setStockUsage({
      morning: { ...(initialMenu?.stockUsage?.morning || {}) },
      evening: { ...(initialMenu?.stockUsage?.evening || {}) },
    })
  }, [dateId, initialMenu])

  const setSlotUsage = (slot, itemId, qty) => {
    setStockUsage((prev) => {
      const nextSlot = { ...(prev[slot] || {}) }
      const n = Number(qty) || 0
      if (n <= 0) delete nextSlot[itemId]
      else nextSlot[itemId] = n
      return { ...prev, [slot]: nextSlot }
    })
  }

  return { stockUsage, setStockUsage, setSlotUsage }
}
