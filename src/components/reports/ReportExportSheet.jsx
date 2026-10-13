import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { REPORT_PDF_LAYOUT } from '../../config/constants'

const LAYOUT_OPTIONS = [
  { id: REPORT_PDF_LAYOUT.EVENT, label: 'Event wise' },
  { id: REPORT_PDF_LAYOUT.PERSON, label: 'Person wise' },
]

export function ReportExportSheet({
  open,
  onClose,
  initialFrom,
  initialTo,
  initialScope = 'self',
  canViewOthers = false,
  exporting,
  onExport,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export PDF"
      subtitle={
        initialScope === 'all'
          ? "Everyone's records"
          : 'Your answers and the person notes you wrote'
      }
      busy={exporting}
      artKey="reports"
      className="reports-sheet"
    >
      {open ? (
        <ExportFields
          key={`${initialFrom}-${initialTo}-${initialScope}`}
          initialFrom={initialFrom}
          initialTo={initialTo}
          initialScope={initialScope}
          canViewOthers={canViewOthers}
          exporting={exporting}
          onClose={onClose}
          onExport={onExport}
        />
      ) : null}
    </Modal>
  )
}

function ExportFields({
  initialFrom,
  initialTo,
  initialScope,
  canViewOthers,
  exporting,
  onClose,
  onExport,
}) {
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [scope, setScope] = useState(initialScope === 'all' ? 'all' : 'self')
  const [layout, setLayout] = useState(
    initialScope === 'all' ? REPORT_PDF_LAYOUT.PERSON : REPORT_PDF_LAYOUT.EVENT,
  )
  const [formError, setFormError] = useState('')

  const chooseScope = (next) => {
    setScope(next)
    setLayout(next === 'all' ? REPORT_PDF_LAYOUT.PERSON : REPORT_PDF_LAYOUT.EVENT)
    setFormError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    try {
      await onExport(from, to, layout, scope)
    } catch (err) {
      setFormError(err.message || 'Could not export the report.')
    }
  }

  const subtitle = scope === 'all'
    ? "Everyone's records"
    : 'Your answers and the person notes you wrote'

  return (
    <form className="reports-form" onSubmit={submit}>
      {formError ? <p className="form-error">{formError}</p> : null}
      <p className="muted">{subtitle}</p>
      {canViewOthers ? (
        <div className="mobile-segmented" role="group" aria-label="Whose records">
          <button
            type="button"
            className={`mobile-segmented-btn${scope === 'self' ? ' is-active' : ''}`}
            aria-pressed={scope === 'self'}
            onClick={() => chooseScope('self')}
          >
            Mine
          </button>
          <button
            type="button"
            className={`mobile-segmented-btn${scope === 'all' ? ' is-active' : ''}`}
            aria-pressed={scope === 'all'}
            onClick={() => chooseScope('all')}
          >
            Everyone
          </button>
        </div>
      ) : null}
      <div className="field-stack">
        <span className="field-stack-label">Layout</span>
        <div className="reports-status" role="radiogroup" aria-label="PDF layout">
          {LAYOUT_OPTIONS.map((option) => {
            const active = layout === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`reports-status-btn${active ? ' is-active' : ''}`}
                onClick={() => {
                  setLayout(option.id)
                  setFormError('')
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
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
