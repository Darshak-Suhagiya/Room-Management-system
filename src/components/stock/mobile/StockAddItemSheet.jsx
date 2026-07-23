import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import { STOCK_UNIT_LABELS, STOCK_UNITS } from '../../../config/constants'
import { createStockItem } from '../../../services/stockService'
import { useToast } from '../../../contexts/ToastContext'
import { useSaveMutation } from '../../../hooks/useSaveMutation'

export function StockAddItemSheet({ open, onClose, groupId, userId, onCreated }) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [name, setName] = useState('')
  const [unit, setUnit] = useState(STOCK_UNITS.KG)
  const [need, setNeed] = useState(5)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!groupId) return
    const { ok, result, error, stale } = await run(() =>
      createStockItem(
        {
          groupId,
          name,
          unit,
          needPerIteration: need,
          quantity: 0,
        },
        userId,
      ),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Item added')
    if (stale) return
    setName('')
    onCreated?.(result)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add stock item"
      subtitle="New item in this group"
      busy={busy}
    >
      <form className="admin-mobile-sheet-form mobile-section-gap" onSubmit={handleSubmit}>
        <label className="field-stack">
          <span className="field-stack-label">Name</span>
          <input
            className="app-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sugar"
            required
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
          <span className="field-stack-label">Need per week</span>
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
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Adding…' : 'Add item'}
        </button>
      </form>
    </Modal>
  )
}
