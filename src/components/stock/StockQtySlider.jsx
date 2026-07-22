import { useCallback, useMemo } from 'react'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import { STOCK_UNIT_LABELS, STOCK_UNITS } from '../../config/constants'
import {
  formatStockQty,
  normalizeStockNumber,
  stockSliderBounds,
} from '../../services/stockService'

function roundForUnit(value, unit) {
  return normalizeStockNumber(value, unit)
}

/** Snap to need threshold when drag ends near the midpoint. */
export function snapStockQty(value, needPerIteration, unit, max) {
  const { mid } = stockSliderBounds(needPerIteration, unit)
  if (mid <= 0) return roundForUnit(value, unit)
  const step =
    unit === STOCK_UNITS.COUNT || unit === STOCK_UNITS.G ? 1 : 0.1
  const tolerance = Math.max(step * 3, mid * 0.06, max * 0.03)
  if (Math.abs(value - mid) <= tolerance) {
    return roundForUnit(mid, unit)
  }
  return roundForUnit(value, unit)
}

/**
 * Threshold slider: 0 → need (snap) → 2× need.
 * Only the need stop is marked on the track (start/end dots hidden).
 */
export function StockQtySlider({
  value,
  onChange,
  needPerIteration = 0,
  unit = STOCK_UNITS.KG,
  disabled = false,
  id,
  label,
  showThreshold = true,
  snapOnRelease = true,
}) {
  const { min, mid, max } = stockSliderBounds(needPerIteration, unit)
  const unitLabel = STOCK_UNIT_LABELS[unit] || unit
  const step =
    unit === STOCK_UNITS.COUNT || unit === STOCK_UNITS.G ? 1 : 0.05
  const num = roundForUnit(value, unit)
  const clamped = Math.min(max, Math.max(min, num))
  const atNeed = mid > 0 && Math.abs(clamped - mid) < step * 0.5
  const midPct = max > min ? ((mid - min) / (max - min)) * 100 : 50

  // Only mark the need stop — avoids cluttered 0/max marks colliding with the handle.
  const marks = useMemo(() => {
    if (!(mid > 0 && mid < max)) return {}
    return {
      [mid]: {
        label: (
          <span className="stock-slider-mark-need" title={`Need ${formatStockQty(mid, unit)} ${unitLabel}`}>
            need · {formatStockQty(mid, unit)}
          </span>
        ),
      },
    }
  }, [mid, max, unit, unitLabel])

  const handleChange = useCallback(
    (v) => {
      onChange(roundForUnit(v, unit))
    },
    [onChange, unit],
  )

  const handleAfterChange = useCallback(
    (v) => {
      if (!snapOnRelease) return
      const snapped = snapStockQty(v, needPerIteration, unit, max)
      if (snapped !== roundForUnit(v, unit)) onChange(snapped)
    },
    [snapOnRelease, needPerIteration, unit, max, onChange],
  )

  const handleInput = (e) => {
    const raw = e.target.value
    if (raw === '' || raw === '-') {
      onChange(0)
      return
    }
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    onChange(Math.max(0, Math.min(max, roundForUnit(n, unit))))
  }

  const jumpToNeed = () => {
    if (mid > 0) onChange(roundForUnit(mid, unit))
  }

  return (
    <div
      className={`stock-qty-slider ${disabled ? 'is-disabled' : ''} ${atNeed ? 'at-need' : ''}`}
    >
      {(label || showThreshold) && (
        <div className="stock-qty-slider-meta">
          {label && <span className="stock-qty-slider-label">{label}</span>}
          {showThreshold && mid > 0 && (
            <button
              type="button"
              className="stock-qty-need-btn"
              onClick={jumpToNeed}
              disabled={disabled}
              title="Set to need amount"
            >
              Need {formatStockQty(mid, unit)} {unitLabel}
            </button>
          )}
        </div>
      )}
      <div className="stock-qty-slider-row">
        <div className="stock-qty-slider-track-wrap">
          <div className="stock-qty-ends" aria-hidden>
            <span>0</span>
            <span>{formatStockQty(max, unit)}</span>
          </div>
          <Slider
            id={id}
            min={min}
            max={max}
            step={step}
            value={clamped}
            onChange={handleChange}
            onChangeComplete={handleAfterChange}
            disabled={disabled}
            marks={marks}
            included
            className="stock-rc-slider"
            ariaLabelForHandle={label || 'Quantity'}
            style={{ '--stock-mid-pct': `${midPct}%` }}
            dotStyle={(dotValue) =>
              mid > 0 && Math.abs(dotValue - mid) < step * 0.5
                ? undefined
                : { display: 'none' }
            }
          />
        </div>
        <div className="stock-qty-input-wrap">
          <input
            type="number"
            min={0}
            max={max}
            step={step}
            value={formatStockQty(num, unit)}
            onChange={handleInput}
            disabled={disabled}
            className="app-input stock-qty-number"
            aria-label={label || 'Quantity'}
          />
          <span className="stock-qty-unit">{unitLabel}</span>
        </div>
      </div>
    </div>
  )
}
