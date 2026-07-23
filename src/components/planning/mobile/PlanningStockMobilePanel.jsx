import { Package } from 'lucide-react'
import { AdminQtyField } from '../../admin/mobile/AdminQtyField'
import { STOCK_UNIT_LABELS } from '../../../config/constants'
import { formatStockQty } from '../../../services/stockService'

export function PlanningStockMobilePanel({
  slotLabel,
  linkedItems,
  usageMap,
  onChangeUsage,
}) {
  if (!linkedItems?.length) {
    return (
      <p className="muted admin-mobile-plan-stock-empty">
        No stock items linked to the selected {slotLabel.toLowerCase()} dishes.
      </p>
    )
  }

  return (
    <div className="admin-mobile-plan-stock">
      <h4 className="admin-mobile-plan-stock-title">
        <Package size={16} aria-hidden /> Stock — {slotLabel}
      </h4>
      <ul className="admin-mobile-plan-stock-list">
        {linkedItems.map((item) => {
          const consume = Number(usageMap?.[item.id]) || 0
          const projected = Math.max(0, item.quantity - consume)
          const warn = consume > item.quantity
          const unitLabel = STOCK_UNIT_LABELS[item.unit] || item.unit

          return (
            <li key={item.id} className="admin-mobile-plan-stock-row rail-card">
              <div className="admin-mobile-plan-stock-row-head">
                <strong>{item.name}</strong>
                <span className="muted">
                  Now {formatStockQty(item.quantity, item.unit)} {unitLabel}
                </span>
                <span className="muted">
                  After {formatStockQty(projected, item.unit)} {unitLabel}
                </span>
              </div>
              <AdminQtyField
                label="Use this meal"
                unit={item.unit}
                value={consume}
                onChange={(v) => onChangeUsage(item.id, v)}
                hasError={warn}
              />
              {warn && (
                <p className="form-error">Uses more than current stock (will floor at 0).</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
