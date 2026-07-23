import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { StockQtySlider } from '../StockQtySlider'
import { STOCK_UNIT_LABELS } from '../../../config/constants'
import { formatStockQty } from '../../../services/stockService'
import { triggerSelectionHaptic } from '../../../utils/haptics'

export function ShoppingLineMobileRow({ line, canEdit, open, busy, onCheck }) {
  const [qty, setQty] = useState(() => Number(formatStockQty(line.qty, line.unit)) || 0)
  const unitLabel = STOCK_UNIT_LABELS[line.unit] || line.unit

  useEffect(() => {
    setQty(Number(formatStockQty(line.qty, line.unit)) || 0)
  }, [line.qty, line.itemId, line.unit])

  if (line.checked || !open || !canEdit) {
    return (
      <p className="admin-mobile-shop-line-done muted">
        {line.checked ? (
          <>
            <Check size={14} aria-hidden /> Bought {formatStockQty(line.qty, line.unit)}{' '}
            {unitLabel}
          </>
        ) : (
          <>
            {formatStockQty(line.qty, line.unit)} {unitLabel}
          </>
        )}
      </p>
    )
  }

  return (
    <div className="admin-mobile-shop-line-editor">
      <div className="shopping-meta-chips" aria-label="Stock hints">
        <span className="shopping-meta-chip">
          In stock {formatStockQty(line.currentQty, line.unit)}
        </span>
        <span className="shopping-meta-chip">
          Need {formatStockQty(line.needPerIteration, line.unit)}
        </span>
        <span className="shopping-meta-chip is-suggest">
          Suggest {formatStockQty(line.suggestedQty, line.unit)}
        </span>
      </div>
      <StockQtySlider
        variant="mobile"
        label="Buy amount"
        value={qty}
        onChange={setQty}
        needPerIteration={line.needPerIteration}
        unit={line.unit}
        disabled={busy}
      />
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={busy}
        onClick={() => {
          triggerSelectionHaptic()
          onCheck(line.itemId, qty)
        }}
      >
        <Check size={16} aria-hidden /> Mark bought
      </button>
    </div>
  )
}
