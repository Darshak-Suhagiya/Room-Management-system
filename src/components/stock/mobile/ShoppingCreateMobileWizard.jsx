import { ArrowLeft, ArrowRight } from 'lucide-react'
import { MobileActionBar } from '../../ui/MobileActionBar'

export function ShoppingCreateMobileWizard({
  groups,
  selectedGroups,
  previewLoading,
  onToggleGroup,
  onContinue,
  onCancel,
}) {
  return (
    <div className="admin-mobile-shop-wizard mobile-section-gap">
      <div className="shopping-preview-steps shopping-preview-steps-sticky" aria-label="Progress">
        <span className="shopping-step is-active">1. Groups</span>
        <span className="shopping-step">2. Review</span>
        <span className="shopping-step">3. Create</span>
      </div>

      <section className="rail-card admin-mobile-shop-wizard-card">
        <h3 className="rail-card-title">New shopping ticket</h3>
        <p className="muted stock-panel-lead">
          Choose stock groups to shop for. Next you’ll review and edit amounts.
        </p>
        <div className="field-stack">
          <span className="field-stack-label">Groups</span>
          <div className="push-user-picker">
            {groups.map((g) => (
              <label key={g.id} className="checkbox-chip">
                <input
                  type="checkbox"
                  checked={selectedGroups.includes(g.id)}
                  onChange={() => onToggleGroup(g.id)}
                />
                <span>{g.name}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <MobileActionBar open>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          <ArrowLeft size={16} aria-hidden /> Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={previewLoading || selectedGroups.length === 0}
          onClick={onContinue}
        >
          <ArrowRight size={16} aria-hidden />
          {previewLoading ? 'Loading…' : 'Continue'}
        </button>
      </MobileActionBar>
    </div>
  )
}
