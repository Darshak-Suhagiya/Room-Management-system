import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { StockQtySlider } from '../StockQtySlider'
import {
  STOCK_ITERATION_PERIODS,
  STOCK_UNIT_LABELS,
  STOCK_UNITS,
} from '../../../config/constants'
import {
  formatStockQty,
  setStockQuantity,
  stockSliderBounds,
  updateStockItem,
} from '../../../services/stockService'
import { useToast } from '../../../contexts/ToastContext'
import { useSaveMutation } from '../../../hooks/useSaveMutation'

function stockLevelClass(item, qty) {
  const need = Number(item.needPerIteration) || 0
  const q = Number(qty) || 0
  if (need <= 0) return 'is-ok'
  if (q < need * 0.5) return 'is-low'
  if (q < need) return 'is-mid'
  return 'is-ok'
}

function StockLevelBar({ item, qty }) {
  const { max } = stockSliderBounds(item.needPerIteration, item.unit)
  const pct = max > 0 ? Math.min(100, (Number(qty) / max) * 100) : 0
  const needPct =
    max > 0
      ? Math.min(100, ((Number(item.needPerIteration) || 0) / max) * 100)
      : 50
  const level = stockLevelClass(item, qty)

  return (
    <div className={`stock-level-bar ${level}`} role="img" aria-hidden>
      <div className="stock-level-bar-fill" style={{ width: `${pct}%` }} />
      <span className="stock-level-bar-need" style={{ left: `${needPct}%` }} />
    </div>
  )
}

function formatWhen(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function StockItemSheet({
  open,
  onClose,
  item,
  group,
  catalog,
  canEdit,
  userId,
  onUpdated,
  onDeleteRequest,
}) {
  const toast = useToast()
  const qtySave = useSaveMutation()
  const metaSave = useSaveMutation()
  const [qty, setQty] = useState(0)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState(STOCK_UNITS.KG)
  const [need, setNeed] = useState(0)
  const [period, setPeriod] = useState(STOCK_ITERATION_PERIODS.WEEK)
  const [menuItemIds, setMenuItemIds] = useState([])
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!item) return
    setQty(item.quantity)
    setName(item.name)
    setUnit(item.unit)
    setNeed(item.needPerIteration)
    setPeriod(item.iterationPeriod)
    setMenuItemIds(item.menuItemIds || [])
    setShowSettings(false)
  }, [item])

  if (!item) return null

  const busy = qtySave.busy || metaSave.busy
  const qtyDirty = Number(qty) !== Number(item.quantity)
  const catalogItems = catalog?.items ?? []
  const unitLabel = STOCK_UNIT_LABELS[item.unit] || item.unit
  const lastFilled = formatWhen(item.lastFilledAt)
  const lastUsed = formatWhen(item.lastUsedAt)

  const saveQty = async () => {
    if (!canEdit) return
    const itemId = item.id
    const { ok, result, error, stale } = await qtySave.run(() =>
      setStockQuantity(itemId, qty, { userId }),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Stock updated')
    onUpdated?.(result)
    if (stale) return
  }

  const saveMeta = async () => {
    if (!canEdit) return
    const itemId = item.id
    const { ok, result, error, stale } = await metaSave.run(() =>
      updateStockItem(itemId, {
        name,
        unit,
        needPerIteration: need,
        iterationPeriod: period,
        menuItemIds: group?.linkToMenu ? menuItemIds : [],
      }),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Item saved')
    onUpdated?.(result)
    if (stale) return
    setShowSettings(false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item.name}
      subtitle="Stock quantity & settings"
      busy={metaSave.busy}
    >
      <div className="admin-mobile-stock-sheet mobile-section-gap">
        <div className="admin-mobile-stock-qty-display">
          <strong>{formatStockQty(canEdit ? qty : item.quantity, item.unit)}</strong>
          <span className="muted">{unitLabel}</span>
        </div>

        <StockLevelBar item={item} qty={canEdit ? qty : item.quantity} />

        {canEdit ? (
          <StockQtySlider
            variant="mobile"
            label="Adjust stock"
            value={qty}
            onChange={setQty}
            needPerIteration={item.needPerIteration}
            unit={item.unit}
            disabled={busy}
          />
        ) : null}

        <dl className="admin-mobile-stock-meta">
          <div>
            <dt>Need</dt>
            <dd>
              {formatStockQty(item.needPerIteration, item.unit)} {unitLabel} /{' '}
              {item.iterationPeriod}
            </dd>
          </div>
          {lastFilled && (
            <div>
              <dt>Last filled</dt>
              <dd>{lastFilled}</dd>
            </div>
          )}
          {lastUsed && (
            <div>
              <dt>Last used</dt>
              <dd>{lastUsed}</dd>
            </div>
          )}
        </dl>

        {canEdit && (
          <>
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={busy || !qtyDirty}
              onClick={saveQty}
            >
              {qtySave.busy ? 'Saving…' : 'Save quantity'}
            </button>

            <details
              className="admin-mobile-stock-more"
              open={showSettings}
              onToggle={(e) => setShowSettings(e.currentTarget.open)}
            >
              <summary>More — settings &amp; delete</summary>
              <div className="admin-mobile-stock-settings">
                <label className="field-stack">
                  <span className="field-stack-label">Name</span>
                  <input
                    className="app-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label className="field-stack">
                  <span className="field-stack-label">Unit</span>
                  <select
                    className="app-input"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    disabled={busy}
                  >
                    {Object.values(STOCK_UNITS).map((u) => (
                      <option key={u} value={u}>
                        {STOCK_UNIT_LABELS[u]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack">
                  <span className="field-stack-label">Iteration</span>
                  <select
                    className="app-input"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    disabled={busy}
                  >
                    <option value={STOCK_ITERATION_PERIODS.WEEK}>Week</option>
                    <option value={STOCK_ITERATION_PERIODS.MONTH}>Month</option>
                  </select>
                </label>
                <label className="field-stack">
                  <span className="field-stack-label">Need per {period}</span>
                  <input
                    className="app-input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={need}
                    onChange={(e) => setNeed(Number(e.target.value) || 0)}
                    disabled={busy}
                  />
                </label>
                {group?.linkToMenu && catalogItems.length > 0 && (
                  <div className="field-stack">
                    <span className="field-stack-label">Linked menu items</span>
                    <div className="push-user-picker">
                      {catalogItems.map((ci) => (
                        <label key={ci.id} className="checkbox-chip">
                          <input
                            type="checkbox"
                            checked={menuItemIds.includes(ci.id)}
                            disabled={busy}
                            onChange={() =>
                              setMenuItemIds((prev) =>
                                prev.includes(ci.id)
                                  ? prev.filter((id) => id !== ci.id)
                                  : [...prev, ci.id],
                              )
                            }
                          />
                          <span>{ci.gu}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={busy}
                  onClick={saveMeta}
                >
                  {metaSave.busy ? 'Saving…' : 'Save settings'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-block admin-mobile-danger-btn"
                  disabled={busy}
                  onClick={() => onDeleteRequest?.(item)}
                >
                  <Trash2 size={16} aria-hidden /> Delete item
                </button>
              </div>
            </details>
          </>
        )}
      </div>
    </Modal>
  )
}
