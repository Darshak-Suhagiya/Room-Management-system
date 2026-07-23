import { MobileQtyStepper } from '../../meals/mobile/MobileQtyStepper'
import { STOCK_UNIT_LABELS } from '../../../config/constants'
import { formatStockQty } from '../../../services/stockService'

/**
 * Unit-aware quantity stepper for admin/stock flows on mobile.
 */
export function AdminQtyField({
  value,
  onChange,
  label,
  unit,
  disabled = false,
  hasError = false,
  hint,
  step = 0.5,
  min = 0,
}) {
  const unitLabel = unit ? STOCK_UNIT_LABELS[unit] || unit : ''
  const displayHint =
    hint ??
    (unitLabel ? `Unit: ${unitLabel}` : undefined)

  return (
    <div className={`admin-mobile-qty-field${hasError ? ' is-error' : ''}`}>
      {label && <span className="admin-mobile-qty-label">{label}</span>}
      {displayHint && <span className="admin-mobile-qty-hint muted">{displayHint}</span>}
      <MobileQtyStepper
        value={value}
        onChange={onChange}
        disabled={disabled}
        hasError={hasError}
        step={step}
        min={min}
      />
      {unit && (
        <span className="admin-mobile-qty-readout muted">
          {formatStockQty(value, unit)} {unitLabel}
        </span>
      )}
    </div>
  )
}
