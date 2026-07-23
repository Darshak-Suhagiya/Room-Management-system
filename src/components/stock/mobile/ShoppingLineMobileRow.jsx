import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Ban } from 'lucide-react'
import { StockQtySlider } from '../StockQtySlider'
import { STOCK_UNIT_LABELS } from '../../../config/constants'
import { formatStockQty } from '../../../services/stockService'
import { triggerSelectionHaptic } from '../../../utils/haptics'

export function ShoppingLineMobileRow({
  line,
  canEdit,
  open,
  busy,
  expanded = false,
  onToggleExpand,
  onCheck,
  onUncheck,
  onMarkUnavailable,
  onUnmarkUnavailable,
}) {
  const [qty, setQty] = useState(() => Number(formatStockQty(line.qty, line.unit)) || 0)
  const unitLabel = STOCK_UNIT_LABELS[line.unit] || line.unit
  const qtyLabel = `${formatStockQty(line.qty, line.unit)} ${unitLabel}`

  useEffect(() => {
    setQty(Number(formatStockQty(line.qty, line.unit)) || 0)
  }, [line.qty, line.itemId, line.unit])

  if (line.checked) {
    return (
      <div className="admin-mobile-shop-line rail-card is-bought">
        <div className="admin-mobile-shop-line-main">
          <span className="admin-mobile-shop-line-name">
            <Check size={14} aria-hidden /> {line.name}
          </span>
          <span className="admin-mobile-shop-line-meta">Bought {qtyLabel}</span>
        </div>
        {canEdit && open && onUncheck && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={busy}
            onClick={() => {
              triggerSelectionHaptic()
              onUncheck(line.itemId)
            }}
          >
            Not bought
          </button>
        )}
      </div>
    )
  }

  if (line.unavailable) {
    return (
      <div className="admin-mobile-shop-line rail-card is-unavailable">
        <div className="admin-mobile-shop-line-main">
          <span className="admin-mobile-shop-line-name is-struck">
            <Ban size={14} aria-hidden /> {line.name}
          </span>
          <span className="admin-mobile-shop-line-meta">Not available · {qtyLabel}</span>
        </div>
        {canEdit && open && onUnmarkUnavailable && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={busy}
            onClick={() => {
              triggerSelectionHaptic()
              onUnmarkUnavailable(line.itemId)
            }}
          >
            Undo
          </button>
        )}
      </div>
    )
  }

  if (!open || !canEdit) {
    return (
      <div className="admin-mobile-shop-line rail-card is-readonly">
        <div className="admin-mobile-shop-line-main">
          <span className="admin-mobile-shop-line-name">{line.name}</span>
          <span className="admin-mobile-shop-line-meta">{qtyLabel}</span>
        </div>
      </div>
    )
  }

  const Chevron = expanded ? ChevronDown : ChevronRight

  return (
    <div
      className={`admin-mobile-shop-line rail-card is-pending${expanded ? ' is-expanded' : ''}`}
    >
      <button
        type="button"
        className="admin-mobile-shop-line-toggle"
        disabled={busy}
        aria-expanded={expanded}
        onClick={() => {
          triggerSelectionHaptic()
          onToggleExpand?.(line.itemId)
        }}
      >
        <span className="admin-mobile-shop-line-main">
          <span className="admin-mobile-shop-line-name">{line.name}</span>
          <span className="admin-mobile-shop-line-meta">Buy {qtyLabel}</span>
        </span>
        <span className="admin-mobile-shop-line-qty-badge">{qtyLabel}</span>
        <Chevron size={18} className="admin-mobile-shop-line-chevron" aria-hidden />
      </button>

      {expanded && (
        <div className="admin-mobile-shop-line-editor is-compact">
          <StockQtySlider
            variant="mobile"
            label="Buy amount"
            value={qty}
            onChange={setQty}
            needPerIteration={line.needPerIteration}
            unit={line.unit}
            disabled={busy}
          />
          <div className="admin-mobile-shop-line-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => {
                triggerSelectionHaptic()
                onCheck?.(line.itemId, qty)
              }}
            >
              <Check size={16} aria-hidden /> Mark bought
            </button>
            {onMarkUnavailable && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => {
                  triggerSelectionHaptic()
                  onMarkUnavailable(line.itemId)
                }}
              >
                <Ban size={16} aria-hidden /> Not available
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
