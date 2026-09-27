import { useState } from 'react'
import { Modal } from '../ui/Modal'

export function ReportExportSheet({
  open,
  onClose,
  initialFrom,
  initialTo,
  exporting,
  onExport,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export PDF"
      subtitle="Events and person notes from the dates you choose."
      busy={exporting}
      artKey="reports"
      className="reports-sheet"
    >
      {open ? (
        <ExportFields
          key={`${initialFrom}-${initialTo}`}
          initialFrom={initialFrom}
          initialTo={initialTo}
          exporting={exporting}
          onClose={onClose}
          onExport={onExport}
        />
      ) : null}
    </Modal>
  )
}

function ExportFields({ initialFrom, initialTo, exporting, onClose, onExport }) {
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [formError, setFormError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    try {
      await onExport(from, to)
    } catch (err) {
      setFormError(err.message || 'Could not export the report.')
    }
  }

  return (
    <form className="reports-form" onSubmit={submit}>
      {formError ? <p className="form-error">{formError}</p> : null}
      <label className="field-stack">
        <span className="field-stack-label">From</span>
        <input
          type="date"
          className="app-input"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value)
            setFormError('')
          }}
          required
        />
      </label>
      <label className="field-stack">
        <span className="field-stack-label">To</span>
        <input
          type="date"
          className="app-input"
          value={to}
          onChange={(event) => {
            setTo(event.target.value)
            setFormError('')
          }}
          required
        />
      </label>
      <div className="reports-card-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={exporting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={exporting}>
          {exporting ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>
    </form>
  )
}
