import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { MobileActionBar } from '../ui/MobileActionBar'
import { StockQtySlider } from './StockQtySlider'
import { STOCK_UNIT_LABELS } from '../../config/constants'
import { formatStockQty } from '../../services/stockService'
import { makeShoppingLineFromItem } from '../../services/shoppingService'

function MetaChips({ line, groupName }) {
  const unitLabel = STOCK_UNIT_LABELS[line.unit] || line.unit
  return (
    <div className="shopping-meta-chips" aria-label="Line details">
      {groupName && (
        <span className="shopping-meta-chip is-group">{groupName}</span>
      )}
      <span className="shopping-meta-chip">
        In stock {formatStockQty(line.currentQty, line.unit)} {unitLabel}
      </span>
      <span className="shopping-meta-chip">
        Need {formatStockQty(line.needPerIteration, line.unit)}
      </span>
      <span className="shopping-meta-chip is-suggest">
        Suggest {formatStockQty(line.suggestedQty, line.unit)}
      </span>
    </div>
  )
}

function PreviewLineRow({ line, groupName, onQtyChange, onRemove, mobile = false }) {
  return (
    <li className="shopping-preview-line">
      <div className="shopping-preview-line-head">
        <div>
          <strong>{line.name}</strong>
          <MetaChips line={line} groupName={groupName} />
        </div>
        <button
          type="button"
          className="btn btn-sm btn-ghost shopping-preview-remove"
          onClick={() => onRemove(line.itemId)}
          aria-label={`Remove ${line.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <StockQtySlider
        variant={mobile ? 'mobile' : 'desktop'}
        value={line.qty}
        onChange={(v) => onQtyChange(line.itemId, v)}
        needPerIteration={line.needPerIteration}
        unit={line.unit}
        label="Buy amount"
      />
    </li>
  )
}

/**
 * Step 2: review deficit lines, edit qty, add/remove items, then confirm create.
 */
export function ShoppingTicketPreview({
  groups,
  groupIds,
  initialLines,
  availableItems,
  onBack,
  onCreate,
  creating,
  mobile = false,
}) {
  const [lines, setLines] = useState(initialLines)
  const [showAddPicker, setShowAddPicker] = useState(false)

  const groupNameById = useMemo(() => {
    const map = {}
    for (const g of groups) map[g.id] = g.name
    return map
  }, [groups])

  const selectedIds = useMemo(
    () => new Set(lines.map((l) => l.itemId)),
    [lines],
  )

  const addableItems = useMemo(
    () => availableItems.filter((i) => !selectedIds.has(i.id)),
    [availableItems, selectedIds],
  )

  const groupLabels = groupIds
    .map((id) => groupNameById[id] || id)
    .join(', ')

  const totalQty = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)

  const setLineQty = (itemId, qty) => {
    setLines((prev) =>
      prev.map((l) =>
        l.itemId === itemId ? { ...l, qty: Math.max(0, Number(qty) || 0) } : l,
      ),
    )
  }

  const removeLine = (itemId) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId))
  }

  const addItem = (item) => {
    setLines((prev) => [...prev, makeShoppingLineFromItem(item)])
    setShowAddPicker(false)
  }

  const handleCreate = () => {
    onCreate(lines.filter((l) => (Number(l.qty) || 0) > 0))
  }

  return (
    <div className="shopping-preview">
      <div
        className={`shopping-preview-steps${mobile ? ' shopping-preview-steps-sticky' : ''}`}
        aria-label="Progress"
      >
        <span className="shopping-step is-done">1. Groups</span>
        <span className="shopping-step is-active">2. Review</span>
        <span className="shopping-step">3. Create</span>
      </div>

      <section className="rail-card shopping-preview-card">
        <header className="shopping-preview-header">
          <div>
            <h3 className="rail-card-title">
              <ShoppingCart size={18} aria-hidden /> Review shopping list
            </h3>
            <p className="muted stock-panel-lead">
              <strong>{groupLabels || '—'}</strong>
              {' · '}
              {lines.length} item{lines.length === 1 ? '' : 's'}
            </p>
          </div>
        </header>

        {lines.length === 0 ? (
          <div className="stock-empty-card">
            <p className="muted">
              No items on this ticket yet. Add items below or go back and pick
              other groups.
            </p>
          </div>
        ) : (
          <ul className="shopping-preview-lines">
            {lines.map((line) => (
              <PreviewLineRow
                key={line.itemId}
                line={line}
                groupName={groupNameById[line.groupId]}
                onQtyChange={setLineQty}
                onRemove={removeLine}
                mobile={mobile}
              />
            ))}
          </ul>
        )}

        <div className="shopping-preview-add">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowAddPicker((v) => !v)}
          >
            <Plus size={16} aria-hidden />
            {showAddPicker ? 'Hide items' : 'Add item from groups'}
          </button>
          {showAddPicker && (
            <div className="shopping-preview-picker">
              {addableItems.length === 0 ? (
                <p className="muted">All items from these groups are already listed.</p>
              ) : (
                <div className="push-user-picker">
                  {addableItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="checkbox-chip shopping-add-chip"
                      onClick={() => addItem(item)}
                    >
                      <Plus size={14} aria-hidden />
                      <span>
                        {item.name}
                        <small className="muted">
                          {' '}
                          ({groupNameById[item.groupId]})
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!mobile && (
          <footer className="shopping-preview-footer">
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              <ArrowLeft size={16} aria-hidden /> Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={creating || totalQty <= 0 || lines.length === 0}
              onClick={handleCreate}
            >
              <Check size={16} aria-hidden />
              {creating ? 'Creating…' : 'Create ticket'}
            </button>
          </footer>
        )}
      </section>

      {mobile && (
        <MobileActionBar open className="shopping-preview-mobile-bar">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden /> Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={creating || totalQty <= 0 || lines.length === 0}
            onClick={handleCreate}
          >
            <Check size={16} aria-hidden />
            {creating ? 'Creating…' : 'Create ticket'}
          </button>
        </MobileActionBar>
      )}
    </div>
  )
}
