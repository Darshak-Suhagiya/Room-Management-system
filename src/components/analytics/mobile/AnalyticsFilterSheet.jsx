import { Modal } from '../../ui/Modal'
import {
  ANALYTICS_PRESET_OPTIONS,
} from '../../../hooks/useMenuAnalytics'
import { ANALYTICS_RANGE_PRESETS } from '../../../utils/menuReviewUtils'

export function AnalyticsFilterSheet({
  open,
  onClose,
  preset,
  onPresetChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filters"
      subtitle="Date range and category"
    >
      <div className="analytics-mobile-filter mobile-section-gap">
        <div>
          <p className="analytics-mobile-filter-label">Date range</p>
          <div className="analytics-preset-row" role="group" aria-label="Date range">
            {ANALYTICS_PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`btn btn-sm ${preset === opt.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onPresetChange(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {preset === ANALYTICS_RANGE_PRESETS.CUSTOM && (
          <div className="analytics-custom-dates">
            <label>
              From
              <input
                type="date"
                value={customFrom}
                onChange={(e) => onCustomFromChange(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={customTo}
                onChange={(e) => onCustomToChange(e.target.value)}
              />
            </label>
          </div>
        )}

        <label className="field-stack">
          <span className="field-stack-label">Category</span>
          <select
            className="app-input"
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
          >
            <option value="all">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.labelGu || c.labelEn || c.id}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  )
}
