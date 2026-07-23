import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import { createStockGroup } from '../../../services/stockService'
import { useToast } from '../../../contexts/ToastContext'
import { useSaveMutation } from '../../../hooks/useSaveMutation'

export function StockGroupSheet({ open, onClose, onCreated, userId }) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [name, setName] = useState('')
  const [linkToMenu, setLinkToMenu] = useState(true)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { ok, result, error, stale } = await run(() =>
      createStockGroup({ name, linkToMenu }, userId),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Group created')
    if (stale) return
    setName('')
    onCreated?.(result)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New stock group"
      subtitle="Organize pantry items"
      busy={busy}
    >
      <form className="admin-mobile-sheet-form mobile-section-gap" onSubmit={handleSubmit}>
        <label className="field-stack">
          <span className="field-stack-label">Name</span>
          <input
            className="app-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dairy"
            required
            disabled={busy}
          />
        </label>
        <label className="checkbox-inline">
          <input
            type="checkbox"
            checked={linkToMenu}
            disabled={busy}
            onChange={(e) => setLinkToMenu(e.target.checked)}
          />
          Related to menu planning
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating…' : 'Create group'}
        </button>
      </form>
    </Modal>
  )
}
